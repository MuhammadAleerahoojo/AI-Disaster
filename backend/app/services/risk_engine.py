"""
Combines ML predictions + live earthquake data into one location risk score.
Logic is intentionally simple and transparent (documented weights) rather
than a black box, per the project's "reasonable transparent logic" requirement.
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import EarthquakeEvent
from app.services.external_apis import haversine_km
from app.ml.predictor import risk_level_from_score

NEARBY_RADIUS_KM = 300


def earthquake_activity_near(db: Session, latitude: float, longitude: float):
    events = db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.event_time)).limit(500).all()
    nearby = [e for e in events if haversine_km(latitude, longitude, e.latitude, e.longitude) <= NEARBY_RADIUS_KM]
    max_mag = max([e.magnitude for e in nearby if e.magnitude is not None], default=None)
    return len(nearby), max_mag


def earthquake_risk_score(count: int, max_mag) -> float:
    if max_mag is None:
        return 0.05
    mag_component = min(max_mag / 8.0, 1.0)
    freq_component = min(count / 20.0, 1.0)
    return round(min(1.0, 0.75 * mag_component + 0.25 * freq_component), 4)


def combine_overall_risk(flood_score: float, fire_score: float, quake_score: float) -> float:
    # Documented weighting: flood and fire are more locally actionable /
    # frequent than seismic events, so they carry slightly more weight.
    score = 0.4 * flood_score + 0.35 * fire_score + 0.25 * quake_score
    return round(min(1.0, score), 4)


def build_location_risk(db: Session, latitude: float, longitude: float, flood_score: float, fire_score: float):
    count, max_mag = earthquake_activity_near(db, latitude, longitude)
    quake_score = earthquake_risk_score(count, max_mag)
    overall = combine_overall_risk(flood_score, fire_score, quake_score)
    return {
        "earthquake_recent_activity": count,
        "earthquake_max_magnitude_nearby": max_mag,
        "overall_risk_score": overall,
        "overall_risk_level": risk_level_from_score(overall),
    }
