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

    scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
    model = XGBClassifier(
        n_estimators=150,
        learning_rate=0.05,
        max_depth=4,
        min_child_weight=1,
        reg_lambda=1.5,
        subsample=0.9,
        colsample_bytree=0.9,
        scale_pos_weight=scale_pos_weight,
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
