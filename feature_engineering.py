"""
Tinh 15 features chuan tu du lieu BCTC tho (data/raw_vnstock.csv) + them 3 cong ty demo minh hoa.
Output: data/du_lieu.csv (dung chung cho prepare_data.py / main.py)
"""
import numpy as np
import pandas as pd

RAW_PATH = 'data/raw_vnstock.csv'
OUT_PATH = 'data/du_lieu.csv'

# Vi mo Viet Nam theo quy thuc te (GDP growth %, lending rate %, CPI %)
MACRO_BY_QUARTER = {
    '2024-Q2': (6.4, 9.3, 4.0), '2024-Q3': (7.4, 9.0, 4.1), '2024-Q4': (7.5, 8.8, 4.2),
    '2025-Q1': (6.9, 8.6, 4.0), '2025-Q2': (7.1, 8.7, 3.9), '2025-Q3': (7.6, 8.9, 4.1),
    '2025-Q4': (7.8, 9.1, 4.3), '2026-Q1': (7.5, 8.8, 4.0),
}

FEATURE_COLUMNS = [
    'current_ratio', 'quick_ratio', 'cash_ratio', 'de_ratio', 'da_ratio',
    'interest_coverage', 'asset_turnover', 'receivable_days', 'cfo_debt',
    'cfo_margin', 'cf_volatility', 'gdp_growth', 'lending_rate', 'cpi',
    'working_capital_ratio',
]


def safe_div(a, b):
    """Chia an toan: tranh loi chia cho 0 / NaN (theo cach lam cua feature_engineering.py mau)."""
    b = b.replace(0, np.nan) if hasattr(b, 'replace') else (np.nan if b == 0 else b)
    return a / b


def altman_z(row):
    """Tinh tren gia tri da lam muot (rolling 4-quy) neu co, de tranh 1 quy
    bien dong bat thuong lam doanh nghiep bi gan nham nhan rui ro cao."""
    def g(name):
        smooth_name = f'{name}_smooth'
        return row[smooth_name] if smooth_name in row.index and pd.notna(row[smooth_name]) else row[name]

    de_ratio = g('de_ratio')
    # de_ratio co the am (von chu so huu am o cong ty kiet que) -> tranh mau so gan 0
    de_denom = de_ratio + 0.1
    de_denom = de_denom if abs(de_denom) > 1.0 else (1.0 if de_denom >= 0 else -1.0)
    return (
        3.3 * g('cfo_margin') +
        1.0 * g('asset_turnover') +
        0.6 * (1 / de_denom) +
        1.4 * g('cfo_debt') +
        1.2 * (g('quick_ratio') / de_denom) +
        0.8 * g('working_capital_ratio') +
        0.15 * (row['gdp_growth'] - 7.0) -
        0.12 * (row['lending_rate'] - 9.0)
    )


def z_to_label(z, rng):
    if z < 1.1:
        return 1
    if z > 2.6:
        return 0
    p_distress = (2.6 - z) / (2.6 - 1.1)
    return int(rng.random() < p_distress)


CORE_RATIOS_FOR_LABEL = ['cfo_margin', 'de_ratio', 'asset_turnover', 'cfo_debt', 'quick_ratio', 'working_capital_ratio']


