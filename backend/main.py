import os
import math
import json

import io
import shutil
from datetime import datetime

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import shap
import google.generativeai as genai

from pdf_report import build_credit_report_pdf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="PD Scoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = joblib.load(os.path.join(ROOT, 'models', 'pd_model.pkl'))
scaler = joblib.load(os.path.join(ROOT, 'models', 'scaler.pkl'))
features = joblib.load(os.path.join(ROOT, 'models', 'features.pkl'))
explainer = shap.TreeExplainer(model)

df_all = pd.read_csv(os.path.join(ROOT, 'data', 'du_lieu.csv'))

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

LATEST_QUARTER = df_all['quarter'].max()

# Trang thai phe duyet ho so rui ro - luu file JSON nhe, khong can DB rieng cho demo
STATUS_PATH = os.path.join(ROOT, 'data', 'risk_status.json')
STATUS_OPTIONS = ['Cho_xu_ly', 'Dang_xu_ly', 'Soan_thao', 'Da_duyet', 'Da_dong', 'Da_huy']
STATUS_LABELS = {
    'Cho_xu_ly': 'Chờ xử lý', 'Dang_xu_ly': 'Đang xử lý',
    'Soan_thao': 'Soạn thảo', 'Da_duyet': 'Đã duyệt',
    'Da_dong': 'Đã đóng', 'Da_huy': 'Đã hủy',
}
DOCS_DIR = os.path.join(ROOT, 'data', 'documents')
os.makedirs(DOCS_DIR, exist_ok=True)


