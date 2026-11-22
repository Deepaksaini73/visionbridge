"""
VisionBridge EyeCapture AI — Adnexal & Alignment Telemetry Engine.
Milestone 5.2B: Eyelid Margin Reflex Distances (MRD1/MRD2), Palpebral Fissure Height (Ptosis),
Corneal Light Reflex (Strabismus), and Interpupillary Distance (IPD).

Dual-Mode Architecture:
1. Bilateral Mode (MediaPipe FaceLandmarker): When full face / bilateral eyes are visible.
   Computes bilateral PFH, MRD1, MRD2, eyelid asymmetry %, IPD, and Hirschberg alignment.
2. Unilateral Macro Mode (Ocular Segmentation Fallback): When a close-up single eye is uploaded.
   Extracts anatomical eyelid margins, iris reference diameter (11.7mm), and calibrated single-eye MRD1/MRD2/PFH.

Operates strictly as a Clinical Decision Support (CDS) tool.
"""

import io
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import cv2
from PIL import Image

import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python import BaseOptions

from app.services.segmentation_engine import (
    get_segmentation_engine,
    CLASS_SCLERA,
    CLASS_IRIS,
    CLASS_PUPIL,
)

logger = logging.getLogger("visionbridge-ai.adnexal")

# Average adult anatomical horizontal iris diameter (White-to-White) in millimeters
HUMAN_IRIS_DIAMETER_MM = 11.7

# Model task path
MODEL_TASK_PATH = Path(__file__).parent.parent / "models" / "face_landmarker.task"

# MediaPipe 478-Landmark Topology indices
R_IRIS_CENTER = 468
R_IRIS_RIGHT = 469
R_IRIS_TOP = 470
R_IRIS_LEFT = 471
R_IRIS_BOTTOM = 472
R_EYELID_UPPER_APEX = 159
R_EYELID_LOWER_NADIR = 145
R_INNER_CANTHUS = 133
R_OUTER_CANTHUS = 33
R_UPPER_EYELID_CONTOUR = [33, 246, 161, 160, 159, 158, 157, 173, 133]
R_LOWER_EYELID_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133]

L_IRIS_CENTER = 473
L_IRIS_RIGHT = 474
L_IRIS_TOP = 475
L_IRIS_LEFT = 476
L_IRIS_BOTTOM = 477
L_EYELID_UPPER_APEX = 386
L_EYELID_LOWER_NADIR = 374
L_INNER_CANTHUS = 362
L_OUTER_CANTHUS = 263
L_UPPER_EYELID_CONTOUR = [362, 398, 384, 385, 386, 387, 388, 466, 263]
L_LOWER_EYELID_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263]


