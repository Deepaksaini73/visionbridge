"""
VisionBridge EyeCapture AI — Image Quality Assessment Engine.
Milestone 5.1 — Anterior Ocular Capture Suitability.

Combines deterministic computer-vision measurements (Laplacian sharpness,
luminance distribution, contrast RMS, specular clipping) with actionable
recapture guidance for store operators and optometrists.

Ethical & Clinical Boundaries:
- Technical capture suitability only.
- Does NOT diagnose disease or evaluate optical refraction.
- Transparent heuristics ensure reproducible, explainable decisions.
"""

import io
import logging
from typing import Dict, Any, List, Optional
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("visionbridge-ai.quality")

# Status constants
STATUS_USABLE = "USABLE_FOR_ANALYSIS"
STATUS_RETAKE = "RETAKE_RECOMMENDED"
STATUS_INCONCLUSIVE = "INCONCLUSIVE"

# Quality thresholds
MIN_LAPLACIAN_VARIANCE = 85.0       # Threshold below which blur is flagged
OPTIMAL_LAPLACIAN_VARIANCE = 250.0  # Threshold considered crisp focus
MIN_MEAN_LUMINANCE = 48.0           # Underexposed threshold
MAX_MEAN_LUMINANCE = 215.0          # Overexposed threshold
MAX_OVEREXPOSURE_PCT = 16.0         # Max specular glare saturation allowed (%)
MAX_UNDEREXPOSURE_PCT = 35.0        # Max deep shadow percentage allowed (%)
MIN_RMS_CONTRAST = 25.0             # Minimum dynamic range
MIN_IMAGE_DIMENSION = 256           # Minimum pixel dimension