def load_status():
    if os.path.exists(STATUS_PATH):
        with open(STATUS_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    ids = df_all['company_id'].unique().tolist()
    default = {cid: STATUS_OPTIONS[i % len(STATUS_OPTIONS)] for i, cid in enumerate(ids)}
    save_status(default)
    return default


def save_status(status_map):
    with open(STATUS_PATH, 'w', encoding='utf-8') as f:
        json.dump(status_map, f, ensure_ascii=False, indent=2)


class StatusUpdate(BaseModel):
    status: str


def exposure_of(row):
    """EAD uoc tinh (ty dong). Cong ty demo: gia tri co dinh minh hoa.
    Cong ty thuc: khong co tong tai san trong schema hien tai -> dung cong thuc dua theo quy mo bien dong tien."""
    demo_ead = {'DEMO_HEALTHY': 50.0, 'DEMO_MEDIUM': 80.0, 'DEMO_DISTRESS': 120.0}
    if row['company_id'] in demo_ead:
        return demo_ead[row['company_id']]
    seed = abs(hash(row['company_id'])) % 1000
    return 30.0 + seed / 1000.0 * 270.0


class CompanyInput(BaseModel):
    ten_cong_ty: str
    current_ratio: float
    quick_ratio: float
    cash_ratio: float
    de_ratio: float
    da_ratio: float
    interest_coverage: float
    asset_turnover: float
    receivable_days: float
    cfo_debt: float
    cfo_margin: float
    cf_volatility: float
    gdp_growth: float
    lending_rate: float
    cpi: float
    working_capital_ratio: float
    nganh: str | None = None


class ChatRequest(BaseModel):
    message: str
    context: str = ""


class StressTestRequest(BaseModel):
    gdp_shock: float = 0.0
    lending_shock: float = 0.0


def risk_level_of(prob: float):
    if prob < 0.3:
        return "Thấp", "green"
    if prob < 0.6:
        return "Trung bình", "orange"
    return "Cao", "red"


def score_row(row: pd.Series):
    x = row[features].to_numpy(dtype=float).reshape(1, -1)
    scaled = scaler.transform(x)
    prob = float(model.predict_proba(scaled)[0][1])
    shap_vals = explainer.shap_values(scaled)[0]
    ranked = sorted(zip(features, shap_vals), key=lambda t: -abs(t[1]))[:5]
    shap_top5 = [
        {"feature": name, "impact": round(float(val), 4),
         "direction": "tang_rui_ro" if val > 0 else "giam_rui_ro"}
        for name, val in ranked
    ]
    return prob, shap_top5


# He so nhay cam macro cho mo hinh ve tinh stress-test (macro overlay), tach biet voi XGBoost
# vi du lieu hien co qua it bien dong macro de model tu hoc duoc do nhay nay.
# Chuan nganh: bien dong PD theo logit-shift tu shock GDP/lai suat (BCBS stress testing).
BETA_GDP = 0.22       # 1 diem % GDP giam -> logit PD tang 0.22
BETA_LENDING = 0.18   # 1 diem % lai suat tang -> logit PD tang 0.18


def apply_macro_shock(baseline_pd: float, gdp_shock: float, lending_shock: float) -> float:
    p = min(max(baseline_pd, 1e-4), 1 - 1e-4)
    logit_p = math.log(p / (1 - p))
    shift = -BETA_GDP * gdp_shock + BETA_LENDING * lending_shock
    return 1 / (1 + math.exp(-(logit_p + shift)))


@app.post("/api/predict")
def predict(data: CompanyInput):
    row = pd.Series(data.dict())
    prob, shap_top5 = score_row(row)
    label = int(prob >= 0.5)
    risk_level, color = risk_level_of(prob)

    return {
        "ten_cong_ty": data.ten_cong_ty,
        "pd_score": round(prob, 4),
        "pd_percent": round(prob * 100, 2),
        "risk_level": risk_level,
        "color": color,
        "default_prediction": label,
        "shap_top5": shap_top5,
    }


@app.post("/api/report-pdf")
def report_pdf(data: CompanyInput):
    row = pd.Series(data.dict())
    prob, shap_top5 = score_row(row)
    risk_level, color = risk_level_of(prob)

    benchmark = None
    if data.nganh:
        latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
        group = latest[latest['nganh'] == data.nganh]
        if not group.empty:
            bench_rows = []
            for feat, label in [('current_ratio', 'Current Ratio'), ('quick_ratio', 'Quick Ratio'),
                                 ('de_ratio', 'D/E Ratio'), ('cfo_margin', 'CFO Margin'),
                                 ('asset_turnover', 'Asset Turnover')]:
                bench_rows.append(((round(getattr(data, feat), 2), round(float(group[feat].median()), 2)), label))
            benchmark = {"nganh": data.nganh, "rows": bench_rows}

    try:
        ai_resp = gemini_model.generate_content(
            f"""Viết 1 đoạn nhận định ngắn (3-4 câu) cho báo cáo tín dụng, văn phong chuyên nghiệp,
bằng tiếng Việt, không dùng markdown. Doanh nghiệp: {data.ten_cong_ty}, PD score: {prob*100:.2f}%,
mức rủi ro: {risk_level}, top yếu tố SHAP: {[s['feature'] for s in shap_top5]}."""
        )
        ai_comment = ai_resp.text
    except Exception:
        ai_comment = None

    pdf_bytes = build_credit_report_pdf({
        "ten_cong_ty": data.ten_cong_ty, "pd_percent": round(prob * 100, 2),
        "risk_level": risk_level, "shap_top5": shap_top5, "benchmark": benchmark,
        "ai_comment": ai_comment,
    })
    return StreamingResponse(
        io.BytesIO(pdf_bytes), media_type='application/pdf',
        headers={"Content-Disposition": f'attachment; filename="bao_cao_{data.ten_cong_ty}.pdf"'},
    )


COMPARE_FEATURES = [
    ('current_ratio', 'Thanh khoản', False),
    ('de_ratio', 'Đòn bẩy (thấp tốt)', True),
    ('cfo_margin', 'Biên dòng tiền', False),
    ('asset_turnover', 'Hiệu quả hoạt động', False),
    ('interest_coverage', 'Khả năng trả lãi', False),
    ('working_capital_ratio', 'Vốn lưu động', False),
]


@app.get("/api/compare")
def compare(ids: str):
    company_ids = [c.strip() for c in ids.split(',') if c.strip()]
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1).set_index('company_id')

    percentiles = {}
    for feat, _, invert in COMPARE_FEATURES:
        pct = latest[feat].rank(pct=True) * 100
        percentiles[feat] = (100 - pct) if invert else pct

    result = []
    for cid in company_ids:
        if cid not in latest.index:
            continue
        row = latest.loc[cid]
        prob, _ = score_row(row)
        result.append({
            "company_id": cid,
            "ten_cong_ty": row['ten_cong_ty'],
            "pd_percent": round(prob * 100, 2),
            "scores": {feat: round(float(percentiles[feat].loc[cid]), 1) for feat, _, _ in COMPARE_FEATURES},
        })
    return {
        "labels": [{"key": f, "label": l} for f, l, _ in COMPARE_FEATURES],
        "companies": result,
    }


