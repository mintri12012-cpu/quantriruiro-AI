"""
Tinh 14 features chuan tu du lieu BCTC thuc te co nhan thuc (data/raw_bctc_quarterly.csv)
+ them 3 cong ty demo minh hoa.
Nhan default_label lay TRUC TIEP tu cot label_distress thuc te (khong tu suy Altman-Z).
Output: data/du_lieu.csv (dung chung cho prepare_data.py / main.py)
"""
import numpy as np
import pandas as pd

RAW_PATH = 'data/raw_bctc_quarterly.csv'
MACRO_PATH = 'data/macro.csv'
OUT_PATH = 'data/du_lieu.csv'

# Vi mo Viet Nam theo quy. data/macro.csv chi co so thuc nam 2022-2024 (GDP 8.02/5.05/7.09,
# lending rate 9.0/8.5/7.5 giam dan, CPI 3.15/3.25/3.63 tang dan) - khong co quy nao trong
# pham vi 2025-Q2..2026-Q1 can dung, nen 4 quy duoi day la NEO theo xu huong thuc te do
# (lending rate tiep tuc giam, CPI tiep tuc tang nhe, GDP huong theo muc tieu Chinh phu ~7-8%),
# khong phai so lieu quy thuc.
MACRO_BY_QUARTER = {
    '2025-Q2': (7.2, 7.0, 3.7), '2025-Q3': (7.4, 6.8, 3.8),
    '2025-Q4': (7.6, 6.6, 3.9), '2026-Q1': (7.5, 6.5, 4.0),
}

FEATURE_COLUMNS = [
    'current_ratio', 'quick_ratio', 'cash_ratio', 'de_ratio', 'da_ratio',
    'interest_coverage', 'asset_turnover', 'cfo_debt',
    'cfo_margin', 'cf_volatility', 'gdp_growth', 'lending_rate', 'cpi',
    'working_capital_ratio',
]

# Mapping nganh cho 73 ma trong data/raw_bctc_quarterly.csv (theo linh vuc kinh doanh thuc te)
TICKER_NGANH = {
    'AAA': 'San xuat', 'AGG': 'Bat dong san', 'ANV': 'San xuat', 'BCM': 'Bat dong san',
    'BSR': 'San xuat', 'CEO': 'Bat dong san', 'CMG': 'Dich vu', 'CSM': 'San xuat',
    'CSV': 'San xuat', 'CTD': 'San xuat', 'DBT': 'San xuat', 'DGW': 'Thuong mai',
    'DHC': 'San xuat', 'DIG': 'Bat dong san', 'DPG': 'Bat dong san', 'DPM': 'San xuat',
    'DRC': 'San xuat', 'DXS': 'Bat dong san', 'ELC': 'Dich vu', 'FCN': 'Dich vu',
    'FPT': 'Dich vu', 'FRT': 'Thuong mai', 'GAS': 'San xuat', 'GEX': 'San xuat',
    'GIL': 'San xuat', 'GMD': 'Dich vu', 'HAG': 'San xuat', 'HDC': 'Bat dong san',
    'HPG': 'San xuat', 'HQC': 'Bat dong san', 'HT1': 'San xuat', 'HUT': 'Bat dong san',
    'HVN': 'Dich vu', 'IDI': 'San xuat', 'IJC': 'Bat dong san', 'IMP': 'San xuat',
    'KDH': 'Bat dong san', 'KSB': 'San xuat', 'MSN': 'San xuat', 'MWG': 'Thuong mai',
    'NHA': 'Bat dong san', 'NT2': 'Dich vu', 'NVL': 'Bat dong san', 'PAN': 'San xuat',
    'PDR': 'Bat dong san', 'PET': 'Thuong mai', 'PGV': 'Dich vu', 'PLX': 'Thuong mai',
    'PNJ': 'Thuong mai', 'POM': 'San xuat', 'PVD': 'Dich vu', 'PVS': 'Dich vu',
    'PVT': 'Dich vu', 'REE': 'Dich vu', 'ROS': 'Bat dong san', 'SAB': 'San xuat',
    'SBT': 'San xuat', 'SCR': 'Bat dong san', 'SJS': 'Bat dong san', 'SMC': 'Thuong mai',
    'SSI': 'Dich vu', 'STG': 'Dich vu', 'STK': 'San xuat', 'SZC': 'Bat dong san',
    'TCL': 'Dich vu', 'TCM': 'San xuat', 'TLH': 'San xuat', 'TRA': 'San xuat',
    'VCG': 'Bat dong san', 'VGS': 'San xuat', 'VIC': 'Bat dong san', 'VNM': 'San xuat',
    'VRE': 'Dich vu',
}


