import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import FloodPredictionInput, FirePredictionInput, PredictionOut
from app.ml.predictor import predict_flood, predict_fire
from app.models.models import Prediction

router = APIRouter(prefix="/api/predictions", tags=["Predictions"])


@router.post("/flood", response_model=PredictionOut)
def flood_prediction(payload: FloodPredictionInput, db: Session = Depends(get_db)):
    features = {
        "rainfall_mm": payload.rainfall_mm,
        "temperature_c": payload.temperature_c,
        "humidity_pct": payload.humidity_pct,
        "wind_speed_kmh": payload.wind_speed_kmh,
        "pressure_hpa": payload.pressure_hpa,
        "elevation_m": payload.elevation_m,
        "soil_saturation_pct": payload.soil_saturation_pct,
    }
    result = predict_flood(features)

    record = Prediction(
        hazard_type="FLOOD",
        latitude=payload.latitude,
        longitude=payload.longitude,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        input_features=json.dumps(features),
        contributing_factors=json.dumps(result["contributing_factors"]),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionOut(
        id=record.id,
        hazard_type=record.hazard_type,
        risk_score=record.risk_score,
        risk_level=record.risk_level.value if hasattr(record.risk_level, "value") else record.risk_level,
        contributing_factors=result["contributing_factors"],
        timestamp=record.created_at,
    )


@router.post("/fire", response_model=PredictionOut)
def fire_prediction(payload: FirePredictionInput, db: Session = Depends(get_db)):
    features = {
        "temperature_c": payload.temperature_c,
        "humidity_pct": payload.humidity_pct,
        "wind_speed_kmh": payload.wind_speed_kmh,
        "rainfall_mm": payload.rainfall_mm,
        "vegetation_index": payload.vegetation_index,
    }
    result = predict_fire(features)

    record = Prediction(
        hazard_type="FIRE",
        latitude=payload.latitude,
        longitude=payload.longitude,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        input_features=json.dumps(features),
        contributing_factors=json.dumps(result["contributing_factors"]),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionOut(
        id=record.id,
        hazard_type=record.hazard_type,
        risk_score=record.risk_score,
        risk_level=record.risk_level.value if hasattr(record.risk_level, "value") else record.risk_level,
        contributing_factors=result["contributing_factors"],
        timestamp=record.created_at,
    )


@router.get("/history", response_model=list[PredictionOut])
def prediction_history(hazard_type: str | None = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Prediction)
    if hazard_type:
        query = query.filter(Prediction.hazard_type == hazard_type.upper())
    records = query.order_by(Prediction.created_at.desc()).limit(limit).all()
    return [
        PredictionOut(
            id=r.id,
            hazard_type=r.hazard_type,
            risk_score=r.risk_score,
            risk_level=r.risk_level.value if hasattr(r.risk_level, "value") else r.risk_level,
            contributing_factors=json.loads(r.contributing_factors or "[]"),
            timestamp=r.created_at,
        )
        for r in records
    ]
