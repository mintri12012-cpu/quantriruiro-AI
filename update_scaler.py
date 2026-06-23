"""
Tien ich: refit lai StandardScaler tu data/du_lieu.csv hien tai ma KHONG can train lai model.
Dung khi co them du lieu moi (vi du chay lai fetch_vnstock_data.py) nhung chua muon retrain XGBoost.
"""
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler

DATA_PATH = 'data/du_lieu.csv'


def main():
    features = joblib.load('models/features.pkl')
    df = pd.read_csv(DATA_PATH)
    scaler = StandardScaler()
    scaler.fit(df[features])
    joblib.dump(scaler, 'models/scaler.pkl')
    print(f"Da refit scaler tren {len(df)} dong, luu lai models/scaler.pkl")


if __name__ == '__main__':
    main()