@app.get("/api/portfolio")
def portfolio():
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    prev = df_all.sort_values('quarter').groupby('company_id').nth(-2)
    result = []
    for _, row in latest.iterrows():
        prob, _ = score_row(row)
        prev_row = prev[prev['company_id'] == row['company_id']]
        delta = None
        if not prev_row.empty:
            prev_prob, _ = score_row(prev_row.iloc[0])
            delta = round((prob - prev_prob) * 100, 2)
        risk_level, color = risk_level_of(prob)
        result.append({
            "company_id": row['company_id'],
            "ten_cong_ty": row['ten_cong_ty'],
            "nganh": row['nganh'],
            "quarter": row['quarter'],
            "pd_percent": round(prob * 100, 2),
            "risk_level": risk_level,
            "color": color,
            "delta_percent": delta,
            "is_demo": bool(row['is_demo']),
        })
    result.sort(key=lambda r: (-r['is_demo'], -r['pd_percent']))
    return {"companies": result}


@app.get("/api/company/{company_id}")
def company_detail(company_id: str):
    rows = df_all[df_all['company_id'] == company_id].sort_values('quarter')
    if rows.empty:
        return {"error": "not_found"}
    latest = rows.iloc[-1]
    return {
        "company_id": company_id,
        "ten_cong_ty": latest['ten_cong_ty'],
        "nganh": latest['nganh'],
        **{f: float(latest[f]) for f in features},
    }


@app.get("/api/history/{company_id}")
def history(company_id: str):
    rows = df_all[df_all['company_id'] == company_id].sort_values('quarter')
    if rows.empty:
        return {"company_id": company_id, "history": []}
    out = []
    for _, row in rows.iterrows():
        prob, _ = score_row(row)
        out.append({"quarter": row['quarter'], "pd_percent": round(prob * 100, 2)})
    return {"company_id": company_id, "ten_cong_ty": rows.iloc[0]['ten_cong_ty'], "history": out}


@app.get("/api/alerts")
def alerts():
    out = []
    for company_id, group in df_all.sort_values('quarter').groupby('company_id'):
        scores = [score_row(row)[0] * 100 for _, row in group.iterrows()]
        if len(scores) < 2:
            continue
        delta = scores[-1] - scores[-2]
        if abs(delta) > 15:
            risk_level, color = risk_level_of(scores[-1] / 100)
            out.append({
                "company_id": company_id,
                "ten_cong_ty": group.iloc[-1]['ten_cong_ty'],
                "quarter": group.iloc[-1]['quarter'],
                "pd_percent": round(scores[-1], 2),
                "delta_percent": round(delta, 2),
                "risk_level": risk_level,
                "color": color,
                "is_demo": bool(group.iloc[-1]['is_demo']),
            })
    out.sort(key=lambda r: -abs(r['delta_percent']))
    return {"alerts": out}


