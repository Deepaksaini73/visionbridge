from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify /health returns 200 with service metadata and python version."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "VisionBridge AI" in data["service"]
    assert "api_version" in data
    assert "python_version" in data
    assert "timestamp" in data


def test_root_endpoint():
    """Verify root / returns 200 and points to /docs and /health."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert data["documentation"] == "/docs"
    assert data["health_check"] == "/health"
