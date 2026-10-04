import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, Boolean, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from app.database.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentType(str, enum.Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    EARTHQUAKE_DAMAGE = "EARTHQUAKE_DAMAGE"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    TRAPPED_PERSON = "TRAPPED_PERSON"
    INFRASTRUCTURE_DAMAGE = "INFRASTRUCTURE_DAMAGE"
    OTHER = "OTHER"


class IncidentStatus(str, enum.Enum):
    REPORTED = "REPORTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"


class AlertType(str, enum.Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"
    SMS = "SMS"


class RescueStatus(str, enum.Enum):
    PENDING = "PENDING"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ON_SCENE = "ON_SCENE"
    RESOLVED = "RESOLVED"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    incidents = relationship("Incident", back_populates="reporter")
    chat_sessions = relationship("ChatSession", back_populates="user")


class Location(Base):
    __tablename__ = "locations"

    id = Column(String, primary_key=True, default=gen_uuid)
    label = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=gen_uuid)
    hazard_type = Column(String, nullable=False)  # FLOOD | FIRE
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(Enum(RiskLevel), nullable=False)
    input_features = Column(Text, nullable=True)  # JSON string
    contributing_factors = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), default=utcnow)


class EarthquakeEvent(Base):
    __tablename__ = "earthquake_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    usgs_id = Column(String, unique=True, nullable=True)
    place = Column(String, nullable=True)
    magnitude = Column(Float, nullable=True)
    depth_km = Column(Float, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    event_time = Column(DateTime(timezone=True), nullable=True)
    is_demo_data = Column(Boolean, default=False)
    fetched_at = Column(DateTime(timezone=True), default=utcnow)


class FireEvent(Base):
    __tablename__ = "fire_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    brightness = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)
    acq_date = Column(String, nullable=True)
    source = Column(String, default="NASA_FIRMS")
    is_demo_data = Column(Boolean, default=False)
    fetched_at = Column(DateTime(timezone=True), default=utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=False)
    disaster_type = Column(String, nullable=False)
    severity = Column(Enum(RiskLevel), nullable=False)
    location_label = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    recommended_action = Column(Text, nullable=True)
    alert_type = Column(Enum(AlertType), default=AlertType.IN_APP)
    is_read = Column(Boolean, default=False)
    is_demo_data = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=gen_uuid)
    incident_code = Column(String, unique=True, nullable=False)
    reporter_id = Column(String, ForeignKey("users.id"), nullable=True)
    incident_type = Column(Enum(IncidentType), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_label = Column(String, nullable=True)
    severity = Column(Enum(RiskLevel), default=RiskLevel.MODERATE)
    affected_people = Column(Integer, default=0)
    photo_path = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.REPORTED)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    reporter = relationship("User", back_populates="incidents")
    rescue_operation = relationship("RescueOperation", back_populates="incident", uselist=False)


class RescueTeam(Base):
    __tablename__ = "rescue_teams"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    is_available = Column(Boolean, default=True)
    contact_number = Column(String, nullable=True)

    operations = relationship("RescueOperation", back_populates="team")


class RescueOperation(Base):
    __tablename__ = "rescue_operations"

    id = Column(String, primary_key=True, default=gen_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), nullable=False)
    team_id = Column(String, ForeignKey("rescue_teams.id"), nullable=True)
    priority = Column(Enum(RiskLevel), default=RiskLevel.MODERATE)
    status = Column(Enum(RescueStatus), default=RescueStatus.PENDING)
    estimated_response_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    incident = relationship("Incident", back_populates="rescue_operation")
    team = relationship("RescueTeam", back_populates="operations")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("ChatSession", back_populates="messages")
