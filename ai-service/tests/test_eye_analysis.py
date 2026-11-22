"""
Tests for VisionBridge EyeCapture AI (Milestone 5.1).
Covers:
- /api/v1/eye-analysis/status
- /api/v1/eye-analysis/quality-check (sharp, blurry, underexposed, overexposed captures)
- /api/v1/eye-analysis/segment (4-class segmentation, base64 RGBA overlays, telemetry)
- /api/v1/eye-analysis/analyze (quality gating and forced bypass)
- MOBIUS preprocessor partitioning and metric benchmarks
"""

import io
import numpy as np
from PIL import Image, ImageDraw
import pytest
from fastapi.testclient import TestClient

from app.main import app
from research.eye_capture_ai.preprocessing.dataset_preprocessor import (
    MOBIUSDatasetPreprocessor,
    CLASS_BACKGROUND,
    CLASS_SCLERA,
    CLASS_IRIS,
    CLASS_PUPIL,
)
from research.eye_capture_ai.evaluation.metrics import calculate_iou_and_dice

client = TestClient(app)


def create_synthetic_eye_image(
    size=(300, 300),
    blur=False,
    dark=False,
    glare=False,
) -> bytes:
    """Helper creating synthetic anterior-eye image bytes."""
    w, h = size
    if dark:
        img = Image.new("RGB", (w, h), (10, 10, 12))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()

    if glare:
        img = Image.new("RGB", (w, h), (250, 252, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()

    # Normal anterior eye capture
    img = Image.new("RGB", (w, h), (210, 170, 150))
    draw = ImageDraw.Draw(img)

    cx, cy = w // 2, h // 2
    # Sclera
    draw.ellipse([cx - 100, cy - 45, cx + 100, cy + 45], fill=(240, 240, 245), outline=(130, 90, 80))
    # Iris
    iris_r = 42
    draw.ellipse([cx - iris_r, cy - iris_r, cx + iris_r, cy + iris_r], fill=(55, 38, 25), outline=(20, 15, 10))
    # Pupil
    pupil_r = 16
    draw.ellipse([cx - pupil_r, cy - pupil_r, cx + pupil_r, cy + pupil_r], fill=(12, 10, 15))
    # Glint highlight
    draw.ellipse([cx - 8, cy - 8, cx - 4, cy - 4], fill=(255, 255, 255))

    if blur:
        # Uniform low-pass blur
        img_arr = np.array(img)
        # Extreme average downsampling / upsampling to induce blur
        small = img.resize((32, 32), Image.Resampling.BILINEAR)
        img = small.resize((w, h), Image.Resampling.BILINEAR)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


def test_eye_analysis_status():
    """Verify EyeCapture AI status endpoint reports operational readiness."""
    res = client.get("/api/v1/eye-analysis/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ONLINE"
    assert "EyeCapture AI" in data["module"]
    assert "quality_engine" in data
    assert "segmentation_engine" in data
    assert "regulatory_disclaimer" in data


def test_quality_check_good_image():
    """Verify that a sharp, well-illuminated eye image passes quality check."""
    image_bytes = create_synthetic_eye_image(size=(320, 320))
    res = client.post(
        "/api/v1/eye-analysis/quality-check",
        files={"file": ("good_eye.jpg", image_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_usable"] is True
    assert data["overall_score"] > 55.0
    assert data["status"] in ["USABLE_FOR_ANALYSIS", "INCONCLUSIVE"]
    assert "laplacian_variance" in data["metrics"]


def test_quality_check_blurry_image():
    """Verify that a blurry capture triggers RETAKE_RECOMMENDED with motion/focus guidance."""
    image_bytes = create_synthetic_eye_image(blur=True)
    res = client.post(
        "/api/v1/eye-analysis/quality-check",
        files={"file": ("blurry_eye.jpg", image_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RETAKE_RECOMMENDED"
    assert data["is_usable"] is False
    assert any("blur" in g.lower() or "laplacian" in g.lower() for g in data["recapture_guidance"])


def test_quality_check_dark_image():
    """Verify that an underexposed capture triggers RETAKE_RECOMMENDED with illumination guidance."""
    image_bytes = create_synthetic_eye_image(dark=True)
    res = client.post(
        "/api/v1/eye-analysis/quality-check",
        files={"file": ("dark_eye.jpg", image_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RETAKE_RECOMMENDED"
    assert any("underexposed" in g.lower() or "dark" in g.lower() or "lighting" in g.lower() for g in data["recapture_guidance"])


def test_quality_check_glare_image():
    """Verify that an overexposed capture triggers glare guidance."""
    image_bytes = create_synthetic_eye_image(glare=True)
    res = client.post(
        "/api/v1/eye-analysis/quality-check",
        files={"file": ("glare_eye.jpg", image_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "RETAKE_RECOMMENDED"
    assert any("glare" in g.lower() or "reflection" in g.lower() or "overexposure" in g.lower() for g in data["recapture_guidance"])


def test_ocular_segmentation():
    """Verify 4-class segmentation returns base64 overlays and telemetry."""
    image_bytes = create_synthetic_eye_image(size=(300, 300))
    res = client.post(
        "/api/v1/eye-analysis/segment",
        files={"file": ("test_eye.jpg", image_bytes, "image/jpeg")}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "overlay_rgba_base64" in data
    assert data["overlay_rgba_base64"].startswith("data:image/png;base64,")
    assert "blended_preview_base64" in data
    assert data["blended_preview_base64"].startswith("data:image/jpeg;base64,")
    assert "coverage" in data
    assert "telemetry" in data
    assert data["telemetry"]["iris"]["detected"] is True
    assert data["telemetry"]["pupil"]["detected"] is True
    assert 0.1 <= data["telemetry"]["pupil_to_iris_ratio"] <= 0.8
    assert "disclaimer" in data


def test_full_eye_analysis_pipeline_gating():
    """Verify quality screening gates poor images unless force_segmentation is enabled."""
    dark_bytes = create_synthetic_eye_image(dark=True)

    # 1. Without force_segmentation -> Should halt
    res1 = client.post(
        "/api/v1/eye-analysis/analyze",
        files={"file": ("dark_eye.jpg", dark_bytes, "image/jpeg")}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["halted_due_to_poor_quality"] is True
    assert data1["segmentation"] is None
    assert len(data1["quality"]["recapture_guidance"]) > 0

    # 2. With force_segmentation=True -> Should run segmentation despite poor quality
    res2 = client.post(
        "/api/v1/eye-analysis/analyze?force_segmentation=true",
        files={"file": ("dark_eye.jpg", dark_bytes, "image/jpeg")}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["halted_due_to_poor_quality"] is False
    assert data2["segmentation"] is not None


def test_evaluation_metrics_iou_and_dice():
    """Verify mathematical correctness of mIoU and Dice calculations."""
    mask_a = np.zeros((10, 10), dtype=np.uint8)
    mask_b = np.zeros((10, 10), dtype=np.uint8)

    # Overlapping 4x4 squares for Class 1 (Sclera)
    mask_a[2:6, 2:6] = CLASS_SCLERA
    mask_b[2:6, 2:6] = CLASS_SCLERA

    res = calculate_iou_and_dice(mask_a, mask_b, num_classes=4)
    assert res["mean_iou"] == 1.0
    assert res["mean_dice_f1"] == 1.0
    assert res["pixel_accuracy"] == 1.0


def test_mobius_subject_wise_partitioning():
    """Verify subject-wise partitioning has zero subject overlap."""
    preprocessor = MOBIUSDatasetPreprocessor(
        data_root="dummy_root",
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        random_seed=123,
    )

    # 20 subjects
    subject_map = {f"SUBJ_{i:03d}": [f"SUBJ_{i:03d}_img.jpg"] for i in range(1, 21)}
    splits = preprocessor.partition_subjects(subject_map)

    train_set = set(splits["train"])
    val_set = set(splits["val"])
    test_set = set(splits["test"])

    # Test mutually exclusive
    assert len(train_set.intersection(val_set)) == 0
    assert len(train_set.intersection(test_set)) == 0
    assert len(val_set.intersection(test_set)) == 0
    assert len(train_set) + len(val_set) + len(test_set) == 20
