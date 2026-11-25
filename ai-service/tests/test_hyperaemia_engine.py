"""
VisionBridge AI Service — Unit Tests for Milestone 5.3: Hyperaemia & Pterygium Engine
Tests Efron scale mapping, vascular density quantification, limbal encroachment, and overlay generation.
"""

import numpy as np
import cv2
import pytest

from app.services.hyperaemia_engine import (
    HyperaemiaAndPterygiumEngine,
    get_hyperaemia_engine,
)


def create_synthetic_anterior_eye(width=400, height=300, inject_vessels=False, add_pterygium=False):
    """Generates synthetic anterior eye image with iris, pupil, sclera, and optional pathology."""
    # Skin background (BGR: Red is highest, Blue is lowest)
    img = np.ones((height, width, 3), dtype=np.uint8)
    img[:, :] = (120, 160, 215)  # BGR skin tone (R=215, G=160, B=120, B/R = 0.55)

    cx, cy = width // 2, height // 2
    iris_r = 70
    pupil_r = 25

    # White bulbar sclera oval
    cv2.ellipse(img, (cx, cy), (160, 85), 0, 0, 360, (240, 245, 245), -1)

    # Injected vessels in sclera if requested
    if inject_vessels:
        # Draw dense red vessel lines on both nasal and temporal sclera
        for i in range(25):
            # Nasal side
            x1 = cx - 145 + i * 4
            y1 = cy - 35 + (i % 6) * 12
            x2 = cx - 75 + i * 3
            y2 = cy + 20 - (i % 4) * 10
            cv2.line(img, (x1, y1), (x2, y2), (20, 20, 230), 3)  # BGR red
            # Temporal side
            x3 = cx + 75 + i * 3
            y3 = cy - 30 + (i % 5) * 12
            x4 = cx + 145 - i * 2
            y4 = cy + 25 - (i % 6) * 10
            cv2.line(img, (x3, y3), (x4, y4), (20, 20, 230), 3)

    # Iris
    cv2.circle(img, (cx, cy), iris_r, (60, 100, 40), -1)  # Hazel iris
    # Pupil
    cv2.circle(img, (cx, cy), pupil_r, (15, 15, 15), -1)

    # Pterygium lesion encroaching across nasal limbus
    if add_pterygium:
        # Triangular fleshy growth from x = cx - iris_r - 20 to apex inside cornea
        apex_x = cx - iris_r + 25  # 25px encroachment inside limbus
        pts = np.array([
            [cx - iris_r - 30, cy - 20],
            [cx - iris_r - 30, cy + 20],
            [apex_x, cy]
        ], np.int32)
        cv2.fillPoly(img, [pts], (40, 60, 200))  # BGR reddish-fleshy

    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()


def test_hyperaemia_engine_initialization():
    engine = get_hyperaemia_engine()
    assert engine is not None
    assert engine.adult_iris_diameter_mm == 11.7


def test_normal_clear_eye():
    engine = get_hyperaemia_engine()
    normal_bytes = create_synthetic_anterior_eye(inject_vessels=False, add_pterygium=False)
    result = engine.analyze_image(normal_bytes, "normal_eye.png", "RIGHT")
    print("DEBUG NORMAL HYPERAEMIA:", result["hyperaemia"])

    assert result["success"] is True
    assert "hyperaemia" in result
    assert "pterygium" in result
    assert "overlay_rgba_base64" in result
    assert result["overlay_rgba_base64"].startswith("data:image/png;base64,")

    # In a clear normal synthetic eye, vascular density should be low (<13%)
    assert result["hyperaemia"]["efron_grade"] in [0, 1]
    assert result["pterygium"]["detected"] is False
    assert result["pterygium"]["limbic_invasion_mm"] == 0.0


def test_injected_vessels_hyperaemia():
    engine = get_hyperaemia_engine()
    red_bytes = create_synthetic_anterior_eye(inject_vessels=True, add_pterygium=False)
    result = engine.analyze_image(red_bytes, "red_eye.png", "RIGHT")
    print("DEBUG HYPERAEMIA:", result["hyperaemia"])

    assert result["success"] is True
    assert result["hyperaemia"]["evaluated"] is True
    assert result["hyperaemia"]["vascular_density_pct"] > 0.0
    assert result["hyperaemia"]["efron_grade"] >= 1


def test_pterygium_encroachment():
    engine = get_hyperaemia_engine()
    pterygium_bytes = create_synthetic_anterior_eye(inject_vessels=False, add_pterygium=True)
    result = engine.analyze_image(pterygium_bytes, "pterygium_eye.png", "RIGHT")

    assert result["success"] is True
    assert result["pterygium"]["detected"] is True
    assert result["pterygium"]["limbic_invasion_mm"] > 0.0
    assert result["pterygium"]["encroachment_zone"] == "NASAL"
    assert result["pterygium"]["severity_grade"] in ["GRADE_1_MILD", "GRADE_2_MODERATE", "GRADE_3_ADVANCED"]


def test_invalid_image_handling():
    engine = get_hyperaemia_engine()
    with pytest.raises(ValueError):
        engine.analyze_image(b"not_valid_image_bytes", "invalid.jpg")


def test_hyperaemia_routes_via_testclient():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Test status route
    status_res = client.get("/api/v1/hyperaemia/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "ONLINE"
    assert "metrics_computed" in status_data

    # 2. Test analyze route
    eye_bytes = create_synthetic_anterior_eye(inject_vessels=True, add_pterygium=True)
    files = {"file": ("test_anterior.png", eye_bytes, "image/png")}
    analyze_res = client.post("/api/v1/hyperaemia/analyze?eye_side=RIGHT", files=files)
    assert analyze_res.status_code == 200
    analyze_data = analyze_res.json()
    assert analyze_data["success"] is True
    assert "hyperaemia" in analyze_data
    assert "pterygium" in analyze_data
    assert analyze_data["hyperaemia"]["evaluated"] is True
    assert analyze_data["pterygium"]["detected"] is True
    assert analyze_data["eye_side"] == "RIGHT"