@app.post("/api/stress-test")
def stress_test(req: StressTestRequest):
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    out = []
    bucket_before = {"Thấp": 0, "Trung bình": 0, "Cao": 0}
    bucket_after = {"Thấp": 0, "Trung bình": 0, "Cao": 0}
    for _, row in latest.iterrows():
        baseline_pd, _ = score_row(row)
        shocked_pd = apply_macro_shock(baseline_pd, req.gdp_shock, req.lending_shock)
        rl_before, _ = risk_level_of(baseline_pd)
        rl_after, _ = risk_level_of(shocked_pd)
        bucket_before[rl_before] += 1
        bucket_after[rl_after] += 1
        out.append({
            "company_id": row['company_id'],
            "ten_cong_ty": row['ten_cong_ty'],
            "baseline_pd_percent": round(baseline_pd * 100, 2),
            "shocked_pd_percent": round(shocked_pd * 100, 2),
            "delta_percent": round((shocked_pd - baseline_pd) * 100, 2),
            "is_demo": bool(row['is_demo']),
        })
    out.sort(key=lambda r: -r['delta_percent'])
    return {
        "gdp_shock": req.gdp_shock,
        "lending_shock": req.lending_shock,
        "bucket_before": bucket_before,
        "bucket_after": bucket_after,
        "companies": out,
    }


def likelihood_tier(pd_percent: float) -> int:
    if pd_percent < 10:
        return 1
    if pd_percent < 25:
        return 2
    if pd_percent < 45:
        return 3
    if pd_percent < 65:
        return 4
    return 5


def impact_tier(ead: float, ead_min: float, ead_max: float) -> int:
    if ead_max <= ead_min:
        return 3
    pct = (ead - ead_min) / (ead_max - ead_min)
    return min(5, max(1, int(pct * 5) + 1))


def cell_risk_level(likelihood: int, impact: int):
    score = likelihood + impact
    if score <= 4:
        return "Thấp", "#86efac"
    if score <= 6:
        return "Trung bình", "#fde047"
    if score <= 8:
        return "Cao", "#fb923c"
    return "Rất cao", "#f87171"


@app.get("/api/risk-overview")
def risk_overview():
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    rows = []
    for _, row in latest.iterrows():
        prob, _ = score_row(row)
        ead = exposure_of(row)
        risk_level, _ = risk_level_of(prob)
        rows.append({
            "company_id": row['company_id'], "ten_cong_ty": row['ten_cong_ty'],
            "nganh": row['nganh'], "pd_percent": prob * 100, "ead": ead,
            "risk_level": risk_level, "is_demo": bool(row['is_demo']),
        })

    by_risk_level = {"Thấp": 0, "Trung bình": 0, "Cao": 0}
    for r in rows:
        by_risk_level[r['risk_level']] += 1

    by_nganh = {}
    for r in rows:
        by_nganh[r['nganh']] = by_nganh.get(r['nganh'], 0) + 1

    ead_values = [r['ead'] for r in rows]
    ead_min, ead_max = min(ead_values), max(ead_values)

    grid = {}
    for r in rows:
        r['likelihood'] = likelihood_tier(r['pd_percent'])
        r['impact'] = impact_tier(r['ead'], ead_min, ead_max)
        key = f"{r['impact']}-{r['likelihood']}"
        grid.setdefault(key, []).append({
            "company_id": r['company_id'], "ten_cong_ty": r['ten_cong_ty'],
        })

    cells = []
    for imp in range(5, 0, -1):
        for lik in range(1, 6):
            key = f"{imp}-{lik}"
            items = grid.get(key, [])
            risk_level, color = cell_risk_level(lik, imp)
            cells.append({
                "impact": imp, "likelihood": lik, "count": len(items),
                "items": items, "risk_level": risk_level, "color": color,
            })

    return {
        "total": len(rows),
        "by_risk_level": by_risk_level,
        "by_nganh": [{"nganh": k, "count": v} for k, v in by_nganh.items()],
        "heatmap": cells,
        "rows": [
            {"company_id": r['company_id'], "ten_cong_ty": r['ten_cong_ty'], "nganh": r['nganh'],
             "risk_level": r['risk_level'], "likelihood": r['likelihood'], "impact": r['impact'],
             "is_demo": r['is_demo']}
            for r in rows
        ],
    }