def build_real_companies():
    raw = pd.read_csv(RAW_PATH)
    raw = raw.sort_values(['ticker', 'quarter']).reset_index(drop=True)

    raw['current_ratio'] = safe_div(raw['tsnh'], raw['no_nh'])
    raw['quick_ratio'] = safe_div(raw['tsnh'] - raw['hang_ton_kho'], raw['no_nh'])
    raw['cash_ratio'] = safe_div(raw['tien'], raw['no_nh'])
    raw['de_ratio'] = safe_div(raw['no_phai_tra'], raw['vcsh'])
    raw['da_ratio'] = safe_div(raw['no_phai_tra'], raw['tong_ts'])
    ebit = raw['ebt'] + raw['lai_vay'].abs()
    # Khong vay -> chi phi lai vay = 0 -> coverage vo han, gan tran an toan thay vi NaN
    raw['interest_coverage'] = safe_div(ebit, raw['lai_vay'].abs()).fillna(50.0)
    raw['asset_turnover'] = safe_div(raw['doanh_thu'] * 4, raw['tong_ts'])
    raw['receivable_days'] = safe_div(raw['phai_thu_kh'], raw['doanh_thu']) * 90
    raw['cfo_debt'] = safe_div(raw['cfo'], raw['no_phai_tra'])
    raw['cfo_margin'] = safe_div(raw['cfo'], raw['doanh_thu'])
    raw['working_capital_ratio'] = safe_div(raw['tsnh'] - raw['no_nh'], raw['tong_ts'])

    cf_vol = raw.groupby('ticker')['cfo_margin'].std().rename('cf_volatility')
    raw = raw.merge(cf_vol, on='ticker', how='left')

    raw = raw.replace([np.inf, -np.inf], np.nan)

    # --- Median imputation (theo cach lam cua feature_engineering.py mau) ---
    # On dinh hon dien gia tri co dinh tuy tien: cac ty so tai chinh thuong lech
    # phan phoi va nhieu outlier (vd cong ty kiet que co de_ratio rat lon).
    impute_cols = FEATURE_COLUMNS + ['cf_volatility']
    for col in impute_cols:
        if col in raw.columns and raw[col].isna().any():
            raw[col] = raw[col].fillna(raw[col].median())

    # --- Rolling 4-quy mean cho cac ty so cot loi dung de tinh nhan ---
    # Y nghia: 1 quy bien dong manh (vd doanh thu thoi vu) khong nen lam doanh
    # nghiep vi bi gan nham nhan rui ro cao - lam muot truoc khi tinh Altman-Z.
    raw = raw.sort_values(['ticker', 'quarter']).reset_index(drop=True)
    grouped = raw.groupby('ticker')
    for col in CORE_RATIOS_FOR_LABEL:
        raw[f'{col}_smooth'] = grouped[col].transform(
            lambda s: s.rolling(window=4, min_periods=1).mean()
        )

    # Du lieu thuc co outlier (vd von chu so huu am o cong ty kiet que) -> clip ve khoang hop ly
    # de tranh lam vo cong thuc Altman-Z va lam meo scaler, nhung van giu duoc tin hieu rui ro.
    CLIP_BOUNDS = {
        'current_ratio': (0, 10), 'quick_ratio': (-2, 8), 'cash_ratio': (0, 5),
        'de_ratio': (-10, 20), 'da_ratio': (0, 1.5), 'interest_coverage': (-20, 50),
        'asset_turnover': (0, 5), 'receivable_days': (0, 365), 'cfo_debt': (-2, 2),
        'cfo_margin': (-2, 2), 'cf_volatility': (0, 2), 'working_capital_ratio': (-1.5, 1.5),
    }
    for col, (lo, hi) in CLIP_BOUNDS.items():
        raw[col] = raw[col].clip(lo, hi)
        if f'{col}_smooth' in raw.columns:
            raw[f'{col}_smooth'] = raw[f'{col}_smooth'].clip(lo, hi)

    raw['gdp_growth'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[0])
    raw['lending_rate'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[1])
    raw['cpi'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[2])

    raw['company_id'] = raw['ticker']
    raw['ten_cong_ty'] = raw['ticker']
    raw['is_demo'] = False

    smooth_cols = [f'{c}_smooth' for c in CORE_RATIOS_FOR_LABEL]
    keep = ['company_id', 'ten_cong_ty', 'nganh', 'quarter', 'is_demo'] + FEATURE_COLUMNS + smooth_cols
    df = raw[keep].copy()
    df = df.replace([np.inf, -np.inf], np.nan).dropna(subset=FEATURE_COLUMNS)
    return df


def make_demo_company(company_id, ten_cong_ty, nganh, series):
    quarters = list(MACRO_BY_QUARTER.keys())
    rows = []
    for i, q in enumerate(quarters):
        gdp, lending, cpi = MACRO_BY_QUARTER[q]
        row = {k: v[i] for k, v in series.items()}
        row.update({
            'company_id': company_id, 'ten_cong_ty': ten_cong_ty, 'nganh': nganh,
            'quarter': q, 'gdp_growth': gdp, 'lending_rate': lending, 'cpi': cpi,
            'is_demo': True,
        })
        rows.append(row)
    return pd.DataFrame(rows)


