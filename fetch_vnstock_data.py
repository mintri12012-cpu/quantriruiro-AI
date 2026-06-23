"""
Lay du lieu BCTC thuc (4 quy gan nhat) cho danh sach co phieu thuc qua vnstock (nguon VCI).
Output: data/raw_vnstock.csv
"""
import time
import json
import pandas as pd
from vnstock.api.financial import Finance

TICKERS = {
    # San xuat
    'HPG': 'San xuat', 'HSG': 'San xuat', 'NKG': 'San xuat', 'DGC': 'San xuat', 'CSV': 'San xuat',
    'DCM': 'San xuat', 'DPM': 'San xuat', 'VNM': 'San xuat', 'MSN': 'San xuat', 'SAB': 'San xuat',
    'KDC': 'San xuat', 'QNS': 'San xuat', 'TNG': 'San xuat', 'GIL': 'San xuat', 'MSH': 'San xuat',
    'STK': 'San xuat', 'TCM': 'San xuat', 'EVE': 'San xuat', 'DHG': 'San xuat', 'IMP': 'San xuat',
    'DBD': 'San xuat', 'TRA': 'San xuat', 'PHR': 'San xuat', 'DPR': 'San xuat', 'BMP': 'San xuat',
    'AAA': 'San xuat', 'GVR': 'San xuat', 'SBT': 'San xuat', 'HAG': 'San xuat', 'ANV': 'San xuat',
    'VHC': 'San xuat', 'FMC': 'San xuat', 'DBC': 'San xuat', 'PAN': 'San xuat', 'HBC': 'San xuat',
    'CTD': 'San xuat',
    # Thuong mai
    'MWG': 'Thuong mai', 'FRT': 'Thuong mai', 'DGW': 'Thuong mai', 'PET': 'Thuong mai',
    # Bat dong san
    'VHM': 'Bat dong san', 'NVL': 'Bat dong san', 'PDR': 'Bat dong san', 'DXG': 'Bat dong san',
    'KDH': 'Bat dong san', 'KBC': 'Bat dong san', 'NLG': 'Bat dong san', 'HDG': 'Bat dong san',
    'CEO': 'Bat dong san', 'VIC': 'Bat dong san', 'DIG': 'Bat dong san', 'SCR': 'Bat dong san',
    'IJC': 'Bat dong san', 'TIP': 'Bat dong san', 'VPI': 'Bat dong san', 'NTL': 'Bat dong san',
    'LHG': 'Bat dong san', 'SZC': 'Bat dong san', 'D2D': 'Bat dong san', 'ITA': 'Bat dong san',
    # Dich vu
    'VJC': 'Dich vu', 'HVN': 'Dich vu', 'GMD': 'Dich vu', 'VTP': 'Dich vu', 'CII': 'Dich vu',
    'POW': 'Dich vu', 'PLX': 'Dich vu', 'REE': 'Dich vu', 'VRE': 'Dich vu', 'FPT': 'Dich vu',
}

BS_ROWS = {
    'tsnh': 'TÀI SẢN NGẮN HẠN',
    'no_nh': 'Nợ ngắn hạn',
    'no_phai_tra': 'NỢ PHẢI TRẢ',
    'tong_ts': 'TỔNG CỘNG TÀI SẢN',
    'vcsh': 'Vốn chủ sở hữu',
    'hang_ton_kho': 'Hàng tồn kho, ròng',
    'phai_thu_kh': 'Phải thu khách hàng',
    'tien': 'Tiền và tương đương tiền',
}
INC_ROWS = {
    'doanh_thu': 'Doanh thu thuần',
    'ebt': 'Lãi/(lỗ) trước thuế',
    'lai_vay': 'Chi phí lãi vay',
    'lnst': 'Lãi/(lỗ) thuần sau thuế',
}
CF_ROWS = {
    'cfo': 'Lưu chuyển tiền tệ ròng từ các hoạt động sản xuất kinh doanh',
}


def get_row(df, label):
    match = df[df['item'] == label]
    if match.empty:
        return None
    quarter_cols = [c for c in df.columns if c not in ('item', 'item_en', 'item_id')]
    return match.iloc[0][quarter_cols], quarter_cols


def fetch_one(ticker):
    f = Finance(symbol=ticker, source='VCI')
    bs = f.balance_sheet(period='quarter', lang='vi')
    inc = f.income_statement(period='quarter', lang='vi')
    cf = f.cash_flow(period='quarter', lang='vi')

    data = {}
    quarter_cols = None
    for key, label in BS_ROWS.items():
        row, cols = get_row(bs, label)
        if row is None:
            return None
        data[key] = row
        quarter_cols = cols
    for key, label in INC_ROWS.items():
        row, _ = get_row(inc, label)
        if row is None:
            return None
        data[key] = row
    for key, label in CF_ROWS.items():
        row, _ = get_row(cf, label)
        if row is None:
            return None
        data[key] = row

    records = []
    for q in quarter_cols:
        rec = {'quarter': q}
        for key in data:
            rec[key] = data[key][q]
        records.append(rec)
    return records


OUT_PATH = 'data/raw_vnstock.csv'


def main():
    done_tickers = set()
    all_rows = []
    try:
        existing = pd.read_csv(OUT_PATH)
        all_rows = existing.to_dict('records')
        done_tickers = set(existing['ticker'].unique())
        print(f"Resuming: {len(done_tickers)} ma da co san trong {OUT_PATH}")
    except FileNotFoundError:
        pass

    failed = []
    items = [(t, n) for t, n in TICKERS.items() if t not in done_tickers]
    for i, (ticker, nganh) in enumerate(items):
        attempt = 0
        while attempt < 2:
            try:
                records = fetch_one(ticker)
                if not records:
                    failed.append(ticker)
                    print(f"[{i+1}/{len(items)}] SKIP {ticker} (missing rows)")
                else:
                    for r in records:
                        r['ticker'] = ticker
                        r['nganh'] = nganh
                        all_rows.append(r)
                    print(f"[{i+1}/{len(items)}] OK {ticker} ({len(records)} quy)")
                break
            except BaseException as e:
                msg = str(e)
                if 'Rate limit' in msg or 'rate limit' in msg.lower():
                    print(f"[{i+1}/{len(items)}] Rate limited on {ticker}, sleeping 65s...")
                    time.sleep(65)
                    attempt += 1
                    continue
                failed.append(ticker)
                print(f"[{i+1}/{len(items)}] FAIL {ticker}: {e}")
                break
        pd.DataFrame(all_rows).to_csv(OUT_PATH, index=False)
        time.sleep(9)

    df = pd.DataFrame(all_rows)
    print(f"\nDone. {df['ticker'].nunique()} ma thanh cong, {len(failed)} ma loi: {failed}")


if __name__ == '__main__':
    main()
