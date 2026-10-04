from fastapi import APIRouter

from app.schemas.schemas import SafePlaceOut
from app.services.safe_places import fetch_nearby_safe_places
from app.services.external_apis import haversine_km

router = APIRouter(prefix="/api/safe-places", tags=["Safe Places"])

# Used only when the live Overpass API is unreachable, so the feature still
# gives the user something actionable instead of an empty screen. These are
# NOT real nearby locations -- they are clearly flagged as demo/fallback data
# and paired with universal Pakistan emergency helplines.
FALLBACK_HELPLINES = [
    {"name": "Rescue 1122 (Emergency Services)", "type": "OTHER", "phone": "1122"},
    {"name": "Police Emergency", "type": "POLICE", "phone": "15"},
    {"name": "Edhi Foundation Ambulance", "type": "HOSPITAL", "phone": "115"},
    {"name": "National Disaster Management Authority (NDMA)", "type": "OTHER", "phone": "051-9205037"},
]


@router.get("", response_model=list[SafePlaceOut])
async def get_safe_places(latitude: float, longitude: float, radius_km: float = 5.0):
    places, is_live = await fetch_nearby_safe_places(latitude, longitude, radius_km)

    if not is_live or not places:
        return [
            SafePlaceOut(
                name=h["name"],
                type=h["type"],
                latitude=latitude,
                longitude=longitude,
                phone=h.get("phone"),
                is_demo_data=True,
            )
            for h in FALLBACK_HELPLINES
        ]

    for p in places:
        p["distance_km"] = round(haversine_km(latitude, longitude, p["latitude"], p["longitude"]), 2)
        p["is_demo_data"] = False

    places.sort(key=lambda p: p["distance_km"])
    return places[:15]