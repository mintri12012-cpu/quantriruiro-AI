"""
Smoke test: load model/scaler/features da luu va chay 1 du doan mau + SHAP de xac nhan pipeline OK.
"""
import joblib
import numpy as np
import shap

SAMPLE = {
    'current_ratio': 1.5, 'quick_ratio': 1.2, 'cash_ratio': 0.5, 'de_ratio': 2.0,
    'da_ratio': 0.5, 'interest_coverage': 3.0, 'asset_turnover': 0.8,
    'receivable_days': 45, 'cfo_debt': 0.2, 'cfo_margin': 0.1, 'cf_volatility': 0.1,
    'gdp_growth': 6.5, 'lending_rate': 9.0, 'cpi': 4.0, 'working_capital_ratio': 0.25,
}


def main():
    model = joblib.load('models/pd_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    features = joblib.load('models/features.pkl')

    x = np.array([[SAMPLE[f] for f in features]])
    x_scaled = scaler.transform(x)

    prob = model.predict_proba(x_scaled)[0][1]
    print(f"PD score: {prob:.4f} ({prob*100:.2f}%)")

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(x_scaled)[0]
    ranked = sorted(zip(features, shap_values), key=lambda t: -abs(t[1]))[:5]
    print("Top 5 SHAP features:")
    for name, val in ranked:
        print(f"  {name}: {val:+.4f}")

    print("\nOK - pipeline hoat dong binh thuong.")


if __name__ == '__main__':
    main()
