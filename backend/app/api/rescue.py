from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import RescueOperation, RescueTeam, Incident, IncidentStatus
from app.schemas.schemas import (
    RescueOperationCreate, RescueOperationUpdate, RescueOperationOut, RescueTeamOut,
)
from app.api.deps import get_current_admin

router = APIRouter(prefix="/api/rescue", tags=["Rescue"])


@router.get("/teams", response_model=list[RescueTeamOut])
def list_teams(db: Session = Depends(get_db)):
    return db.query(RescueTeam).all()


@router.get("/operations", response_model=list[RescueOperationOut])
def list_operations(status_filter: str | None = None, db: Session = Depends(get_db)):
    query = db.query(RescueOperation)
    if status_filter:
        query = query.filter(RescueOperation.status == status_filter.upper())
    return query.order_by(RescueOperation.created_at.desc()).all()


@router.post("/operations", response_model=RescueOperationOut, status_code=201, dependencies=[Depends(get_current_admin)])
def create_operation(payload: RescueOperationCreate, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    operation = RescueOperation(
        incident_id=payload.incident_id,
        team_id=payload.team_id,
        priority=payload.priority.upper() if payload.priority else "MODERATE",
        estimated_response_minutes=payload.estimated_response_minutes,
    )
    incident.status = IncidentStatus.ASSIGNED
    db.add(operation)
    db.commit()
    db.refresh(operation)
    return operation


@router.patch("/operations/{operation_id}", response_model=RescueOperationOut, dependencies=[Depends(get_current_admin)])
def update_operation(operation_id: str, payload: RescueOperationUpdate, db: Session = Depends(get_db)):
    operation = db.query(RescueOperation).filter(RescueOperation.id == operation_id).first()
    if not operation:
        raise HTTPException(status_code=404, detail="Rescue operation not found")

    if payload.status:
        operation.status = payload.status.upper()
        incident = db.query(Incident).filter(Incident.id == operation.incident_id).first()
        if incident:
            if payload.status.upper() == "RESOLVED":
                incident.status = IncidentStatus.RESOLVED
            elif payload.status.upper() in ("DISPATCHED", "EN_ROUTE", "ON_SCENE"):
                incident.status = IncidentStatus.IN_PROGRESS
    if payload.team_id is not None:
        operation.team_id = payload.team_id
    if payload.priority:
        operation.priority = payload.priority.upper()
    if payload.estimated_response_minutes is not None:
        operation.estimated_response_minutes = payload.estimated_response_minutes

    db.commit()
    db.refresh(operation)
    return operation
