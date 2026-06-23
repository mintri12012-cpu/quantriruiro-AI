"""
Doc data/train_test.npz (da chuan bi tu prepare_data.py), train XGBoost + danh gia + SHAP.
Output: models/pd_model.pkl
"""
import joblib
import numpy as np
import shap
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, roc_auc_score


def main():
    npz = np.load('data/train_test.npz')
    X_train, X_test = npz['X_train'], npz['X_test']
    y_train, y_test = npz['y_train'], npz['y_test']
    features = joblib.load('models/features.pkl')

    model = XGBClassifier(
        n_estimators=80,
        learning_rate=0.05,
        max_depth=3,
        min_child_weight=6,
        reg_lambda=3.0,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n=== KET QUA DANH GIA ===")
    print(classification_report(y_test, y_pred))
    print(f"AUC-ROC Score: {roc_auc_score(y_test, y_prob):.4f}")

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    shap_rank = sorted(zip(features, mean_abs_shap), key=lambda x: -x[1])
    print("\n=== TOP FEATURES THEO SHAP (mean |value|) ===")
    for name, val in shap_rank[:5]:
        print(f"  {name}: {val:.4f}")

    joblib.dump(model, 'models/pd_model.pkl')
    print("\nDa luu models/pd_model.pkl")


if __name__ == '__main__':
    main()
