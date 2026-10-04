"""
Populates the database with clearly-flagged DEMO data so the app is not
empty on first launch. Safe to re-run (checks for existing records first).

Run:
    python seed.py
"""
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal, Base, engine
from app.models.models import (
    User, UserRole, Incident, IncidentType, IncidentStatus, RiskLevel,
    Alert, AlertType, EarthquakeEvent, FireEvent, RescueTeam, RescueOperation, RescueStatus,
)
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

now = datetime.now(timezone.utc)


def get_or_create_admin():
    admin = db.query(User).filter(User.email == "admin@disasterplatform.dev").first()
    if not admin:
        admin = User(
            full_name="Platform Admin",
            email="admin@disasterplatform.dev",
            hashed_password=hash_password("Admin@123"),
            role=UserRole.ADMIN,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Created admin user: admin@disasterplatform.dev / Admin@123")
    return admin


def get_or_create_demo_user():
    user = db.query(User).filter(User.email == "demo@disasterplatform.dev").first()
    if not user:
        user = User(
            full_name="Demo Citizen",
            email="demo@disasterplatform.dev",
            hashed_password=hash_password("Demo@123"),
            role=UserRole.USER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Created demo user: demo@disasterplatform.dev / Demo@123")
    return user


def seed_rescue_teams():
    if db.query(RescueTeam).count() > 0:
        return
    teams = [
        RescueTeam(name="Alpha Flood Response Unit", specialization="Flood & Water Rescue", contact_number="+92-300-1000001"),
        RescueTeam(name="Bravo Fire & Hazmat Unit", specialization="Fire & Hazmat", contact_number="+92-300-1000002"),
        RescueTeam(name="Charlie Urban Search & Rescue", specialization="Earthquake / Collapsed Structures", contact_number="+92-300-1000003"),
        RescueTeam(name="Delta Medical Response Team", specialization="Medical Emergency", contact_number="+92-300-1000004"),
    ]
    db.add_all(teams)
    db.commit()
    print(f"Seeded {len(teams)} rescue teams")
    return teams


def seed_incidents(demo_user):
    if db.query(Incident).count() > 0:
        return db.query(Incident).all()
    samples = [
        ("FLOOD", "Street flooding near riverside colony, water rising fast.", 24.8607, 67.0011, "Karachi, Riverside Colony", "HIGH", 12),
        ("FIRE", "Warehouse fire reported with heavy smoke visible.", 24.8945, 67.0369, "Karachi, SITE Industrial Area", "CRITICAL", 3),
        ("EARTHQUAKE_DAMAGE", "Cracks appeared in building wall after tremor.", 33.6844, 73.0479, "Islamabad, F-8 Sector", "MODERATE", 6),
        ("MEDICAL_EMERGENCY", "Elderly person collapsed, needs urgent medical help.", 31.5204, 74.3587, "Lahore, Gulberg", "HIGH", 1),
        ("TRAPPED_PERSON", "Person trapped under debris after wall collapse.", 33.6844, 73.0491, "Islamabad, G-9 Sector", "CRITICAL", 1),
        ("INFRASTRUCTURE_DAMAGE", "Bridge showing structural damage after heavy rain.", 24.9056, 67.0822, "Karachi, Korangi", "MODERATE", 0),
    ]
    incidents = []
    for i, (itype, desc, lat, lon, label, sev, affected) in enumerate(samples):
        inc = Incident(
            incident_code=f"INC-DEMO-{i+1:03d}",
            reporter_id=demo_user.id,
            incident_type=itype,
            description=desc,
            latitude=lat,
            longitude=lon,
            location_label=label,
            severity=sev,
            affected_people=affected,
            status=[IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW, IncidentStatus.VERIFIED, IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED][i % 6],
            created_at=now - timedelta(hours=i * 5),
        )
        db.add(inc)
        incidents.append(inc)
    db.commit()
    for inc in incidents:
        db.refresh(inc)
    print(f"Seeded {len(incidents)} demo incidents")
    return incidents


def seed_rescue_operations(incidents, teams):
    if db.query(RescueOperation).count() > 0 or not teams:
        return
    ops = []
    statuses = [RescueStatus.PENDING, RescueStatus.DISPATCHED, RescueStatus.EN_ROUTE, RescueStatus.ON_SCENE, RescueStatus.RESOLVED]
    for i, inc in enumerate(incidents[:4]):
        op = RescueOperation(
            incident_id=inc.id,
            team_id=teams[i % len(teams)].id,
            priority=inc.severity,
            status=statuses[i % len(statuses)],
            estimated_response_minutes=15 + i * 5,
        )
        db.add(op)
        ops.append(op)
    db.commit()
    print(f"Seeded {len(ops)} rescue operations")


def seed_alerts():
    if db.query(Alert).count() > 0:
        return
    alerts = [
        Alert(title="Flash Flood Warning", disaster_type="FLOOD", severity=RiskLevel.HIGH,
              location_label="Karachi, Riverside Colony", latitude=24.8607, longitude=67.0011,
              recommended_action="Move to higher ground. Avoid low-lying roads.", alert_type=AlertType.IN_APP, is_demo_data=True),
        Alert(title="Elevated Fire Risk", disaster_type="FIRE", severity=RiskLevel.CRITICAL,
              location_label="Karachi, SITE Industrial Area", latitude=24.8945, longitude=67.0369,
              recommended_action="Avoid the area. Keep emergency exits clear.", alert_type=AlertType.IN_APP, is_demo_data=True),
        Alert(title="Seismic Activity Detected", disaster_type="EARTHQUAKE", severity=RiskLevel.MODERATE,
              location_label="Islamabad Region", latitude=33.6844, longitude=73.0479,
              recommended_action="Check structures for damage. Be prepared for aftershocks.", alert_type=AlertType.IN_APP, is_demo_data=True),
    ]
    db.add_all(alerts)
    db.commit()
    print(f"Seeded {len(alerts)} demo alerts")


def seed_earthquakes():
    if db.query(EarthquakeEvent).count() > 0:
        return
    quakes = [
        ("Near Islamabad, Pakistan", 4.6, 10.0, 33.6844, 73.0479),
        ("Near Quetta, Pakistan", 5.1, 15.0, 30.1798, 66.9750),
        ("Near Karachi Coast, Pakistan", 3.8, 25.0, 24.8, 66.9),
        ("Hindu Kush Region, Afghanistan", 5.6, 120.0, 36.3, 71.0),
    ]
    for i, (place, mag, depth, lat, lon) in enumerate(quakes):
        db.add(EarthquakeEvent(
            usgs_id=f"demo-{i+1}", place=place, magnitude=mag, depth_km=depth,
            latitude=lat, longitude=lon, event_time=now - timedelta(hours=i * 8), is_demo_data=True,
        ))
    db.commit()
    print(f"Seeded {len(quakes)} demo earthquake events (used only if live USGS fetch fails)")


def seed_fires():
    if db.query(FireEvent).count() > 0:
        return
    hotspots = [
        (24.90, 67.05, 320.5, "high", "2026-09-10"),
        (31.55, 74.30, 310.2, "nominal", "2026-09-10"),
        (33.70, 73.05, 298.7, "low", "2026-09-09"),
    ]
    for lat, lon, brightness, conf, date in hotspots:
        db.add(FireEvent(latitude=lat, longitude=lon, brightness=brightness, confidence=conf, acq_date=date, is_demo_data=True))
    db.commit()
    print(f"Seeded {len(hotspots)} demo fire hotspots (used only if NASA FIRMS is not configured)")


if __name__ == "__main__":
    get_or_create_admin()
    demo_user = get_or_create_demo_user()
    teams = seed_rescue_teams() or db.query(RescueTeam).all()
    incidents = seed_incidents(demo_user)
    seed_rescue_operations(incidents, teams)
    seed_alerts()
    seed_earthquakes()
    seed_fires()
    db.close()
    print("\nSeeding complete.")
