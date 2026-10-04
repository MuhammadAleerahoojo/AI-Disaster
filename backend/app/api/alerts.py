from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertOut
from app.api.deps import get_current_admin

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertOut])
def list_alerts(unread_only: bool = False, severity: str | None = None, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if unread_only:
        query = query.filter(Alert.is_read.is_(False))
    if severity:
        query = query.filter(Alert.severity == severity.upper())
    return query.order_by(Alert.created_at.desc()).limit(limit).all()


@router.patch("/{alert_id}/read", response_model=AlertOut)
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return alert