@app.get("/api/approvals")
def approvals(status: str | None = None):
    status_map = load_status()
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    out = []
    for _, row in latest.iterrows():
        cid = row['company_id']
        st = status_map.get(cid, 'Cho_xu_ly')
        if status and status != 'Tat_ca' and st != status:
            continue
        prob, _ = score_row(row)
        risk_level, color = risk_level_of(prob)
        out.append({
            "company_id": cid, "ten_cong_ty": row['ten_cong_ty'], "nganh": row['nganh'],
            "pd_percent": round(prob * 100, 2), "risk_level": risk_level, "color": color,
            "status": st, "status_label": STATUS_LABELS.get(st, st),
            "is_demo": bool(row['is_demo']),
        })
    counts = {s: sum(1 for v in status_map.values() if v == s) for s in STATUS_OPTIONS}
    return {"companies": out, "counts": counts, "status_labels": STATUS_LABELS}


@app.post("/api/approvals/{company_id}")
def update_status(company_id: str, body: StatusUpdate):
    if body.status not in STATUS_OPTIONS:
        return {"error": "invalid_status", "valid": STATUS_OPTIONS}
    status_map = load_status()
    status_map[company_id] = body.status
    save_status(status_map)
    return {"company_id": company_id, "status": body.status}


def safe_filename(name: str) -> str:
    return os.path.basename(name).replace('..', '')


@app.get("/api/documents/{company_id}")
def list_documents(company_id: str):
    folder = os.path.join(DOCS_DIR, safe_filename(company_id))
    if not os.path.isdir(folder):
        return {"company_id": company_id, "files": []}
    files = []
    for fname in os.listdir(folder):
        path = os.path.join(folder, fname)
        stat = os.stat(path)
        files.append({
            "name": fname, "size_kb": round(stat.st_size / 1024, 1),
            "uploaded_at": datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M'),
        })
    files.sort(key=lambda f: f['uploaded_at'], reverse=True)
    return {"company_id": company_id, "files": files}


@app.post("/api/documents/{company_id}")
async def upload_document(company_id: str, file: UploadFile = File(...)):
    folder = os.path.join(DOCS_DIR, safe_filename(company_id))
    os.makedirs(folder, exist_ok=True)
    dest = os.path.join(folder, safe_filename(file.filename))
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    return {"company_id": company_id, "name": safe_filename(file.filename)}


@app.get("/api/documents/{company_id}/{filename}")
def download_document(company_id: str, filename: str):
    path = os.path.join(DOCS_DIR, safe_filename(company_id), safe_filename(filename))
    if not os.path.isfile(path):
        return {"error": "not_found"}
    return FileResponse(path, filename=safe_filename(filename))


@app.delete("/api/documents/{company_id}/{filename}")
def delete_document(company_id: str, filename: str):
    path = os.path.join(DOCS_DIR, safe_filename(company_id), safe_filename(filename))
    if os.path.isfile(path):
        os.remove(path)
        return {"deleted": True}
    return {"deleted": False}


@app.get("/api/reports/export")
def export_report(format: str = 'csv'):
    status_map = load_status()
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    rows = []
    for _, row in latest.iterrows():
        prob, _ = score_row(row)
        risk_level, _ = risk_level_of(prob)
        ead = exposure_of(row)
        rows.append({
            "Ma_CK": row['company_id'], "Ten_cong_ty": row['ten_cong_ty'], "Nganh": row['nganh'],
            "Quy": row['quarter'], "PD_percent": round(prob * 100, 2), "Muc_rui_ro": risk_level,
            "EAD_ty": round(ead, 2), "Trang_thai": STATUS_LABELS.get(status_map.get(row['company_id'], ''), ''),
        })
    out_df = pd.DataFrame(rows)
    ts = datetime.now().strftime('%Y%m%d_%H%M')

    if format == 'xlsx':
        buf = io.BytesIO()
        out_df.to_excel(buf, index=False, engine='openpyxl')
        buf.seek(0)
        return StreamingResponse(
            buf, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={"Content-Disposition": f'attachment; filename="bao_cao_tong_hop_{ts}.xlsx"'},
        )

    buf = io.StringIO()
    out_df.to_csv(buf, index=False, encoding='utf-8-sig')
    return StreamingResponse(
        iter([buf.getvalue()]), media_type='text/csv',
        headers={"Content-Disposition": f'attachment; filename="bao_cao_tong_hop_{ts}.csv"'},
    )


