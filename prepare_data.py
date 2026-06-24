"""
Doc data/du_lieu.csv, chia train/test, fit StandardScaler.
Output: data/train_test.npz (X_train, X_test, y_train, y_test da scale) + models/scaler.pkl + models/features.pkl
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import os

DATA_PATH = 'data/du_lieu.csv'

FEATURES = [
    'current_ratio', 'quick_ratio', 'cash_ratio', 'de_ratio', 'da_ratio',
    'interest_coverage', 'asset_turnover', 'cfo_debt',
    'cfo_margin', 'cf_volatility', 'gdp_growth', 'lending_rate', 'cpi',
    'working_capital_ratio',
]


def main():
    df = pd.read_csv(DATA_PATH)
    X = df[FEATURES]
    y = df['default_label']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    os.makedirs('models', exist_ok=True)
    joblib.dump(scaler, 'models/scaler.pkl')
    joblib.dump(FEATURES, 'models/features.pkl')
    np.savez(
        'data/train_test.npz',
        X_train=X_train_scaled, X_test=X_test_scaled,
        y_train=y_train.to_numpy(), y_test=y_test.to_numpy(),
    )
    print(f"Du lieu: {len(df)} dong, {df['default_label'].sum()} dong rui ro")
    print(f"Train: {X_train_scaled.shape}, Test: {X_test_scaled.shape}")
    print("Da luu models/scaler.pkl, models/features.pkl, data/train_test.npz")


if __name__ == '__main__':
    main()
