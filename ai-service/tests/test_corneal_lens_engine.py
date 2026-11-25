"""
Unit tests for VisionBridge Milestone 5.5: Lens & Corneal Clarity Engine.
Validates pupillary lens opacity (Cataract screening) and corneal limbal arcus (Arcus Senilis).
"""

import io
import pytest
import numpy as np
import cv2
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.corneal_lens_engine import CornealLensEngine, get_corneal_lens_engine

client = TestClient(app)


def create_synthetic_clear_eye(size: int = 500) -> bytes:
    """Creates a synthetic clear anterior eye: pale sclera, medium iris, dark transparent pupil."""
    img = np.full((size, size, 3), (230, 230, 235), dtype=np.uint8)
    cx, cy = size // 2, size // 2
    iris_r = 130
    pupil_r = 45

    # Iris (Hazel/Brown: ~85-110 luminance)
    cv2.circle(img, (cx, cy), iris_r, (70, 95, 120), -1)

    # Dark clear pupil (Luminance < 30)
    cv2.circle(img, (cx, cy), pupil_r, (20, 20, 20), -1)

    # Slight corneal reflection highlight
    cv2.circle(img, (cx + 12, cy - 10), 4, (255, 255, 255), -1)

    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def create_synthetic_cataract_eye(size: int = 500) -> bytes:
    """Creates a synthetic eye with dense pupillary cataract opacification."""
    img = np.full((size, size, 3), (230, 230, 235), dtype=np.uint8)
    cx, cy = size // 2, size // 2
    iris_r = 130
    pupil_r = 45

    # Iris
    cv2.circle(img, (cx, cy), iris_r, (70, 95, 120), -1)

    # Opaque / cloudy pupillary aperture (Dense white-amber nuclear cataract: ~160-190 luminance)
    cv2.circle(img, (cx, cy), pupil_r, (160, 165, 175), -1)

    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def create_synthetic_arcus_senilis_eye(size: int = 500) -> bytes:
    """Creates a synthetic eye with prominent peripheral limbal corneal arcus ring."""
    img = np.full((size, size, 3), (230, 230, 235), dtype=np.uint8)
    cx, cy = size // 2, size // 2
    iris_r = 130
    pupil_r = 45

    # Iris
    cv2.circle(img, (cx, cy), iris_r, (60, 80, 100), -1)

    # Clear pupil
    cv2.circle(img, (cx, cy), pupil_r, (20, 20, 20), -1)

    # Dense circumferential corneal arcus lipid ring (in peripheral cornea: r in [0.82, 0.94] * iris_r)
    cv2.circle(img, (cx, cy), int(iris_r * 0.88), (215, 220, 225), 8)

    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def test_corneal_lens_engine_initialization():
    engine = get_corneal_lens_engine()
    assert isinstance(engine, CornealLensEngine)
    assert engine.adult_iris_diameter_mm == 11.7


def test_normal_clear_crystalline_lens():
    engine = get_corneal_lens_engine()
    image_bytes = create_synthetic_clear_eye()
    result = engine.analyze_image(image_bytes, filename="clear_eye.jpg", eye_side="RIGHT")

    assert result["success"] is True
    assert result["eye_side"] == "RIGHT"
    assert "lens_opacity" in result
    assert "corneal_arcus" in result

    lens = result["lens_opacity"]
    assert lens["cataract_grade"] == 0
    assert lens["severity_label"] == "NORMAL_CLEAR"
    assert lens["opacity_area_fraction_pct"] < 15.0

    arcus = result["corneal_arcus"]
    assert arcus["arcus_detected"] is False

    assert result["triage"]["urgency"] == "NORMAL_CLEAR"
    assert result["triage"]["referral_indicated"] is False
    assert result["overlay_rgba_base64"].startswith("data:image/png;base64,")


def test_dense_cataract_opacity():
    engine = get_corneal_lens_engine()
    image_bytes = create_synthetic_cataract_eye()
    result = engine.analyze_image(image_bytes, filename="cataract_eye.jpg", eye_side="LEFT")

    assert result["success"] is True
    lens = result["lens_opacity"]
    # Dense opacity should be detected as Grade 2 or 3
    assert lens["cataract_grade"] >= 2
    assert lens["opacity_area_fraction_pct"] > 30.0
    assert result["triage"]["referral_indicated"] is True


def test_corneal_arcus_detection():
    engine = get_corneal_lens_engine()
    image_bytes = create_synthetic_arcus_senilis_eye()
    result = engine.analyze_image(image_bytes, filename="arcus_eye.jpg")

    assert result["success"] is True
    arcus = result["corneal_arcus"]
    assert arcus["arcus_detected"] is True
    assert arcus["extent_degrees"] > 60
    assert "arcus" in arcus["severity_grade"].lower() or "grade" in arcus["severity_grade"].lower()


def test_invalid_image_handling():
    engine = get_corneal_lens_engine()
    with pytest.raises(ValueError, match="Failed to decode"):
        engine.analyze_image(b"not_a_real_image_raster_bytes")


def test_clarity_routes_via_testclient():
    # 1. Status route
    status_resp = client.get("/api/v1/clarity/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["status"] == "ONLINE"
    assert "VisionBridge" in status_data["module"]

    # 2. Analyze route
    img_bytes = create_synthetic_clear_eye()
    analyze_resp = client.post(
        "/api/v1/clarity/analyze",
        files={"file": ("synthetic_eye.jpg", img_bytes, "image/jpeg")},
        data={"eye_side": "RIGHT"}
    )
    assert analyze_resp.status_code == 200
    data = analyze_resp.json()
    assert data["success"] is True
    assert "lens_opacity" in data
    assert "corneal_arcus" in data
    assert data["triage"]["urgency"] == "NORMAL_CLEAR"
