from datetime import datetime
from typing import Optional, List, Dict, Any

from pydantic import BaseModel, EmailStr, Field


# ---------- Auth / Users ----------
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Predictions ----------
class FloodPredictionInput(BaseModel):
    latitude: float
    longitude: float
    rainfall_mm: float
    temperature_c: float
    humidity_pct: float
    wind_speed_kmh: float
    pressure_hpa: float
    elevation_m: Optional[float] = 50.0
    soil_saturation_pct: Optional[float] = 50.0


class FirePredictionInput(BaseModel):
    latitude: float
    longitude: float
    temperature_c: float
    humidity_pct: float
    wind_speed_kmh: float
    rainfall_mm: float
    vegetation_index: Optional[float] = 0.5


class PredictionOut(BaseModel):
    id: str
    hazard_type: str
    risk_score: float
    risk_level: str
    contributing_factors: List[Dict[str, Any]]
    timestamp: datetime

    class Config:
        from_attributes = True


class LocationRiskRequest(BaseModel):
    latitude: float
    longitude: float
    location_label: Optional[str] = None


class LocationRiskResponse(BaseModel):
    location_label: Optional[str]
    latitude: float
    longitude: float
    flood_risk_score: float
    flood_risk_level: str
    fire_risk_score: float
    fire_risk_level: str
    earthquake_recent_activity: int
    earthquake_max_magnitude_nearby: Optional[float]
    overall_risk_score: float
    overall_risk_level: str
    weather: Optional[Dict[str, Any]] = None
    note: str = "Real-time seismic event monitoring and location-based impact assessment. Earthquakes are not deterministically predicted."


# ---------- Earthquakes / Fires ----------
class EarthquakeOut(BaseModel):
    id: str
    place: Optional[str]
    magnitude: Optional[float]
    depth_km: Optional[float]
    latitude: float
    longitude: float
    event_time: Optional[datetime]
    is_demo_data: bool

    class Config:
        from_attributes = True


class FireEventOut(BaseModel):
    id: str
    latitude: float
    longitude: float
    brightness: Optional[float]
    confidence: Optional[str]
    acq_date: Optional[str]
    is_demo_data: bool

    class Config:
        from_attributes = True


# ---------- Alerts ----------
class AlertOut(BaseModel):
    id: str
    title: str
    disaster_type: str
    severity: str
    location_label: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    recommended_action: Optional[str]
    alert_type: str
    is_read: bool
    is_demo_data: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Incidents ----------
class IncidentCreate(BaseModel):
    incident_type: str
    description: str
    latitude: float
    longitude: float
    location_label: Optional[str] = None
    severity: Optional[str] = "MODERATE"
    affected_people: Optional[int] = 0
    contact_info: Optional[str] = None


class IncidentOut(BaseModel):
    id: str
    incident_code: str
    incident_type: str
    description: str
    latitude: float
    longitude: float
    location_label: Optional[str]
    severity: str
    affected_people: int
    photo_path: Optional[str]
    contact_info: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IncidentStatusUpdate(BaseModel):
    status: str


# ---------- Rescue ----------
class RescueTeamOut(BaseModel):
    id: str
    name: str
    specialization: Optional[str]
    is_available: bool
    contact_number: Optional[str]

    class Config:
        from_attributes = True


class RescueOperationCreate(BaseModel):
    incident_id: str
    team_id: Optional[str] = None
    priority: Optional[str] = "MODERATE"
    estimated_response_minutes: Optional[int] = None


class RescueOperationUpdate(BaseModel):
    status: Optional[str] = None
    team_id: Optional[str] = None
    priority: Optional[str] = None
    estimated_response_minutes: Optional[int] = None


class RescueOperationOut(BaseModel):
    id: str
    incident_id: str
    team_id: Optional[str]
    priority: str
    status: str
    estimated_response_minutes: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Chat ----------
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    is_fallback: bool
    urgency: str = "LOW" 
    suggested_actions: List[str] = []


# ---------- Analytics ----------
class AnalyticsSummary(BaseModel):
    total_incidents: int
    incidents_by_type: Dict[str, int]
    average_response_minutes: Optional[float]
    active_emergencies: int
    resolved_incidents: int
    risk_distribution: Dict[str, int]

# ---------- Safe Places ----------
class SafePlaceOut(BaseModel):
    name: str
    type: str
    latitude: float
    longitude: float
    address: Optional[str] = None
    phone: Optional[str] = None
    distance_km: Optional[float] = None
    is_demo_data: bool = False