import pandas as pd


def validate_dataset(frame: pd.DataFrame, feature_columns: list[str], horizon_hours: int):
    required = {"unit", "spatial_block", "issued_at", "feature_available_at", "label_end", "label", "label_evidence"}
    if not required.union(feature_columns).issubset(frame.columns):
        raise ValueError("Dataset atau provenance fitur tidak lengkap")
    if horizon_hours not in (24, 72):
        raise ValueError("Horizon tidak didukung")
    data = frame.copy()
    if data.empty or data[list(required)].isna().any().any():
        raise ValueError("Identitas, label, dan provenance wajib terisi")
    for c in ["issued_at", "feature_available_at", "label_end"]:
        data[c] = pd.to_datetime(data[c], utc=True, errors="raise")
    if (data.feature_available_at > data.issued_at).any():
        raise ValueError("Kebocoran: fitur belum tersedia saat penerbitan")
    if not (data.label_end == data.issued_at + pd.Timedelta(hours=horizon_hours)).all():
        raise ValueError("Jendela target tidak konsisten")
    if not data.label.isin([0, 1]).all():
        raise ValueError("Label harus biner")
    if not data.label_evidence.isin(["recorded_event", "observed_non_event"]).all():
        raise ValueError("Tidak ada laporan bukan label negatif yang teramati")
    if ((data.label == 0) & (data.label_evidence != "observed_non_event")).any():
        raise ValueError("Label negatif membutuhkan bukti pengamatan")
    if ((data.label == 1) & (data.label_evidence != "recorded_event")).any():
        raise ValueError("Label positif membutuhkan bukti kejadian")
    if data.duplicated(["unit", "issued_at"]).any():
        raise ValueError("Duplikat unit dan waktu")
    forbidden = {"label", "label_end", "fatalities", "event_id", "label_evidence", "occurred_at"}
    if forbidden.intersection(feature_columns):
        raise ValueError("Fitur target dilarang")
    return data


def blocked_split(frame, cutoff: str, held_out_blocks: list[str], horizon_hours: int):
    boundary = pd.Timestamp(cutoff)
    if boundary.tzinfo is None:
        raise ValueError("Cutoff memerlukan zona waktu")
    held = frame.spatial_block.isin(held_out_blocks)
    train = frame[(frame.label_end < boundary) & ~held]
    test = frame[(frame.issued_at >= boundary + pd.Timedelta(hours=horizon_hours)) & held]
    if train.empty or test.empty:
        raise ValueError("Pemisahan spasial-temporal menghasilkan himpunan kosong")
    if set(train.spatial_block) & set(test.spatial_block):
        raise ValueError("Blok spasial bocor")
    return train, test
