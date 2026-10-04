def test_create_and_list_incident(client):
    resp = client.post("/api/incidents", data={
        "incident_type": "FIRE",
        "description": "Test fire incident for pytest",
        "latitude": "24.86",
        "longitude": "67.01",
        "location_label": "Test Location",
        "severity": "HIGH",
        "affected_people": "2",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["incident_code"].startswith("INC-")
    assert data["status"] == "REPORTED"

    resp2 = client.get("/api/incidents")
    assert resp2.status_code == 200
    assert any(i["id"] == data["id"] for i in resp2.json())


def test_alert_logic_thresholds():
    from app.ml.predictor import risk_level_from_score
    assert risk_level_from_score(0.1) == "LOW"
    assert risk_level_from_score(0.4) == "MODERATE"
    assert risk_level_from_score(0.65) == "HIGH"
    assert risk_level_from_score(0.9) == "CRITICAL"
