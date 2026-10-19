import pandas as pd


def rainfall_features(observations: pd.DataFrame, issued_at: str, unit: str):
    """Only complete hourly observations known at issuance may contribute."""
    required = {"unit", "observed_at", "available_at", "rainfall_mm", "interval_hours"}
    if not required.issubset(observations.columns):
        raise ValueError("Kolom pengamatan hujan tidak lengkap")
    issued = pd.Timestamp(issued_at)
    if issued.tzinfo is None:
        raise ValueError("Waktu penerbitan harus memiliki zona waktu")
    frame = observations.copy()
    for column in ["observed_at", "available_at"]:
        frame[column] = pd.to_datetime(frame[column], utc=True)
    if (frame.rainfall_mm.dropna() < 0).any():
        raise ValueError("Curah hujan negatif")
    frame = frame[(frame.unit == unit) & (frame.observed_at <= issued) & (frame.available_at <= issued)]
    if frame.observed_at.duplicated().any():
        raise ValueError("Pengamatan ganda harus direkonsiliasi lebih dahulu")
    frame = frame.set_index("observed_at").sort_index()
    result = {}
    for hours, name in [(24, "rainfall_24h"), (72, "rainfall_72h"), (168, "rainfall_7d")]:
        expected = pd.date_range(end=issued, periods=hours, freq="h")
        subset = frame.reindex(expected)
        complete = subset.rainfall_mm.notna().all() and subset.interval_hours.eq(1).all()
        result[name] = float(subset.rainfall_mm.sum()) if complete else None
    # API only defined for complete 7-day observations; no imputed dry hours.
    subset = frame.reindex(pd.date_range(end=issued, periods=168, freq="h"))
    result["antecedent_precipitation"] = (
        float(sum(value * 0.9 ** (age / 24) for age, value in enumerate(subset.rainfall_mm.iloc[::-1])))
        if result["rainfall_7d"] is not None else None
    )
    return result