class AdnexalAlignmentEngine:
    """
    Evaluates ocular adnexa, eyelid position (MRD1, MRD2, PFH),
    facial asymmetry (Ptosis screening), and optical axis alignment (Strabismus).
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = Path(model_path) if model_path else MODEL_TASK_PATH
        self.landmarker = None
        self._init_landmarker()

    def _init_landmarker(self):
        if not self.model_path.exists():
            logger.warning(f"MediaPipe task model not found at {self.model_path}. MediaPipe mode disabled.")
            return

        try:
            options = vision.FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(self.model_path)),
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                min_face_detection_confidence=0.4,
                min_face_presence_confidence=0.4,
                min_tracking_confidence=0.4,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            self.landmarker = vision.FaceLandmarker.create_from_options(options)
            logger.info("AdnexalAlignmentEngine initialized successfully with FaceLandmarker.")
        except Exception as exc:
            logger.error(f"Failed to initialize FaceLandmarker: {exc}")

    def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "portrait_capture.jpg",
        eye_side: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes an adnexal/facial photograph and returns quantitative clinical telemetry.
        """
        # 1. Decode image bytes
        img_arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            try:
                pil_img = Image.open(io.BytesIO(image_bytes))
                img_rgb = np.array(pil_img.convert("RGB"))
            except Exception as e:
                return {
                    "success": False,
                    "detected": False,
                    "filename": filename,
                    "error": f"Failed to decode image bytes: {str(e)}",
                }
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        orig_h, orig_w = img_rgb.shape[:2]

        # Determine target eye side if unilateral
        target_side = (eye_side or "").upper()
        if not target_side or target_side not in ("RIGHT", "LEFT", "OD", "OS"):
            fn_upper = filename.upper()
            if any(k in fn_upper for k in ["-RI", "_RI", "RIGHT", "OD"]):
                target_side = "RIGHT"
            elif any(k in fn_upper for k in ["-LE", "_LE", "LEFT", "OS"]):
                target_side = "LEFT"
            else:
                target_side = "UNILATERAL"
        elif target_side == "OD":
            target_side = "RIGHT"
        elif target_side == "OS":
            target_side = "LEFT"

        # 2. Try MediaPipe Bilateral FaceLandmarker first
        if self.landmarker is not None:
            import mediapipe as mp
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
            detection_result = self.landmarker.detect(mp_image)

            if detection_result.face_landmarks and len(detection_result.face_landmarks) > 0:
                return self._process_bilateral_mediapipe(img_rgb, detection_result.face_landmarks[0], filename)

        # 3. Fallback: Unilateral Macro Ocular Analysis (single eye close-up)
        return self._process_unilateral_macro(img_rgb, image_bytes, filename, target_side)

    def _process_bilateral_mediapipe(
        self,
        img_rgb: np.ndarray,
        landmarks: Any,
        filename: str,
    ) -> Dict[str, Any]:
        """Processes bilateral facial portrait using MediaPipe landmarks."""
        orig_h, orig_w = img_rgb.shape[:2]
        pts = np.array([
            [float(lm.x * orig_w), float(lm.y * orig_h), float(lm.z * orig_w)]
            for lm in landmarks
        ])

        # --- RIGHT EYE METRICS (Viewer's Left) ---
        r_iris_center = pts[R_IRIS_CENTER][:2]
        r_iris_h_diam = float(np.linalg.norm(pts[R_IRIS_RIGHT][:2] - pts[R_IRIS_LEFT][:2]))
        r_mm_per_px = HUMAN_IRIS_DIAMETER_MM / max(r_iris_h_diam, 1.0)

        r_upper_y = pts[R_EYELID_UPPER_APEX][1]
        r_lower_y = pts[R_EYELID_LOWER_NADIR][1]
        r_pfh_px = max(0.0, float(r_lower_y - r_upper_y))
        r_mrd1_px = max(0.0, float(r_iris_center[1] - r_upper_y))
        r_mrd2_px = max(0.0, float(r_lower_y - r_iris_center[1]))

        r_metrics = {
            "pfh_px": round(r_pfh_px, 1),
            "mrd1_px": round(r_mrd1_px, 1),
            "mrd2_px": round(r_mrd2_px, 1),
            "iris_diameter_px": round(r_iris_h_diam, 1),
            "estimated_pfh_mm": round(r_pfh_px * r_mm_per_px, 2),
            "estimated_mrd1_mm": round(r_mrd1_px * r_mm_per_px, 2),
            "estimated_mrd2_mm": round(r_mrd2_px * r_mm_per_px, 2),
            "iris_center_px": [round(float(r_iris_center[0]), 1), round(float(r_iris_center[1]), 1)],
        }

        # --- LEFT EYE METRICS (Viewer's Right) ---
        l_iris_center = pts[L_IRIS_CENTER][:2]
        l_iris_h_diam = float(np.linalg.norm(pts[L_IRIS_RIGHT][:2] - pts[L_IRIS_LEFT][:2]))
        l_mm_per_px = HUMAN_IRIS_DIAMETER_MM / max(l_iris_h_diam, 1.0)

        l_upper_y = pts[L_EYELID_UPPER_APEX][1]
        l_lower_y = pts[L_EYELID_LOWER_NADIR][1]
        l_pfh_px = max(0.0, float(l_lower_y - l_upper_y))
        l_mrd1_px = max(0.0, float(l_iris_center[1] - l_upper_y))
        l_mrd2_px = max(0.0, float(l_lower_y - l_iris_center[1]))

        l_metrics = {
            "pfh_px": round(l_pfh_px, 1),
            "mrd1_px": round(l_mrd1_px, 1),
            "mrd2_px": round(l_mrd2_px, 1),
            "iris_diameter_px": round(l_iris_h_diam, 1),
            "estimated_pfh_mm": round(l_pfh_px * l_mm_per_px, 2),
            "estimated_mrd1_mm": round(l_mrd1_px * l_mm_per_px, 2),
            "estimated_mrd2_mm": round(l_mrd2_px * l_mm_per_px, 2),
            "iris_center_px": [round(float(l_iris_center[0]), 1), round(float(l_iris_center[1]), 1)],
        }

        # --- INTERPUPILLARY DISTANCE (IPD) ---
        ipd_px = float(np.linalg.norm(r_iris_center - l_iris_center))
        avg_mm_per_px = (r_mm_per_px + l_mm_per_px) / 2.0
        estimated_ipd_mm = round(ipd_px * avg_mm_per_px, 1)

        # --- PTOSIS ASYMMETRY EVALUATION ---
        max_pfh_px = max(r_pfh_px, l_pfh_px, 1.0)
        pfh_asymmetry_pct = round(abs(r_pfh_px - l_pfh_px) / max_pfh_px * 100.0, 1)

        max_mrd1_px = max(r_mrd1_px, l_mrd1_px, 1.0)
        mrd1_asymmetry_pct = round(abs(r_mrd1_px - l_mrd1_px) / max_mrd1_px * 100.0, 1)

        r_ptosis = r_metrics["estimated_mrd1_mm"] < 2.5 or (pfh_asymmetry_pct > 15.0 and r_pfh_px < l_pfh_px)
        l_ptosis = l_metrics["estimated_mrd1_mm"] < 2.5 or (pfh_asymmetry_pct > 15.0 and l_pfh_px < r_pfh_px)

        if r_ptosis and l_ptosis:
            potential_ptosis = True
            ptosis_eye = "BILATERAL"
        elif r_ptosis:
            potential_ptosis = True
            ptosis_eye = "RIGHT"
        elif l_ptosis:
            potential_ptosis = True
            ptosis_eye = "LEFT"
        else:
            potential_ptosis = False
            ptosis_eye = "NONE"

        # --- STRABISMUS HIRSCHBERG PROXY ---
        r_canthus_dist = max(1.0, float(np.linalg.norm(pts[R_INNER_CANTHUS][:2] - pts[R_OUTER_CANTHUS][:2])))
        r_inner_dist = float(np.linalg.norm(r_iris_center - pts[R_INNER_CANTHUS][:2]))
        r_hirschberg_ratio = r_inner_dist / r_canthus_dist

        l_canthus_dist = max(1.0, float(np.linalg.norm(pts[L_INNER_CANTHUS][:2] - pts[L_OUTER_CANTHUS][:2])))
        l_inner_dist = float(np.linalg.norm(l_iris_center - pts[L_INNER_CANTHUS][:2]))
        l_hirschberg_ratio = l_inner_dist / l_canthus_dist

        alignment_delta = abs(r_hirschberg_ratio - l_hirschberg_ratio)
        estimated_prism_diopters = round(alignment_delta * 120.0, 1)
        strabismus_suspected = alignment_delta > 0.08 or estimated_prism_diopters > 10.0

        strabismus_info = {
            "strabismus_suspected": strabismus_suspected,
            "estimated_deviation_prism_diopters": estimated_prism_diopters,
            "canthus_alignment_delta": round(alignment_delta, 3),
            "gaze_alignment_description": (
                "Possible ocular misalignment / strabismus indicator detected. Advise cover-uncover test."
                if strabismus_suspected else "Orthophoric symmetrical primary gaze alignment."
            )
        }

        # Recommendations
        recommendations = []
        if potential_ptosis:
            recommendations.append(f"Perform formal levator function assessment and phenylephrine test ({ptosis_eye} eye ptosis indicator).")
        if strabismus_suspected:
            recommendations.append("Perform alternate cover test and Krimsky test to quantify ocular deviation.")
        if not potential_ptosis and not strabismus_suspected:
            recommendations.append("Bilateral adnexal margins and primary gaze alignment appear within physiological limits.")

        clinical_summary = (
            f"Adnexal Telemetry (Bilateral Mode): Palpebral fissure asymmetry = {pfh_asymmetry_pct}%, MRD1 asymmetry = {mrd1_asymmetry_pct}%. "
            f"Ptosis Indicator: {ptosis_eye}. Hirschberg Alignment: {strabismus_info['gaze_alignment_description']}"
        )

        overlay_b64, blended_b64 = self._generate_visual_overlay(
            img_rgb=img_rgb,
            pts=pts,
            r_metrics=r_metrics,
            l_metrics=l_metrics,
            ipd_px=ipd_px,
        )

        return {
            "success": True,
            "detected": True,
            "mode": "BILATERAL_FACE_LANDMARKER",
            "filename": filename,
            "original_dimensions": [orig_w, orig_h],
            "left_eye": l_metrics,
            "right_eye": r_metrics,
            "interpupillary_distance_px": round(ipd_px, 1),
            "estimated_ipd_mm": estimated_ipd_mm,
            "pfh_asymmetry_pct": pfh_asymmetry_pct,
            "mrd1_asymmetry_pct": mrd1_asymmetry_pct,
            "potential_ptosis": potential_ptosis,
            "potential_ptosis_eye": ptosis_eye,
            "strabismus_screening": strabismus_info,
            "overlay_rgba_base64": overlay_b64,
            "blended_preview_base64": blended_b64,
            "clinical_summary": clinical_summary,
            "clinical_recommendations": recommendations,
            "disclaimer": (
                "Adnexal and alignment telemetry provides preliminary photographic assistance only. "
                "It does not replace manual prism cover testing, exophthalmometry, or specialized ophthalmic evaluation."
            ),
        }

    def _process_unilateral_macro(
        self,
        img_rgb: np.ndarray,
        image_bytes: bytes,
        filename: str,
        target_side: str = "UNILATERAL",
    ) -> Dict[str, Any]:
        """
        Unilateral Macro Mode: extracts real, image-derived eyelid margin positions
        and iris diameter from a close-up single-eye capture via edge gradient and segmentation.
        """
        orig_h, orig_w = img_rgb.shape[:2]
        engine = get_segmentation_engine()
        seg_res = engine.segment_image(image_bytes, filename)

        if not seg_res.get("success", False):
            return {
                "success": True,
                "detected": False,
                "mode": "UNILATERAL_MACRO_CLOSEUP",
                "filename": filename,
                "original_dimensions": [orig_w, orig_h],
                "message": (
                    "No facial or ocular adnexal landmarks detected. "
                    "Ensure patient is facing camera directly with eye fully open in diffuse illumination."
                ),
                "clinical_summary": "Capture insufficient for adnexal landmark resolution.",
                "clinical_recommendations": [
                    "Retake frontal eye photograph with patient fixating straight ahead at camera.",
                    "Ensure neutral head posture without tilt or squinting.",
                    "Ensure adequate ambient lighting without harsh overhead shadows."
                ],
                "disclaimer": "Technical assistance only. Not for standalone clinical diagnosis."
            }

        telemetry = seg_res.get("telemetry", {})
        iris_info = telemetry.get("iris", {})
        pupil_info = telemetry.get("pupil", {})

        if not iris_info.get("detected", False):
            return {
                "success": True,
                "detected": False,
                "mode": "UNILATERAL_MACRO_CLOSEUP",
                "filename": filename,
                "original_dimensions": [orig_w, orig_h],
                "message": "Iris boundary unresolved in macro capture.",
                "clinical_summary": "Iris contour unresolved.",
                "clinical_recommendations": ["Retake photo with clear frontal view of cornea and eyelids."],
                "disclaimer": "Technical assistance only."
            }

        center = iris_info["center"]
        iris_diam_px = float(iris_info["estimated_diameter_px"])
        mm_per_px = HUMAN_IRIS_DIAMETER_MM / max(iris_diam_px, 1.0)

        cx, cy = int(center[0]), int(center[1])
        radius_est = int(iris_diam_px / 2.0)

        # Dynamic, image-driven eyelid margin extraction via vertical edge gradient
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 1.5)

        # Multi-column vertical band across central 30% of iris
        x_half = max(2, int(radius_est * 0.15))
        x1 = max(0, cx - x_half)
        x2 = min(orig_w, cx + x_half)
        col_slice = np.mean(blurred[:, x1:x2], axis=1)

        # 1st order vertical gradient
        grad_y = np.abs(cv2.Sobel(col_slice, cv2.CV_64F, 0, 1, ksize=5))

        # Upper eyelid search window: between (cy - 1.4*r) and (cy - 0.25*r)
        y_up_min = max(0, cy - int(radius_est * 1.4))
        y_up_max = max(0, cy - int(radius_est * 0.25))
        if y_up_max > y_up_min:
            up_band = grad_y[y_up_min:y_up_max]
            if len(up_band) > 0 and np.max(up_band) > 0:
                upper_y = y_up_min + int(np.argmax(up_band))
            else:
                upper_y = max(0, cy - int(radius_est * 0.75))
        else:
            upper_y = max(0, cy - int(radius_est * 0.75))

        # Lower eyelid search window: between (cy + 0.25*r) and (cy + 1.4*r)
        y_low_min = min(orig_h - 1, cy + int(radius_est * 0.25))
        y_low_max = min(orig_h - 1, cy + int(radius_est * 1.4))
        if y_low_max > y_low_min:
            low_band = grad_y[y_low_min:y_low_max]
            if len(low_band) > 0 and np.max(low_band) > 0:
                lower_y = y_low_min + int(np.argmax(low_band))
            else:
                lower_y = min(orig_h - 1, cy + int(radius_est * 0.85))
        else:
            lower_y = min(orig_h - 1, cy + int(radius_est * 0.85))

        # Actual image-derived pixel measurements
        mrd1_px = max(2.0, float(cy - upper_y))
        mrd2_px = max(2.0, float(lower_y - cy))
        pfh_px = float(lower_y - upper_y)

        # Calibrated millimeter calculations against adult horizontal iris standard (11.7mm)
        mrd1_mm = round(mrd1_px * mm_per_px, 2)
        mrd2_mm = round(mrd2_px * mm_per_px, 2)
        pfh_mm = round(pfh_px * mm_per_px, 2)

        single_metrics = {
            "pfh_px": round(pfh_px, 1),
            "mrd1_px": round(mrd1_px, 1),
            "mrd2_px": round(mrd2_px, 1),
            "iris_diameter_px": round(iris_diam_px, 1),
            "estimated_pfh_mm": pfh_mm,
            "estimated_mrd1_mm": mrd1_mm,
            "estimated_mrd2_mm": mrd2_mm,
            "iris_center_px": [cx, cy],
            "upper_margin_y_px": upper_y,
            "lower_margin_y_px": lower_y,
            "captured": True,
        }

        # Determine eye routing
        if target_side == "RIGHT":
            evaluated_side = "RIGHT"
            right_eye_data = single_metrics
            left_eye_data = None
            side_label = "Right Eye (OD)"
        elif target_side == "LEFT":
            evaluated_side = "LEFT"
            left_eye_data = single_metrics
            right_eye_data = None
            side_label = "Left Eye (OS)"
        else:
            evaluated_side = "UNILATERAL"
            right_eye_data = single_metrics
            left_eye_data = None
            side_label = "Single Eye (Macro)"

        # Generate single-eye macro overlay with margin caliper lines
        overlay_rgba = np.zeros((orig_h, orig_w, 4), dtype=np.uint8)
        thickness = max(2, int(min(orig_h, orig_w) / 300))
        c_iris = (0, 220, 255, 220)
        c_pupil = (255, 45, 85, 230)
        c_caliper = (255, 200, 0, 220)
        c_margin = (0, 255, 200, 240)

        # Draw Iris boundary & pupil center
        cv2.circle(overlay_rgba, (cx, cy), radius_est, c_iris, thickness)
        cv2.drawMarker(overlay_rgba, (cx, cy), c_pupil, markerType=cv2.MARKER_CROSS, markerSize=max(8, radius_est // 2), thickness=thickness)

        # Draw horizontal eyelid margin calipers
        line_w = int(radius_est * 1.2)
        cv2.line(overlay_rgba, (max(0, cx - line_w), upper_y), (min(orig_w - 1, cx + line_w), upper_y), c_margin, thickness)
        cv2.line(overlay_rgba, (max(0, cx - line_w), lower_y), (min(orig_w - 1, cx + line_w), lower_y), c_margin, thickness)

        # Draw vertical caliper line connecting center to upper/lower margins
        cv2.line(overlay_rgba, (cx, upper_y), (cx, lower_y), c_caliper, thickness)
        cv2.circle(overlay_rgba, (cx, upper_y), max(3, thickness + 1), (0, 255, 255, 255), -1)
        cv2.circle(overlay_rgba, (cx, lower_y), max(3, thickness + 1), (0, 255, 255, 255), -1)

        # Measurement annotation
        txt = f"{side_label} MRD1: {mrd1_mm}mm | MRD2: {mrd2_mm}mm | PFH: {pfh_mm}mm"
        font_scale = max(0.4, min(orig_h, orig_w) / 1000.0)
        cv2.putText(overlay_rgba, txt, (max(10, cx - line_w), max(25, upper_y - 12)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255, 240), thickness)

        alpha = overlay_rgba[:, :, 3].astype(np.float32) / 255.0
        alpha_3d = np.dstack([alpha, alpha, alpha])
        blended = (img_rgb.astype(np.float32) * (1.0 - alpha_3d) + overlay_rgba[:, :, :3].astype(np.float32) * alpha_3d).astype(np.uint8)

        _, overlay_buf = cv2.imencode('.png', cv2.cvtColor(overlay_rgba, cv2.COLOR_RGBA2BGRA))
        overlay_b64 = "data:image/png;base64," + base64.b64encode(overlay_buf).decode('utf-8')

        _, blended_buf = cv2.imencode('.jpg', cv2.cvtColor(blended, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 85])
        blended_b64 = "data:image/jpeg;base64," + base64.b64encode(blended_buf).decode('utf-8')

        has_ptosis_risk = mrd1_mm < 2.5

        return {
            "success": True,
            "detected": True,
            "mode": "UNILATERAL_MACRO_CLOSEUP",
            "filename": filename,
            "original_dimensions": [orig_w, orig_h],
            "evaluated_eye": evaluated_side,
            "unilateral_eye": single_metrics,
            "left_eye": left_eye_data,
            "right_eye": right_eye_data,
            "interpupillary_distance_px": 0.0,
            "estimated_ipd_mm": 0.0,
            "pfh_asymmetry_pct": None,
            "mrd1_asymmetry_pct": None,
            "asymmetry_evaluable": False,
            "potential_ptosis": has_ptosis_risk,
            "potential_ptosis_eye": evaluated_side if has_ptosis_risk else "NONE",
            "strabismus_screening": {
                "strabismus_suspected": False,
                "estimated_deviation_prism_diopters": 0.0,
                "canthus_alignment_delta": 0.0,
                "gaze_alignment_description": "Single-eye macro photograph. Dual-eye frontal portrait required for Hirschberg optical axis alignment."
            },
            "overlay_rgba_base64": overlay_b64,
            "blended_preview_base64": blended_b64,
            "clinical_summary": (
                f"Unilateral Macro Calipers for {side_label}: "
                f"PFH = {pfh_mm}mm ({pfh_px:.0f}px), MRD1 = {mrd1_mm}mm ({mrd1_px:.0f}px), MRD2 = {mrd2_mm}mm ({mrd2_px:.0f}px). "
                f"Iris calibrated against 11.7mm standard (White-to-White)."
            ),
            "clinical_recommendations": [
                "Single-eye macro photo calibrated against 11.7mm human iris standard.",
                "For bilateral ptosis asymmetry comparison (OD vs OS) and strabismus screening, upload a full frontal face portrait.",
                "Correlate macro eyelid margin measurements with clinical slit-lamp examination."
            ],
            "disclaimer": "Unilateral geometric adnexal telemetry for clinical decision support only. Does not provide an autonomous diagnosis."
        }

    def _generate_visual_overlay(
        self,
        img_rgb: np.ndarray,
        pts: np.ndarray,
        r_metrics: Dict[str, Any],
        l_metrics: Dict[str, Any],
        ipd_px: float,
    ) -> Tuple[str, str]:
        """Creates an annotated transparent RGBA overlay for bilateral portraits."""
        h, w = img_rgb.shape[:2]
        overlay_rgba = np.zeros((h, w, 4), dtype=np.uint8)

        thickness = max(2, int(min(h, w) / 300))
        font_scale = max(0.4, min(h, w) / 1200.0)

        c_eyelid = (16, 215, 120, 200)
        c_iris = (0, 220, 255, 220)
        c_pupil = (255, 45, 85, 230)
        c_caliper = (255, 200, 0, 220)
        c_ipd = (168, 85, 247, 180)

        # 1. Eyelid contours
        r_upper_pts = np.int32([pts[idx][:2] for idx in R_UPPER_EYELID_CONTOUR])
        r_lower_pts = np.int32([pts[idx][:2] for idx in R_LOWER_EYELID_CONTOUR])
        l_upper_pts = np.int32([pts[idx][:2] for idx in L_UPPER_EYELID_CONTOUR])
        l_lower_pts = np.int32([pts[idx][:2] for idx in L_LOWER_EYELID_CONTOUR])

        cv2.polylines(overlay_rgba, [r_upper_pts], False, c_eyelid, thickness)
        cv2.polylines(overlay_rgba, [r_lower_pts], False, c_eyelid, thickness)
        cv2.polylines(overlay_rgba, [l_upper_pts], False, c_eyelid, thickness)
        cv2.polylines(overlay_rgba, [l_lower_pts], False, c_eyelid, thickness)

        # 2. Iris circles & centers
        r_center = (int(r_metrics["iris_center_px"][0]), int(r_metrics["iris_center_px"][1]))
        r_rad = max(3, int(r_metrics["iris_diameter_px"] / 2.0))
        cv2.circle(overlay_rgba, r_center, r_rad, c_iris, thickness)
        cv2.drawMarker(overlay_rgba, r_center, c_pupil, markerType=cv2.MARKER_CROSS, markerSize=max(8, r_rad // 2), thickness=thickness)

        l_center = (int(l_metrics["iris_center_px"][0]), int(l_metrics["iris_center_px"][1]))
        l_rad = max(3, int(l_metrics["iris_diameter_px"] / 2.0))
        cv2.circle(overlay_rgba, l_center, l_rad, c_iris, thickness)
        cv2.drawMarker(overlay_rgba, l_center, c_pupil, markerType=cv2.MARKER_CROSS, markerSize=max(8, l_rad // 2), thickness=thickness)

        # 3. Vertical caliper lines
        r_apex_pt = (r_center[0], int(pts[R_EYELID_UPPER_APEX][1]))
        r_nadir_pt = (r_center[0], int(pts[R_EYELID_LOWER_NADIR][1]))
        cv2.line(overlay_rgba, r_center, r_apex_pt, c_caliper, thickness)
        cv2.line(overlay_rgba, r_center, r_nadir_pt, (255, 140, 0, 200), max(1, thickness - 1))

        l_apex_pt = (l_center[0], int(pts[L_EYELID_UPPER_APEX][1]))
        l_nadir_pt = (l_center[0], int(pts[L_EYELID_LOWER_NADIR][1]))
        cv2.line(overlay_rgba, l_center, l_apex_pt, c_caliper, thickness)
        cv2.line(overlay_rgba, l_center, l_nadir_pt, (255, 140, 0, 200), max(1, thickness - 1))

        # 4. Interpupillary line
        cv2.line(overlay_rgba, r_center, l_center, c_ipd, max(1, thickness - 1))

        # 5. Textual caliper annotations
        r_txt = f"R MRD1: {r_metrics['estimated_mrd1_mm']}mm | PFH: {r_metrics['estimated_pfh_mm']}mm"
        l_txt = f"L MRD1: {l_metrics['estimated_mrd1_mm']}mm | PFH: {l_metrics['estimated_pfh_mm']}mm"
        cv2.putText(overlay_rgba, r_txt, (max(10, r_center[0] - 80), max(20, r_center[1] - r_rad - 15)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255, 240), max(1, thickness))
        cv2.putText(overlay_rgba, l_txt, (max(10, l_center[0] - 80), max(20, l_center[1] - l_rad - 15)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255, 240), max(1, thickness))

        alpha = overlay_rgba[:, :, 3].astype(np.float32) / 255.0
        alpha_3d = np.dstack([alpha, alpha, alpha])
        blended = (img_rgb.astype(np.float32) * (1.0 - alpha_3d) + overlay_rgba[:, :, :3].astype(np.float32) * alpha_3d).astype(np.uint8)

        _, overlay_buf = cv2.imencode('.png', cv2.cvtColor(overlay_rgba, cv2.COLOR_RGBA2BGRA))
        overlay_b64 = "data:image/png;base64," + base64.b64encode(overlay_buf).decode('utf-8')

        _, blended_buf = cv2.imencode('.jpg', cv2.cvtColor(blended, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 85])
        blended_b64 = "data:image/jpeg;base64," + base64.b64encode(blended_buf).decode('utf-8')

        return overlay_b64, blended_b64


_adnexal_engine_instance: Optional[AdnexalAlignmentEngine] = None

def get_adnexal_engine() -> AdnexalAlignmentEngine:
    global _adnexal_engine_instance
    if _adnexal_engine_instance is None:
        _adnexal_engine_instance = AdnexalAlignmentEngine()
    return _adnexal_engine_instance
