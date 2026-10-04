from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.schemas import LocationRiskRequest, LocationRiskResponse
from app.ml.predictor import predict_flood, predict_fire
from app.services.external_apis import fetch_open_meteo
from app.services.risk_engine import build_location_risk

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.post("", response_model=LocationRiskResponse)
async def location_risk(payload: LocationRiskRequest, db: Session = Depends(get_db)):
    weather = await fetch_open_meteo(payload.latitude, payload.longitude)

    if weather and all(weather.get(k) is not None for k in ["temperature_c", "humidity_pct", "wind_speed_kmh", "pressure_hpa"]):
        rainfall = weather.get("rainfall_mm") or 0.0
        flood_features = {
            "rainfall_mm": rainfall, "temperature_c": weather["temperature_c"],
            "humidity_pct": weather["humidity_pct"], "wind_speed_kmh": weather["wind_speed_kmh"],
            "pressure_hpa": weather["pressure_hpa"], "elevation_m": 50.0, "soil_saturation_pct": 50.0,
        }
        fire_features = {
            "temperature_c": weather["temperature_c"], "humidity_pct": weather["humidity_pct"],
            "wind_speed_kmh": weather["wind_speed_kmh"], "rainfall_mm": rainfall, "vegetation_index": 0.5,
        }
    else:
        # Graceful fallback when weather API is unreachable: use conservative regional defaults
        flood_features = {
            "rainfall_mm": 15.0, "temperature_c": 28.0, "humidity_pct": 60.0,
            "wind_speed_kmh": 12.0, "pressure_hpa": 1010.0, "elevation_m": 50.0, "soil_saturation_pct": 50.0,
        }
        fire_features = {
            "temperature_c": 28.0, "humidity_pct": 60.0, "wind_speed_kmh": 12.0,
            "rainfall_mm": 15.0, "vegetation_index": 0.5,
        }

    flood_result = predict_flood(flood_features)
    fire_result = predict_fire(fire_features)

    combined = build_location_risk(db, payload.latitude, payload.longitude, flood_result["risk_score"], fire_result["risk_score"])

    return LocationRiskResponse(
        location_label=payload.location_label,
        latitude=payload.latitude,
        longitude=payload.longitude,
        flood_risk_score=flood_result["risk_score"],
        flood_risk_level=flood_result["risk_level"],
        fire_risk_score=fire_result["risk_score"],
        fire_risk_level=fire_result["risk_level"],
        earthquake_recent_activity=combined["earthquake_recent_activity"],
        earthquake_max_magnitude_nearby=combined["earthquake_max_magnitude_nearby"],
        overall_risk_score=combined["overall_risk_score"],
        overall_risk_level=combined["overall_risk_level"],
        weather=weather,
    )
