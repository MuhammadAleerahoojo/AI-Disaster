from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])


@router.get("/api/health")
def health_check():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}
