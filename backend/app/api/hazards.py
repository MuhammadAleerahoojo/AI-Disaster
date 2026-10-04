from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.models import EarthquakeEvent, FireEvent
from app.schemas.schemas import EarthquakeOut, FireEventOut
from app.services.external_apis import fetch_usgs_earthquakes, fetch_nasa_firms

router = APIRouter(prefix="/api", tags=["Hazards"])


@router.get("/earthquakes", response_model=list[EarthquakeOut])
async def get_earthquakes(refresh: bool = True, limit: int = 100, db: Session = Depends(get_db)):
    if refresh:
        events, is_live = await fetch_usgs_earthquakes()
        if is_live:
            for e in events:
                existing = db.query(EarthquakeEvent).filter(EarthquakeEvent.usgs_id == e["usgs_id"]).first()
                if existing:
                    continue
                db.add(EarthquakeEvent(
                    usgs_id=e["usgs_id"], place=e["place"], magnitude=e["magnitude"],
                    depth_km=e["depth_km"], latitude=e["latitude"], longitude=e["longitude"],
                    event_time=e["event_time"], is_demo_data=False,
                ))
            db.commit()

    records = db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.event_time)).limit(limit).all()
    return records


@router.get("/fires", response_model=list[FireEventOut])
async def get_fires(latitude: float = 0.0, longitude: float = 0.0, refresh: bool = True, limit: int = 100, db: Session = Depends(get_db)):
    if refresh and latitude and longitude:
        events, is_live = await fetch_nasa_firms(latitude, longitude)
        if is_live and events:
            for e in events:
                db.add(FireEvent(
                    latitude=e["latitude"], longitude=e["longitude"], brightness=e.get("brightness"),
                    confidence=e.get("confidence"), acq_date=e.get("acq_date"), is_demo_data=False,
                ))
            db.commit()

    records = db.query(FireEvent).order_by(desc(FireEvent.fetched_at)).limit(limit).all()
    return records
