import argparse
import json
import os
from pathlib import Path
from datetime import datetime, timezone
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from ai.datasets.prepare import validate_dataset, blocked_split
from ai.evaluation.metrics import evaluate
from ai.preprocessing.spatial import dataset_manifest


def train(dataset: Path, configuration: Path, output: Path):
    config = json.loads(configuration.read_text())
    features = config["features"]
    frame = validate_dataset(pd.read_csv(dataset), features, config["horizon_hours"])
    training, test = blocked_split(frame, config["cutoff"], config["held_out_blocks"], config["horizon_hours"])
    if training.label.nunique() < 2 or test.label.nunique() < 2:
        raise ValueError("Dua kelas diperlukan pada pelatihan dan evaluasi")
    if any(training[c].isna().all() for c in features):
        raise ValueError("Fitur tanpa data tidak boleh dilatih")
    model_name = config.get("model", "logistic_regression")
    if model_name == "logistic_regression":
        estimator = LogisticRegression(class_weight="balanced", max_iter=2000, random_state=42)
    elif model_name == "random_forest":
        estimator = RandomForestClassifier(n_estimators=200, class_weight="balanced", random_state=42, n_jobs=-1)
    elif model_name == "xgboost":
        from xgboost import XGBClassifier
        estimator = XGBClassifier(random_state=42, eval_metric="logloss", scale_pos_weight=float((training.label == 0).sum() / (training.label == 1).sum()))
    else:
        raise ValueError("Model tidak didukung")
    pipeline = Pipeline([("imputer", SimpleImputer(strategy="median", add_indicator=True)),
                         ("normalization", StandardScaler()), ("model", estimator)])
    pipeline.fit(training[features], training.label)
    baseline = DummyClassifier(strategy="prior").fit(training[features], training.label)
    metrics = evaluate(test.label, pipeline.predict_proba(test[features])[:, 1])
    baseline_metrics = evaluate(test.label, baseline.predict_proba(test[features])[:, 1])
    manifest = dataset_manifest([dataset, configuration], config.get("provenance", {}), config)
    metadata = {"status": "research", "validated": False, "calibrated": False,
        "trained_at": datetime.now(timezone.utc).isoformat(), "dataset_version": manifest["version"],
        "model": model_name, "metrics": metrics, "baseline_metrics": baseline_metrics,
        "validation_methodology": "Joint held-out spatial blocks and future time, embargo; not operational validation",
        "limitations": ["Kalibrasi dan kajian generalisasi tambahan diperlukan.", "Bias pelaporan kejadian belum terselesaikan."],
        "configuration": config}
    output.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, output / "research_model.joblib")
    (output / "metadata.json").write_text(json.dumps(metadata, indent=2))
    (output / "dataset_manifest.json").write_text(json.dumps(manifest, indent=2))
    if os.environ.get("MLFLOW_TRACKING_URI"):
        import mlflow
        with mlflow.start_run():
            mlflow.log_params({"model": model_name, "dataset_version": manifest["version"]})
            mlflow.log_metrics({k: v for k, v in metrics.items() if isinstance(v, (int, float))})
            mlflow.log_artifact(str(output / "metadata.json"))
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("configuration", type=Path)
    parser.add_argument("--output", type=Path, default=Path("ai/models/research"))
    args = parser.parse_args()
    train(args.dataset, args.configuration, args.output)
