from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.models.models import Incident, IncidentStatus, RescueOperation, RescueStatus
from app.schemas.schemas import AnalyticsSummary
from app.api.deps import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/analytics", response_model=AnalyticsSummary, dependencies=[Depends(get_current_admin)])
def analytics_summary(db: Session = Depends(get_db)):
    total_incidents = db.query(func.count(Incident.id)).scalar() or 0

    type_rows = db.query(Incident.incident_type, func.count(Incident.id)).group_by(Incident.incident_type).all()
    incidents_by_type = {t.value if hasattr(t, "value") else t: c for t, c in type_rows}

    severity_rows = db.query(Incident.severity, func.count(Incident.id)).group_by(Incident.severity).all()
    risk_distribution = {s.value if hasattr(s, "value") else s: c for s, c in severity_rows}

    active_emergencies = (
        db.query(func.count(Incident.id))
        .filter(Incident.status.in_([IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.VERIFIED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS]))
        .scalar() or 0
    )
    resolved_incidents = (
        db.query(func.count(Incident.id)).filter(Incident.status == IncidentStatus.RESOLVED).scalar() or 0
    )

    resolved_ops = db.query(RescueOperation).filter(RescueOperation.status == RescueStatus.RESOLVED).all()
    response_times = [op.estimated_response_minutes for op in resolved_ops if op.estimated_response_minutes is not None]
    avg_response = round(sum(response_times) / len(response_times), 1) if response_times else None

    return AnalyticsSummary(
        total_incidents=total_incidents,
        incidents_by_type=incidents_by_type,
        average_response_minutes=avg_response,
        active_emergencies=active_emergencies,
        resolved_incidents=resolved_incidents,
        risk_distribution=risk_distribution,
    )
