import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Incident, IncidentType, IncidentStatus, RiskLevel, User
from app.schemas.schemas import IncidentOut, IncidentStatusUpdate
from app.api.deps import get_optional_user, get_current_admin

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE_MB = 5
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def generate_incident_code() -> str:
    return f"INC-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(
    incident_type: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_label: str | None = Form(None),
    severity: str = Form("MODERATE"),
    affected_people: int = Form(0),
    contact_info: str | None = Form(None),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if incident_type.upper() not in IncidentType.__members__:
        raise HTTPException(status_code=400, detail="Invalid incident_type")
    if severity.upper() not in RiskLevel.__members__:
        raise HTTPException(status_code=400, detail="Invalid severity")

    photo_path = None
    if photo is not None:
        ext = os.path.splitext(photo.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use jpg, jpeg, png, or webp.")
        contents = await photo.read()
        if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE_MB}MB.")
        filename = f"{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(UPLOAD_DIR, filename)
        with open(full_path, "wb") as f:
            f.write(contents)
        photo_path = f"/uploads/{filename}"

    incident = Incident(
        incident_code=generate_incident_code(),
        reporter_id=current_user.id if current_user else None,
        incident_type=incident_type.upper(),
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
        severity=severity.upper(),
        affected_people=affected_people,
        photo_path=photo_path,
        contact_info=contact_info,
        status=IncidentStatus.REPORTED,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status_filter: str | None = None,
    incident_type: str | None = None,
    severity: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if status_filter:
        query = query.filter(Incident.status == status_filter.upper())
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type.upper())
    if severity:
        query = query.filter(Incident.severity == severity.upper())
    return query.order_by(Incident.created_at.desc()).limit(limit).all()


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentOut, dependencies=[Depends(get_current_admin)])
def update_incident_status(incident_id: str, payload: IncidentStatusUpdate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if payload.status.upper() not in IncidentStatus.__members__:
        raise HTTPException(status_code=400, detail="Invalid status")
    incident.status = payload.status.upper()
    db.commit()
    db.refresh(incident)
    return incident
