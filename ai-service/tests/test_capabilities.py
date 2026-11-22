from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_capabilities_endpoint():
    """Verify /api/v1/capabilities returns active and planned computer-vision capabilities."""
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "capabilities" in data
    assert data["total_capabilities"] >= 5
    assert data["implemented_count"] >= 5

    cap_ids = [c["id"] for c in data["capabilities"]]
    assert "eye_image_quality" in cap_ids
    assert "eye_detection_localization" in cap_ids
    assert "iris_segmentation" in cap_ids
    assert "pupil_segmentation" in cap_ids
    assert "geometric_eye_analysis" in cap_ids

    # Verify that Milestone 5.1 anterior capabilities are marked IMPLEMENTED
    implemented_ids = [c["id"] for c in data["capabilities"] if c["status"] == "IMPLEMENTED"]
    assert "eye_image_quality" in implemented_ids
    assert "iris_segmentation" in implemented_ids
    assert "pupil_segmentation" in implemented_ids