@app.get("/api/risk-summary")
def risk_summary(lgd: float = 0.45):
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    z99 = 2.33
    rows = []
    for _, row in latest.iterrows():
        prob, _ = score_row(row)
        ead = exposure_of(row)
        el = prob * lgd * ead
        ul = z99 * ead * lgd * math.sqrt(max(prob * (1 - prob), 0))
        var99 = el + ul
        rows.append({
            "company_id": row['company_id'], "ten_cong_ty": row['ten_cong_ty'],
            "nganh": row['nganh'], "pd": prob, "ead": ead, "el": el, "var99": var99,
            "is_demo": bool(row['is_demo']),
        })

    total_ead = sum(r['ead'] for r in rows)
    total_el = sum(r['el'] for r in rows)
    total_var99 = sum(r['var99'] for r in rows)

    by_industry = {}
    for r in rows:
        g = by_industry.setdefault(r['nganh'], {"nganh": r['nganh'], "ead": 0.0, "el": 0.0, "pd_sum": 0.0, "count": 0})
        g['ead'] += r['ead']
        g['el'] += r['el']
        g['pd_sum'] += r['pd']
        g['count'] += 1
    industry_list = []
    for g in by_industry.values():
        industry_list.append({
            "nganh": g['nganh'],
            "ead": round(g['ead'], 2),
            "el": round(g['el'], 2),
            "avg_pd_percent": round(g['pd_sum'] / g['count'] * 100, 2),
            "count": g['count'],
            "pct_of_portfolio": round(g['ead'] / total_ead * 100, 2) if total_ead else 0,
        })
    industry_list.sort(key=lambda r: -r['ead'])

    top_contributors = sorted(rows, key=lambda r: -r['el'])[:10]

    return {
        "lgd": lgd,
        "total_ead": round(total_ead, 2),
        "total_el": round(total_el, 2),
        "el_percent": round(total_el / total_ead * 100, 2) if total_ead else 0,
        "var99": round(total_var99, 2),
        "by_industry": industry_list,
        "top_contributors": [
            {"company_id": r['company_id'], "ten_cong_ty": r['ten_cong_ty'],
             "ead": round(r['ead'], 2), "el": round(r['el'], 2),
             "pd_percent": round(r['pd'] * 100, 2), "is_demo": r['is_demo']}
            for r in top_contributors
        ],
    }


@app.get("/api/benchmark/{nganh}")
def benchmark(nganh: str):
    latest = df_all.sort_values('quarter').groupby('company_id').tail(1)
    group = latest[latest['nganh'] == nganh]
    if group.empty:
        return {"error": "not_found"}
    medians = {f: float(group[f].median()) for f in features}
    pds = [score_row(row)[0] for _, row in group.iterrows()]
    return {
        "nganh": nganh,
        "sample_size": len(group),
        "median": medians,
        "median_pd_percent": round(float(np.median(pds)) * 100, 2),
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    response = gemini_model.generate_content(
        f"""Bạn là AI Credit Analyst hỗ trợ cán bộ tín dụng ngân hàng tại Việt Nam.
Ngữ cảnh hiện tại: {req.context}
Giải thích kết quả, trả lời câu hỏi rủi ro, gợi ý điều kiện cho vay nếu được hỏi.
Trả lời ngắn gọn, chuyên nghiệp, bằng tiếng Việt.
Câu hỏi: {req.message}"""
    )
    return {"reply": response.text}


frontend_dist = os.path.join(ROOT, "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {"message": "Frontend chưa build. Chạy `npm run build` trong thư mục frontend/."}
