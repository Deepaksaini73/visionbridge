from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_capabilities_endpoint():
    """Verify /api/v1/capabilities returns the planned computer-vision capabilities."""
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert "capabilities" in data
    assert data["total_capabilities"] >= 5
    assert data["implemented_count"] == 0

    cap_ids = [c["id"] for c in data["capabilities"]]
    assert "eye_image_quality" in cap_ids
    assert "eye_detection_localization" in cap_ids
    assert "iris_segmentation" in cap_ids
    assert "pupil_segmentation" in cap_ids
    assert "geometric_eye_analysis" in cap_ids

    # Ensure all statuses are NOT_IMPLEMENTED as per Milestone 5.0 specifications
    for c in data["capabilities"]:
        assert c["status"] == "NOT_IMPLEMENTED"
