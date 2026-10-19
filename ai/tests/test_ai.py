import pandas as pd
import pytest
from fastapi.testclient import TestClient
from ai.inference.app import app
from ai.features.rainfall import rainfall_features
from ai.datasets.prepare import validate_dataset, blocked_split
from ai.evaluation.metrics import evaluate


def test_no_fake_predictions():
    client = TestClient(app)
    assert client.get("/health").status_code == 200
    assert client.get("/models/status").json()["validated"] is False
    response = client.post("/predict", json={"geographic_unit": "unit-test", "horizon_hours": 24})
    assert response.status_code == 503
    assert response.json()["predicted_value"] is None
    assert client.post("/predict", json={"geographic_unit": "u", "horizon_hours": 12}).status_code == 422


def test_rain_requires_complete_data_and_known_at_issuance():
    times = pd.date_range(end="2020-01-08T00:00:00Z", periods=168, freq="h")
    frame = pd.DataFrame({"unit": "u", "observed_at": times, "available_at": times, "rainfall_mm": 1.0, "interval_hours": 1})
    assert rainfall_features(frame, times[-1].isoformat(), "u")["rainfall_24h"] == 24
    frame.loc[167, "available_at"] = times[-1] + pd.Timedelta(hours=1)
    assert rainfall_features(frame, times[-1].isoformat(), "u")["rainfall_24h"] is None


def dataset():
    return pd.DataFrame({"unit": ["a", "b"], "spatial_block": ["A", "B"],
        "issued_at": ["2019-01-01T00:00:00Z", "2021-01-01T00:00:00Z"],
        "feature_available_at": ["2019-01-01T00:00:00Z", "2021-01-01T00:00:00Z"],
        "label_end": ["2019-01-02T00:00:00Z", "2021-01-02T00:00:00Z"],
        "label": [0, 1], "label_evidence": ["observed_non_event", "recorded_event"], "slope": [20, 30]})


def test_leakage_and_spatial_blocks():
    frame = validate_dataset(dataset(), ["slope"], 24)
    training, test = blocked_split(frame, "2020-01-01T00:00:00Z", ["B"], 24)
    assert set(training.spatial_block).isdisjoint(test.spatial_block)
    frame.loc[0, "feature_available_at"] = pd.Timestamp("2022-01-01T00:00:00Z")
    with pytest.raises(ValueError, match="Kebocoran"):
        validate_dataset(frame, ["slope"], 24)


def test_unreported_is_not_negative():
    frame = dataset()
    frame.loc[0, "label_evidence"] = "unreported"
    with pytest.raises(ValueError):
        validate_dataset(frame, ["slope"], 24)


def test_evaluation():
    metrics = evaluate([0, 1, 0, 1], [0.1, 0.9, 0.2, 0.8])
    assert metrics["f1"] == 1
    assert metrics["confusion_matrix"] == [[2, 0], [0, 2]]
