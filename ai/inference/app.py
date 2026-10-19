from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict

app = FastAPI(title="LERENG · Layanan penelitian prediksi longsor", version="0.1.0")


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    geographic_unit: str = Field(min_length=1, max_length=100)
    horizon_hours: Literal[24, 72] = 24


def model_status():
    return {
        "status": "model_unavailable", "version": None, "validated": False,
        "coverage": [], "horizons": [24, 72], "input_data_status": "belum_memadai",
        "message": "Model prediksi AI belum tersedia. Sistem sedang dipersiapkan untuk integrasi model yang telah dilatih dan divalidasi.",
        "validation_methodology": "Blok spasial, pemisahan temporal dengan embargo, kalibrasi pada data terpisah.",
        "limitations": ["Bukan peringatan resmi bencana.", "Ketiadaan laporan bukan bukti tidak terjadi longsor."],
        "last_successful_inference": None,
    }


@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/models/status")
@app.get("/models/metadata")
def status():
    return model_status()


@app.post("/predict", responses={503: {"description": "Model tervalidasi belum tersedia"}})
def predict(request: PredictionRequest):
    return JSONResponse(status_code=503, content={**model_status(), **request.model_dump(),
        "model_version": None, "issued_at": None, "predicted_value": None,
        "uncertainty": None, "input_freshness": None})