def safe_div(a, b):
    """Chia an toan: tranh loi chia cho 0 / NaN (theo cach lam cua feature_engineering.py mau)."""
    b = b.replace(0, np.nan) if hasattr(b, 'replace') else (np.nan if b == 0 else b)
    return a / b


def build_real_companies():
    raw = pd.read_csv(RAW_PATH, sep=';')
    raw['quarter'] = raw['year'].astype(str) + '-Q' + raw['quarter'].astype(str)
    raw = raw.sort_values(['ticker', 'quarter']).reset_index(drop=True)

    raw['current_ratio'] = safe_div(raw['current_assets'], raw['current_liabilities'])
    raw['quick_ratio'] = safe_div(raw['current_assets'] - raw['inventory'], raw['current_liabilities'])
    raw['cash_ratio'] = safe_div(raw['cash_and_equiv'], raw['current_liabilities'])
    raw['de_ratio'] = safe_div(raw['total_liabilities'], raw['total_equity'])
    raw['da_ratio'] = safe_div(raw['total_liabilities'], raw['total_assets'])
    # Khong vay dai han -> chi phi lai vay ~ 0 -> coverage vo han, gan tran an toan thay vi NaN
    raw['interest_coverage'] = safe_div(raw['ebit'], raw['long_term_debt'] * 0.08).fillna(50.0)
    raw['asset_turnover'] = safe_div(raw['revenue'] * 4, raw['total_assets'])
    raw['cfo_debt'] = safe_div(raw['operating_cash_flow'], raw['total_liabilities'])
    raw['cfo_margin'] = safe_div(raw['operating_cash_flow'], raw['revenue'])
    raw['working_capital_ratio'] = safe_div(raw['current_assets'] - raw['current_liabilities'], raw['total_assets'])

    cf_vol = raw.groupby('ticker')['cfo_margin'].std().rename('cf_volatility')
    raw = raw.merge(cf_vol, on='ticker', how='left')

    raw = raw.replace([np.inf, -np.inf], np.nan)

    # --- Median imputation: cac ty so tai chinh thuong lech phan phoi va nhieu outlier ---
    impute_cols = FEATURE_COLUMNS + ['cf_volatility']
    for col in impute_cols:
        if col in raw.columns and raw[col].isna().any():
            raw[col] = raw[col].fillna(raw[col].median())

    # Du lieu thuc co outlier (vd von chu so huu am o cong ty kiet que) -> clip ve khoang hop ly
    CLIP_BOUNDS = {
        'current_ratio': (0, 10), 'quick_ratio': (-2, 8), 'cash_ratio': (0, 5),
        'de_ratio': (-10, 20), 'da_ratio': (0, 1.5), 'interest_coverage': (-20, 50),
        'asset_turnover': (0, 5), 'cfo_debt': (-2, 2),
        'cfo_margin': (-2, 2), 'cf_volatility': (0, 2), 'working_capital_ratio': (-1.5, 1.5),
    }
    for col, (lo, hi) in CLIP_BOUNDS.items():
        raw[col] = raw[col].clip(lo, hi)

    raw['gdp_growth'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[0])
    raw['lending_rate'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[1])
    raw['cpi'] = raw['quarter'].map(lambda q: MACRO_BY_QUARTER.get(q, (7.0, 9.0, 4.0))[2])

    raw['nganh'] = raw['ticker'].map(TICKER_NGANH).fillna('San xuat')
    raw['company_id'] = raw['ticker']
    raw['ten_cong_ty'] = raw['ticker']
    raw['is_demo'] = False
    raw['default_label'] = raw['label_distress'].astype(int)

    keep = ['company_id', 'ten_cong_ty', 'nganh', 'quarter', 'is_demo', 'default_label'] + FEATURE_COLUMNS
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
        'current_ratio':        [2.00, 2.02, 2.05, 2.06],
        'quick_ratio':           [1.80, 1.82, 1.85, 1.86],
        'cash_ratio':            [0.90, 0.91, 0.92, 0.93],
        'de_ratio':              [0.60, 0.58, 0.60, 0.57],
        'da_ratio':              [0.35, 0.34, 0.35, 0.33],
        'interest_coverage':     [8.0, 8.2, 8.5, 8.6],
        'asset_turnover':        [1.30, 1.31, 1.32, 1.33],
        'cfo_debt':              [0.50, 0.51, 0.52, 0.53],
        'cfo_margin':            [0.15, 0.16, 0.15, 0.17],
        'cf_volatility':         [0.05, 0.05, 0.05, 0.05],
        'working_capital_ratio': [0.35, 0.35, 0.36, 0.36],
        'default_label':         [0, 0, 0, 0],
    })
    medium = make_demo_company('DEMO_MEDIUM', 'Cty Rui Ro Trung Binh', 'Thuong mai', {
        'current_ratio':        [1.55, 1.47, 1.36, 1.27],
        'quick_ratio':           [1.35, 1.22, 1.07, 0.95],
        'cash_ratio':            [0.52, 0.47, 0.42, 0.38],
        'de_ratio':              [1.30, 1.60, 1.90, 2.15],
        'da_ratio':              [0.42, 0.45, 0.48, 0.51],
        'interest_coverage':     [4.5, 3.7, 2.9, 2.2],
        'asset_turnover':        [1.05, 0.98, 0.90, 0.83],
        'cfo_debt':              [0.28, 0.22, 0.16, 0.11],
        'cfo_margin':            [0.09, 0.07, 0.06, 0.05],
        'cf_volatility':         [0.07, 0.085, 0.10, 0.11],
        'working_capital_ratio': [0.28, 0.24, 0.205, 0.18],
        'default_label':         [0, 0, 0, 1],
    })
    distress = make_demo_company('DEMO_DISTRESS', 'Cty Dang Kiet Suc', 'Bat dong san', {
        'current_ratio':        [1.60, 1.52, 1.42, 0.55],
        'quick_ratio':           [1.30, 1.20, 1.05, 0.30],
        'cash_ratio':            [0.45, 0.41, 0.36, 0.08],
        'de_ratio':              [1.20, 1.40, 1.60, 4.50],
        'da_ratio':              [0.40, 0.44, 0.47, 0.80],
        'interest_coverage':     [5.0, 4.0, 3.0, -2.5],
        'asset_turnover':        [1.10, 1.02, 0.92, 0.30],
        'cfo_debt':              [0.30, 0.24, 0.17, -0.45],
        'cfo_margin':            [0.10, 0.08, 0.05, -0.18],
        'cf_volatility':         [0.08, 0.10, 0.13, 0.32],
        'working_capital_ratio': [0.30, 0.25, 0.18, 0.00],
        'default_label':         [0, 0, 1, 1],
    })
    return pd.concat([healthy, medium, distress], ignore_index=True)


def main():
    real_df = build_real_companies()
    demo_df = build_demo_companies()

    df = pd.concat([real_df, demo_df], ignore_index=True)
    # pd_score uoc luong tu nhan thuc + do lech cac ty so loi, dung de hien thi gauge truoc khi co model
    risk_signal = (
        -1.5 * df['cfo_margin'] - 1.0 * df['asset_turnover'] - 0.5 * df['quick_ratio']
        - 0.8 * df['working_capital_ratio'] + 0.3 * df['de_ratio'] + 2.0 * df['default_label']
    )
    df['pd_score'] = (1 / (1 + np.exp(-(risk_signal - 1.0)))).round(4)

    df.to_csv(OUT_PATH, index=False)
    print(f"Tao xong {OUT_PATH}: {df['company_id'].nunique()} doanh nghiep, {len(df)} dong")
    print(f"So dong rui ro (default_label=1): {df['default_label'].sum()}")
    print(df.groupby('is_demo').size())


if __name__ == '__main__':
    main()