class QualityAssessor:
    """Evaluates smartphone eye capture quality and generates recapture guidance."""

    @staticmethod
    def decode_image_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
        """Decode raw image bytes to an RGB numpy array."""
        try:
            image_arr = np.frombuffer(image_bytes, dtype=np.uint8)
            img_bgr = cv2.imdecode(image_arr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                # Fallback to PIL
                pil_img = Image.open(io.BytesIO(image_bytes))
                return np.array(pil_img.convert("RGB"))
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        except Exception as exc:
            logger.warning("Image decoding failed in quality assessor: %s", exc)
            return None

    @classmethod
    def evaluate(
        cls,
        image_bytes: bytes,
        filename: str = "ocular_image.jpg",
    ) -> Dict[str, Any]:
        """
        Perform complete quality analysis on ocular image bytes.
        Returns structured dictionary conforming to EyeQualityResponse schema.
        """
        img_rgb = cls.decode_image_bytes(image_bytes)
        if img_rgb is None:
            return {
                "status": STATUS_RETAKE,
                "overall_score": 0.0,
                "is_usable": False,
                "filename": filename,
                "sharpness_score": 0.0,
                "exposure_score": 0.0,
                "contrast_score": 0.0,
                "metrics": {
                    "laplacian_variance": 0.0,
                    "mean_luminance": 0.0,
                    "contrast_rms": 0.0,
                    "underexposed_pct": 0.0,
                    "overexposed_pct": 0.0,
                    "resolution": [0, 0],
                },
                "recapture_guidance": [
                    "Corrupt or unreadable image file. Please recapture or select a valid JPEG/PNG."
                ],
                "assessment_method": "opencv_deterministic_metrics",
                "disclaimer": (
                    "Preliminary technical image-quality assistance only. "
                    "Does not diagnose ocular conditions or determine visual acuity."
                ),
            }

        height, width = img_rgb.shape[:2]
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        # 1. Laplacian sharpness / blur assessment
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        laplacian_var = float(laplacian.var())
        sharpness_score = float(np.clip((laplacian_var / OPTIMAL_LAPLACIAN_VARIANCE) * 100.0, 0.0, 100.0))

        # 2. Luminance & Exposure assessment
        mean_lum = float(np.mean(gray))
        underexposed_pct = float(np.sum(gray < 25) / gray.size * 100.0)
        overexposed_pct = float(np.sum(gray > 235) / gray.size * 100.0)

        # Bell-shaped curve around ideal mean luminance (120 - 150)
        lum_dist = abs(mean_lum - 135.0)
        exposure_base = max(0.0, 100.0 - (lum_dist * 0.9))
        exposure_penalty = (overexposed_pct * 1.5) + (underexposed_pct * 0.8)
        exposure_score = float(np.clip(exposure_base - exposure_penalty, 0.0, 100.0))

        # 3. Contrast RMS assessment
        contrast_rms = float(np.std(gray))
        contrast_score = float(np.clip((contrast_rms / 60.0) * 100.0, 0.0, 100.0))

        # 4. Actionable recapture guidance generation
        guidance: List[str] = []
        is_blurry = laplacian_var < MIN_LAPLACIAN_VARIANCE
        is_dark = mean_lum < MIN_MEAN_LUMINANCE or underexposed_pct > MAX_UNDEREXPOSURE_PCT
        is_glaring = mean_lum > MAX_MEAN_LUMINANCE or overexposed_pct > MAX_OVEREXPOSURE_PCT
        is_low_res = min(width, height) < MIN_IMAGE_DIMENSION
        is_low_contrast = contrast_rms < MIN_RMS_CONTRAST

        if is_blurry:
            guidance.append(
                f"Blurry capture detected (Laplacian score: {laplacian_var:.1f}). "
                "Hold smartphone steady, tap screen to lock focus onto the iris, and steady against operator hands."
            )
        if is_dark:
            guidance.append(
                f"Underexposed capture (Brightness: {mean_lum:.1f}/255). "
                "Increase ambient room lighting or bring a diffused light source closer from an oblique angle."
            )
        if is_glaring:
            guidance.append(
                f"Excessive glare/specular reflection detected ({overexposed_pct:.1f}% saturated pixels). "
                "Reposition light source to avoid direct flash reflections over the pupil."
            )
        if is_low_res:
            guidance.append(
                f"Low resolution capture ({width}x{height}px). "
                "Position smartphone camera closer to the eye (15-20 cm) or use optical zoom if available."
            )
        if is_low_contrast and not is_dark and not is_glaring:
            guidance.append(
                "Low ocular contrast detected. Ensure the eyelid is held gently open to reveal clear scleral margin."
            )

        # 5. Composite overall score
        # Weighted: 40% sharpness, 35% exposure, 25% contrast
        overall_score = float(
            (sharpness_score * 0.40) + (exposure_score * 0.35) + (contrast_score * 0.25)
        )

        # Classification
        if is_blurry or is_dark or (overexposed_pct > 22.0) or is_low_res or overall_score < 48.0:
            status = STATUS_RETAKE
            is_usable = False
        elif overall_score >= 68.0 and not guidance:
            status = STATUS_USABLE
            is_usable = True
        else:
            status = STATUS_INCONCLUSIVE
            is_usable = overall_score >= 55.0
            if not guidance:
                guidance.append("Capture is borderline acceptable. Optometrist visual inspection recommended.")

        return {
            "status": status,
            "overall_score": round(overall_score, 1),
            "is_usable": is_usable,
            "filename": filename,
            "sharpness_score": round(sharpness_score, 1),
            "exposure_score": round(exposure_score, 1),
            "contrast_score": round(contrast_score, 1),
            "metrics": {
                "laplacian_variance": round(laplacian_var, 2),
                "mean_luminance": round(mean_lum, 2),
                "contrast_rms": round(contrast_rms, 2),
                "underexposed_pct": round(underexposed_pct, 2),
                "overexposed_pct": round(overexposed_pct, 2),
                "resolution": [width, height],
            },
            "recapture_guidance": guidance,
            "assessment_method": "opencv_deterministic_metrics",
            "disclaimer": (
                "Preliminary technical image-quality assistance only. "
                "Does not diagnose ocular conditions or determine visual acuity."
            ),
        }
