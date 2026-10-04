from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.database.session import Base, engine
from app.models import models  # noqa: F401 ensures models are registered
from app.api import auth, predictions, hazards, weather, risk, incidents, alerts, rescue, chat, admin, health

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified multi-hazard disaster intelligence and emergency response platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(hazards.router)
app.include_router(weather.router)
app.include_router(risk.router)
app.include_router(incidents.router)
app.include_router(alerts.router)
app.include_router(rescue.router)
app.include_router(chat.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": settings.APP_NAME, "docs": "/docs"}
