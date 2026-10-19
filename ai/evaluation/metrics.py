import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score, average_precision_score, roc_auc_score, confusion_matrix, brier_score_loss
from sklearn.calibration import calibration_curve


def evaluate(labels, probabilities, threshold=0.5):
    y = np.asarray(labels)
    p = np.asarray(probabilities)
    if len(y) == 0 or len(y) != len(p) or not np.isfinite(p).all() or ((p < 0) | (p > 1)).any():
        raise ValueError("Probabilitas evaluasi tidak valid")
    predicted = p >= threshold
    observed, mean = calibration_curve(y, p, n_bins=10, strategy="quantile")
    return {"precision": float(precision_score(y, predicted, zero_division=0)),
        "recall": float(recall_score(y, predicted, zero_division=0)),
        "f1": float(f1_score(y, predicted, zero_division=0)),
        "pr_auc": float(average_precision_score(y, p)) if len(np.unique(y)) == 2 else None,
        "roc_auc": float(roc_auc_score(y, p)) if len(np.unique(y)) == 2 else None,
        "brier": float(brier_score_loss(y, p)), "confusion_matrix": confusion_matrix(y, predicted, labels=[0, 1]).tolist(),
        "calibration": {"observed": observed.tolist(), "predicted": mean.tolist()}, "threshold": threshold}
