def test_flood_prediction(client):
    resp = client.post("/api/predictions/flood", json={
        "latitude": 24.86, "longitude": 67.01,
        "rainfall_mm": 120.0, "temperature_c": 30.0, "humidity_pct": 80.0,
        "wind_speed_kmh": 25.0, "pressure_hpa": 1002.0,
        "elevation_m": 20.0, "soil_saturation_pct": 85.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]


def test_fire_prediction(client):
    resp = client.post("/api/predictions/fire", json={
        "latitude": 24.86, "longitude": 67.01,
        "temperature_c": 42.0, "humidity_pct": 15.0,
        "wind_speed_kmh": 40.0, "rainfall_mm": 0.0, "vegetation_index": 0.8,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["risk_level"] in ["LOW", "MODERATE", "HIGH", "CRITICAL"]
