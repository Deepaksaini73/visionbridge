"""
VisionBridge AI Service — Unit Tests for Milestone 5.4: Production Retinal Foundation AI (FLAIR).
Tests domain gating, zero-shot condition retrieval, triage recommendations, and overlay generation.
"""

from pathlib import Path
import numpy as np
import cv2
import pytest

from app.services.retinal_engine import (
    RetinalFoundationEngine,
    get_retinal_engine,
)


def create_synthetic_non_fundus(width=300, height=300):
    """Creates a synthetic selfie or anterior eye photo (blue/gray tones) that should fail fundus gate."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 160
    # Add blue/gray background
    img[:, :, 0] = 120  # Blue
    img[:, :, 1] = 150  # Green
    img[:, :, 2] = 160  # Red
    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()


def create_synthetic_fundus(width=400, height=400):
    """Creates a synthetic fundus-like image with circular mask and high orange/red reflectance."""
    img = np.zeros((height, width, 3), dtype=np.uint8)  # Black border
    cx, cy = width // 2, height // 2
    r = int(min(width, height) * 0.45)
    # Draw orange-red retinal field
    cv2.circle(img, (cx, cy), r, (20, 80, 220), -1)  # BGR: high R, low B
    # Draw optic disc (yellow-white)
    cv2.circle(img, (cx + 60, cy), 22, (120, 230, 250), -1)
    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()


def test_retinal_engine_initialization():
    engine = get_retinal_engine()
    assert engine is not None


def test_domain_gating_rejects_non_fundus():
    engine = get_retinal_engine()
    non_fundus_bytes = create_synthetic_non_fundus()
    result = engine.analyze_image(non_fundus_bytes, "selfie.jpg", "RIGHT", force_inference=False)

    assert result["success"] is False
    assert result["is_fundus_image"] is False
    assert "DOMAIN_MISMATCH" in result["error"]
    assert "disclaimer" in result


def test_domain_gating_accepts_fundus_characteristics():
    engine = get_retinal_engine()
    fundus_bytes = create_synthetic_fundus()
    nparr = np.frombuffer(fundus_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    is_fundus, details = engine.validate_fundus_domain(img_rgb)
    assert is_fundus is True
    assert details["red_to_blue_ratio"] > 1.65


def test_real_fundus_sample_inference():
    """Tests authentic sample normal_sample.png with full FLAIR zero-shot inference."""
    sample_path = Path(__file__).resolve().parent.parent / "research" / "flair_poc" / "FLAIR" / "documents" / "normal_sample.png"
    if not sample_path.exists():
        pytest.skip(f"normal_sample.png not found at {sample_path}.")

    with open(sample_path, "rb") as f:
        image_bytes = f.read()

    engine = get_retinal_engine()
    result = engine.analyze_image(image_bytes, "normal_sample.png", "RIGHT")

    assert result["success"] is True
    assert result["is_fundus_image"] is True
    assert "primary_assessment" in result
    assert "clinical_categories" in result
    assert "decision_support" in result
    assert "overlay_rgba_base64" in result
    assert result["overlay_rgba_base64"].startswith("data:image/png;base64,")

    # Verify model correctly identified normal fundus as top condition
    top_cond = result["primary_assessment"]["top_condition"]
    assert "normal" in top_cond.lower()


def test_retinal_routes_via_testclient():
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)

    # 1. Test status route
    status_res = client.get("/api/v1/retinal/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "ONLINE"
    assert "clinical_disease_categories" in status_data
    assert "FLAIR" in status_data["model_name"]

    # 2. Test analyze route with non-fundus (domain gate rejection)
    non_fundus = create_synthetic_non_fundus()
    files = {"file": ("selfie.png", non_fundus, "image/png")}
    reject_res = client.post("/api/v1/retinal/analyze", files=files)
    assert reject_res.status_code == 200
    reject_data = reject_res.json()
    assert reject_data["success"] is False
    assert reject_data["is_fundus_image"] is False
    assert "DOMAIN_MISMATCH" in reject_data["error"]