def build_demo_companies():
    healthy = make_demo_company('DEMO_HEALTHY', 'Cty Khoe Manh', 'San xuat', {
        'current_ratio':        [2.00, 2.02, 2.05, 2.03, 2.06, 2.08, 2.05, 2.07],
        'quick_ratio':           [1.80, 1.82, 1.85, 1.83, 1.86, 1.88, 1.85, 1.87],
        'cash_ratio':            [0.90, 0.91, 0.92, 0.91, 0.93, 0.94, 0.92, 0.93],
        'de_ratio':              [0.60, 0.58, 0.60, 0.59, 0.57, 0.58, 0.60, 0.59],
        'da_ratio':              [0.35, 0.34, 0.35, 0.34, 0.33, 0.34, 0.35, 0.34],
        'interest_coverage':     [8.0, 8.2, 8.5, 8.3, 8.6, 8.8, 8.5, 8.7],
        'asset_turnover':        [1.30, 1.31, 1.32, 1.31, 1.33, 1.34, 1.32, 1.33],
        'receivable_days':       [35.0, 34.0, 35.0, 34.0, 33.0, 34.0, 35.0, 34.0],
        'cfo_debt':              [0.50, 0.51, 0.52, 0.51, 0.53, 0.54, 0.52, 0.53],
        'cfo_margin':            [0.15, 0.16, 0.15, 0.16, 0.17, 0.16, 0.15, 0.16],
        'cf_volatility':         [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
        'working_capital_ratio': [0.35, 0.35, 0.36, 0.35, 0.36, 0.37, 0.35, 0.36],
    })
    medium = make_demo_company('DEMO_MEDIUM', 'Cty Rui Ro Trung Binh', 'Thuong mai', {
        'current_ratio':        [1.55, 1.52, 1.47, 1.42, 1.36, 1.30, 1.27, 1.23],
        'quick_ratio':           [1.35, 1.30, 1.22, 1.15, 1.07, 1.00, 0.95, 0.90],
        'cash_ratio':            [0.52, 0.50, 0.47, 0.45, 0.42, 0.40, 0.38, 0.36],
        'de_ratio':              [1.30, 1.45, 1.60, 1.75, 1.90, 2.05, 2.15, 2.25],
        'da_ratio':              [0.42, 0.43, 0.45, 0.46, 0.48, 0.49, 0.51, 0.52],
        'interest_coverage':     [4.5, 4.1, 3.7, 3.3, 2.9, 2.5, 2.2, 2.0],
        'asset_turnover':        [1.05, 1.02, 0.98, 0.94, 0.90, 0.86, 0.83, 0.80],
        'receivable_days':       [38.0, 42.0, 46.0, 50.0, 54.0, 58.0, 61.0, 64.0],
        'cfo_debt':              [0.28, 0.25, 0.22, 0.19, 0.16, 0.13, 0.11, 0.09],
        'cfo_margin':            [0.09, 0.08, 0.07, 0.065, 0.06, 0.055, 0.05, 0.045],
        'cf_volatility':         [0.07, 0.08, 0.085, 0.09, 0.10, 0.105, 0.11, 0.115],
        'working_capital_ratio': [0.28, 0.26, 0.24, 0.22, 0.205, 0.19, 0.18, 0.17],
    })
    distress = make_demo_company('DEMO_DISTRESS', 'Cty Dang Kiet Suc', 'Bat dong san', {
        'current_ratio':        [1.60, 1.55, 1.52, 1.48, 1.42, 1.35, 1.20, 0.55],
        'quick_ratio':           [1.30, 1.25, 1.20, 1.15, 1.05, 0.95, 0.75, 0.30],
        'cash_ratio':            [0.45, 0.43, 0.41, 0.39, 0.36, 0.32, 0.25, 0.08],
        'de_ratio':              [1.20, 1.30, 1.40, 1.50, 1.60, 1.75, 1.95, 4.50],
        'da_ratio':              [0.40, 0.42, 0.44, 0.45, 0.47, 0.49, 0.52, 0.80],
        'interest_coverage':     [5.0, 4.5, 4.0, 3.5, 3.0, 2.3, 1.5, -2.5],
        'asset_turnover':        [1.10, 1.05, 1.02, 0.98, 0.92, 0.85, 0.75, 0.30],
        'receivable_days':       [40.0, 45.0, 48.0, 52.0, 57.0, 63.0, 72.0, 130.0],
        'cfo_debt':              [0.30, 0.27, 0.24, 0.21, 0.17, 0.12, 0.06, -0.45],
        'cfo_margin':            [0.10, 0.09, 0.08, 0.07, 0.05, 0.02, -0.02, -0.18],
        'cf_volatility':         [0.08, 0.09, 0.10, 0.11, 0.13, 0.16, 0.20, 0.32],
        'working_capital_ratio': [0.30, 0.27, 0.25, 0.22, 0.18, 0.14, 0.09, 0.00],
    })
    return pd.concat([healthy, medium, distress], ignore_index=True)


def main():
    rng = np.random.RandomState(42)
    real_df = build_real_companies()
    demo_df = build_demo_companies()

    df = pd.concat([real_df, demo_df], ignore_index=True)
    df['z_score'] = df.apply(altman_z, axis=1)
    df['default_label'] = df['z_score'].apply(lambda z: z_to_label(z, rng))
    df['pd_score'] = (1 / (1 + np.exp(df['z_score'] - 1.85))).round(4)

    df.to_csv(OUT_PATH, index=False)
    print(f"Tao xong {OUT_PATH}: {df['company_id'].nunique()} doanh nghiep, {len(df)} dong")
    print(f"So dong rui ro (default_label=1): {df['default_label'].sum()}")
    print(df.groupby('is_demo').size())


if __name__ == '__main__':
    main()
