"""
Thin, resilient clients for external data sources. Every function fails
SOFT (returns None / empty list + a flag) instead of raising, so the rest of
the app can fall back to demo data and stay usable when the network or a
third-party API is unavailable.
"""
import math
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import settings

TIMEOUT = httpx.Timeout(6.0, connect=4.0)


async def fetch_usgs_earthquakes() -> tuple[list[dict], bool]:
    """Returns (events, is_live). is_live=False means fetch failed (caller should use demo data)."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(settings.USGS_EARTHQUAKE_FEED_URL)
            resp.raise_for_status()
            data = resp.json()
        events = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            coords = feature.get("geometry", {}).get("coordinates", [None, None, None])
            lon, lat, depth = coords[0], coords[1], coords[2]
            if lat is None or lon is None:
                continue
            event_time = None
            if props.get("time"):
                event_time = datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc)
            events.append({
                "usgs_id": feature.get("id"),
                "place": props.get("place"),
                "magnitude": props.get("mag"),
                "depth_km": depth,
                "latitude": lat,
                "longitude": lon,
                "event_time": event_time,
            })
        return events, True
    except Exception:
        return [], False


async def fetch_open_meteo(latitude: float, longitude: float) -> Optional[dict]:
    try:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,precipitation,weather_code",
            "timezone": "auto",
        }
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(settings.OPEN_METEO_BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
        current = data.get("current", {})
        return {
            "temperature_c": current.get("temperature_2m"),
            "humidity_pct": current.get("relative_humidity_2m"),
            "wind_speed_kmh": current.get("wind_speed_10m"),
            "pressure_hpa": current.get("surface_pressure"),
            "rainfall_mm": current.get("precipitation"),
            "weather_code": current.get("weather_code"),
        }
    except Exception:
        return None


async def fetch_nasa_firms(latitude: float, longitude: float, radius_deg: float = 1.0) -> tuple[list[dict], bool]:
    """NASA FIRMS requires a MAP_KEY. If not configured, fail soft so callers use demo hotspots."""
    if not settings.NASA_FIRMS_MAP_KEY:
        return [], False
    try:
        bbox = f"{longitude - radius_deg},{latitude - radius_deg},{longitude + radius_deg},{latitude + radius_deg}"
        url = f"{settings.NASA_FIRMS_BASE_URL}/{settings.NASA_FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/1"
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.text
        lines = [l for l in text.strip().splitlines() if l]
        if len(lines) < 2:
            return [], True
        header = lines[0].split(",")
        events = []
        for line in lines[1:]:
            vals = line.split(",")
            row = dict(zip(header, vals))
            try:
                events.append({
                    "latitude": float(row.get("latitude")),
                    "longitude": float(row.get("longitude")),
                    "brightness": float(row.get("bright_ti4", 0) or 0),
                    "confidence": row.get("confidence"),
                    "acq_date": row.get("acq_date"),
                })
            except (TypeError, ValueError):
                continue
        return events, True
    except Exception:
        return [], False


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))
