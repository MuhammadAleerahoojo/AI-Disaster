from fastapi import APIRouter, HTTPException

from app.services.external_apis import fetch_open_meteo

router = APIRouter(prefix="/api/weather", tags=["Weather"])


@router.get("")
async def get_weather(latitude: float, longitude: float):
    data = await fetch_open_meteo(latitude, longitude)
    if data is None:
        raise HTTPException(status_code=503, detail="Weather service temporarily unavailable")
    return data
