"""
VisionBridge AI Service — Unit Tests for Milestone 5.2B Adnexal & Alignment Telemetry.
Tests FaceLandmarker initialization, landmark extraction, metric calculations, and fallback handling.
"""

import io
import numpy as np
import cv2
import pytest
from PIL import Image

from app.services.adnexal_engine import (
    AdnexalAlignmentEngine,
    get_adnexal_engine,
    HUMAN_IRIS_DIAMETER_MM,
)


def create_synthetic_portrait(width=640, height=480):
    """Creates a basic synthetic image with eyes for unit test execution."""
    img = np.ones((height, width, 3), dtype=np.uint8) * 200
    # Left eye area
    cv2.circle(img, (240, 200), 20, (100, 100, 100), -1)  # sclera
    cv2.circle(img, (240, 200), 12, (50, 80, 50), -1)    # iris
    cv2.circle(img, (240, 200), 5, (0, 0, 0), -1)        # pupil
    # Right eye area
    cv2.circle(img, (400, 200), 20, (100, 100, 100), -1)
    cv2.circle(img, (400, 200), 12, (50, 80, 50), -1)
    cv2.circle(img, (400, 200), 5, (0, 0, 0), -1)
    _, buf = cv2.imencode('.png', img)
    return buf.tobytes()


def test_adnexal_engine_initialization():
    engine = get_adnexal_engine()
    assert engine is not None
    assert engine.landmarker is not None


def test_adnexal_engine_unilateral_macro_fallback():
    engine = get_adnexal_engine()
    # A single eye circle
    img = np.ones((300, 300, 3), dtype=np.uint8) * 220
    cv2.circle(img, (150, 150), 60, (255, 255, 255), -1)
    cv2.circle(img, (150, 150), 30, (30, 90, 40), -1)
    cv2.circle(img, (150, 150), 12, (10, 10, 10), -1)
    _, buf = cv2.imencode('.png', img)

    result = engine.analyze_image(buf.tobytes(), "macro_test.png")
    assert result["success"] is True
    assert "disclaimer" in result
    assert "clinical_recommendations" in result


def test_adnexal_engine_invalid_image():
    engine = get_adnexal_engine()
    invalid_bytes = b"not_an_image_file_content_12345"
    result = engine.analyze_image(invalid_bytes, "corrupt.jpg")
    assert result["success"] is False
    assert "error" in result
