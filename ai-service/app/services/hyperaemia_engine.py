"""
VisionBridge Milestone 5.3: Conjunctival Hyperaemia & Pterygium Engine
Quantifies bulbar conjunctival microvascular density and maps to the Efron Grading Scale (0 to 4).
Screens for pterygium corneal encroachment and measures pupillary visual axis clearance.
CPU Latency: ~60-90ms.
License: Apache 2.0 / Proprietary Hackathon Implementation.
Non-Diagnostic Disclaimer: Technical clinical decision-support only. Not a medical diagnosis.
"""

import base64
import io
import math
from typing import Dict, Any, Optional, Tuple
import numpy as np
import cv2
from PIL import Image

DISCLAIMER = (
    "PRELIMINARY OCULAR SURFACE TELEMETRY FOR TECHNICAL DECISION SUPPORT. "
    "DOES NOT CONSTITUTE A MEDICAL DIAGNOSIS OF CONJUNCTIVITIS, UVEITIS, OR PTERYGIUM. "
    "REQUIRES CLINICAL SLIT-LAMP BIOMICROSCOPY BY A LICENSED OPTOMETRIST OR OPHTHALMOLOGIST."
)


class HyperaemiaAndPterygiumEngine:
    def __init__(self):
        self.adult_iris_diameter_mm = 11.7

    def _decode_image(self, image_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Failed to decode image bytes into valid raster image.")
        return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    def _detect_iris_and_pupil(self, img_rgb: np.ndarray) -> Tuple[int, int, int, int]:
        """
        Detects primary iris center (cx, cy), iris radius, and pupil radius.
        Uses multi-stage Hough transform and luminance thresholding.
        Returns: (cx, cy, iris_r, pupil_r)
        """
        h, w, _ = img_rgb.shape
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 2.0)

        # Estimate expected iris radius (roughly 15% to 45% of image height)
        min_r = max(20, int(h * 0.12))
        max_r = min(int(w * 0.45), int(h * 0.45))

        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=int(h * 0.3),
            param1=60,
            param2=35,
            minRadius=min_r,
            maxRadius=max_r
        )

        if circles is not None and len(circles) > 0:
            circles = np.round(circles[0, :]).astype(int)
            # Pick circle closest to image center
            center_x, center_y = w // 2, h // 2
            best_circle = min(
                circles,
                key=lambda c: (c[0] - center_x) ** 2 + (c[1] - center_y) ** 2
            )
            cx, cy, iris_r = int(best_circle[0]), int(best_circle[1]), int(best_circle[2])
        else:
            # Fallback to image center with proportional radius
            cx, cy = w // 2, h // 2
            iris_r = int(min(w, h) * 0.28)

        # Detect pupil radius inside iris bounding box
        pupil_roi_r = int(iris_r * 0.65)
        y1, y2 = max(0, cy - pupil_roi_r), min(h, cy + pupil_roi_r)
        x1, x2 = max(0, cx - pupil_roi_r), min(w, cx + pupil_roi_r)
        pupil_roi = gray[y1:y2, x1:x2]

        if pupil_roi.size > 0:
            dark_thresh = np.percentile(pupil_roi, 15)
            pupil_mask = (pupil_roi <= dark_thresh).astype(np.uint8)
            contours, _ = cv2.findContours(pupil_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_c = max(contours, key=cv2.contourArea)
                _, p_radius = cv2.minEnclosingCircle(largest_c)
                pupil_r = max(int(iris_r * 0.2), min(int(p_radius), int(iris_r * 0.55)))
            else:
                pupil_r = int(iris_r * 0.35)
        else:
            pupil_r = int(iris_r * 0.35)

        return cx, cy, iris_r, pupil_r

    def _extract_sclera_mask(self, img_rgb: np.ndarray, cx: int, cy: int, iris_r: int) -> np.ndarray:
        """
        Extracts bulbar sclera mask (white ocular surface surrounding the cornea).
        Excludes iris disk and periocular skin/eyelids.
        """
        h, w, _ = img_rgb.shape
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1]
        val = hsv[:, :, 2]

        # Base sclera is the white/pale ocular coat surrounding the cornea.
        # High luminance, low saturation, and balanced blue-to-red chromatic ratio (B/R > 0.78),
        # which cleanly distinguishes white scleral tissue from periocular skin (where B/R < 0.72).
        r = img_rgb[:, :, 0].astype(np.float32)
        g = img_rgb[:, :, 1].astype(np.float32)
        b = img_rgb[:, :, 2].astype(np.float32)

        blue_red_ratio = b / (r + 1e-5)
        is_pale_sclera = (sat < 60) & (val > 95) & (blue_red_ratio > 0.78)

        # Spatial constraint: strictly lateral and medial to iris
        y_indices, x_indices = np.indices((h, w))
        dist_from_iris = np.sqrt((x_indices - cx) ** 2 + (y_indices - cy) ** 2)
        outside_iris = dist_from_iris > (iris_r * 1.05)
        within_periorbital = dist_from_iris < (iris_r * 2.6)

        # Horizontal band preference (sclera is predominantly lateral/medial to iris)
        y_diff = np.abs(y_indices - cy)
        horizontal_band = y_diff < (iris_r * 0.85)

        initial_sclera = (is_pale_sclera & outside_iris & within_periorbital & horizontal_band).astype(np.uint8)

        # Morphological closing bridges vascular gaps inside the sclera
        kernel_close = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        sclera_mask = cv2.morphologyEx(initial_sclera, cv2.MORPH_CLOSE, kernel_close)
        sclera_mask = cv2.morphologyEx(sclera_mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

        return sclera_mask

    def _calculate_hyperaemia_metrics(
        self, img_rgb: np.ndarray, sclera_mask: np.ndarray
    ) -> Dict[str, Any]:
        """
        Extracts conjunctival microvascular density and maps to Efron 0-4 scale.
        Combines absolute red differential contrast and localized gradient thresholding.
        """
        sclera_pixel_count = int(np.sum(sclera_mask > 0))
        if sclera_pixel_count < 250:
            return {
                "success": False,
                "sclera_evaluated_px": sclera_pixel_count,
                "error": "Insufficient visible scleral surface for hyperaemia grading."
            }

        r = img_rgb[:, :, 0].astype(np.float32)
        g = img_rgb[:, :, 1].astype(np.float32)
        b = img_rgb[:, :, 2].astype(np.float32)

        # Differential red contrast: R - (G + B) / 2
        red_dominance = r - (g + b) / 2.0

        # Vascular edge gradient via Sobel
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        edge_mag = np.sqrt(sobel_x ** 2 + sobel_y ** 2)

        # Vessel pixels must have significant red differential and distinct gradient,
        # or pronounced diffuse hyperaemia (ciliary flush)
        vessel_mask = (
            (
                ((red_dominance > 16.0) & (edge_mag > 10.0)) |
                (red_dominance > 28.0)
            ) &
            (sclera_mask > 0)
        ).astype(np.uint8)

        vessel_pixel_count = int(np.sum(vessel_mask > 0))
        vascular_density_pct = float((vessel_pixel_count / sclera_pixel_count) * 100.0)

        # International Efron Grading Scale (0 to 4) Mapping
        if vascular_density_pct < 6.0:
            efron_grade = 0
            severity_label = "NORMAL_TRACE"
            grade_name = "Grade 0: Normal / Trace"
            guidance = "Clear, healthy conjunctiva. Baseline ocular surface integrity."
        elif vascular_density_pct < 13.0:
            efron_grade = 1
            severity_label = "MILD_HYPERAEMIA"
            grade_name = "Grade 1: Mild Injection"
            guidance = "Mild bulbar injection. Suggest checking tear film breakup time (TBUT) or mild environmental dryness."
        elif vascular_density_pct < 22.0:
            efron_grade = 2
            severity_label = "MODERATE_HYPERAEMIA"
            grade_name = "Grade 2: Moderate Injection"
            guidance = "Moderate diffuse redness. Evaluate for contact lens overwear, blepharitis, or allergic conjunctivitis."
        elif vascular_density_pct < 32.0:
            efron_grade = 3
            severity_label = "SEVERE_HYPERAEMIA"
            grade_name = "Grade 3: Severe Injection"
            guidance = "Marked injection or ciliary flush. Recommend slit-lamp examination with fluorescein staining to rule out uveitis or keratitis."
        else:
            efron_grade = 4
            severity_label = "EXTREME_HYPERAEMIA"
            grade_name = "Grade 4: Extreme / Ciliary Flush"
            guidance = "Intense deep ciliary flush. Prompt ophthalmic evaluation strongly advised."

        return {
            "success": True,
            "sclera_evaluated_px": sclera_pixel_count,
            "vascular_pixels_px": vessel_pixel_count,
            "vascular_density_pct": round(vascular_density_pct, 2),
            "efron_grade": efron_grade,
            "severity_label": severity_label,
            "efron_grade_name": grade_name,
            "clinical_guidance": guidance,
            "vessel_mask": vessel_mask
        }

    def _screen_pterygium_encroachment(
        self, img_rgb: np.ndarray, cx: int, cy: int, iris_r: int, pupil_r: int, mm_per_px: float
    ) -> Dict[str, Any]:
        """
        Screens for fibrovascular tissue crossing the corneal limbus into clear cornea.
        Quantifies horizontal invasion distance in mm and pupil margin clearance.
        """
        h, w, _ = img_rgb.shape
        y_indices, x_indices = np.indices((h, w))
        dist_from_center = np.sqrt((x_indices - cx) ** 2 + (y_indices - cy) ** 2)

        # Corneal zone is inside the iris radius
        corneal_mask = dist_from_center < (iris_r * 0.98)
        # Exclude pupil
        outside_pupil = dist_from_center > (pupil_r * 1.15)
        cornea_stroma = corneal_mask & outside_pupil

        # Pterygium tissue exhibits higher red differential and higher saturation than clear cornea
        r = img_rgb[:, :, 0].astype(np.float32)
        g = img_rgb[:, :, 1].astype(np.float32)
        b = img_rgb[:, :, 2].astype(np.float32)
        red_diff = r - (g + b) / 2.0

        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1]

        # Baseline clear cornea inside stroma has very low red differential and low saturation
        stroma_reds = red_diff[cornea_stroma]
        if len(stroma_reds) == 0:
            return {
                "detected": False,
                "limbic_invasion_mm": 0.0,
                "pupil_clearance_mm": round(pupil_r * mm_per_px, 2),
                "severity_grade": "NONE",
                "clinical_advice": "Unable to resolve corneal stroma."
            }

        red_threshold = max(15.0, np.percentile(stroma_reds, 88))
        lesion_candidate = (
            (red_diff > red_threshold) &
            (sat > 40) &
            cornea_stroma
        ).astype(np.uint8)

        # Remove small noise specs
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        lesion_clean = cv2.morphologyEx(lesion_candidate, cv2.MORPH_OPEN, kernel)
        lesion_clean = cv2.morphologyEx(lesion_clean, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(lesion_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        significant_contours = [c for c in contours if cv2.contourArea(c) > (iris_r * 1.5)]

        if not significant_contours:
            # No significant tissue encroaching
            pupil_clearance_mm = round((iris_r - pupil_r) * mm_per_px, 2)
            return {
                "detected": False,
                "encroachment_zone": "NONE",
                "limbic_invasion_mm": 0.0,
                "limbic_invasion_px": 0,
                "pupil_clearance_mm": pupil_clearance_mm,
                "apex_coordinate": None,
                "severity_grade": "NONE",
                "clinical_advice": "No fibrovascular corneal limbal encroachment detected. Clear corneal optical zone.",
                "lesion_mask": np.zeros((h, w), dtype=np.uint8)
            }

        # Select most prominent advancing lesion
        main_lesion = max(significant_contours, key=cv2.contourArea)
        pts = main_lesion.reshape(-1, 2)

        # Find apex point (closest point to pupil center cx, cy)
        distances_to_pupil = np.sqrt((pts[:, 0] - cx) ** 2 + (pts[:, 1] - cy) ** 2)
        min_idx = np.argmin(distances_to_pupil)
        apex_x, apex_y = int(pts[min_idx, 0]), int(pts[min_idx, 1])
        min_dist_px = float(distances_to_pupil[min_idx])

        # Determine zone: Nasal vs Temporal based on apex_x relative to cx
        zone = "NASAL" if apex_x < cx else "TEMPORAL"

        # Limbic invasion distance (horizontal advance past limbus)
        invasion_px = max(0, iris_r - abs(apex_x - cx))
        invasion_mm = round(invasion_px * mm_per_px, 2)

        # Clearance to pupillary margin
        pupil_clearance_px = max(0, min_dist_px - pupil_r)
        pupil_clearance_mm = round(pupil_clearance_px * mm_per_px, 2)

        # Grade severity
        if invasion_mm < 0.3:
            severity = "NONE_PINGUECULA"
            advice = "Minimal limbal elevation consistent with pinguecula without meaningful corneal invasion."
        elif invasion_mm <= 1.5:
            severity = "GRADE_1_MILD"
            advice = "Early Grade 1 pterygium encroaching <1.5mm onto peripheral cornea. Recommend periodic photography to monitor progression."
        elif invasion_mm <= 3.0:
            severity = "GRADE_2_MODERATE"
            advice = "Grade 2 pterygium encroaching >1.5mm toward visual axis. Evaluate for induced astigmatism and consider ophthalmic consultation."
        else:
            severity = "GRADE_3_ADVANCED"
            advice = "Advanced Grade 3 pterygium threatening pupillary aperture. Ophthalmology referral recommended for potential surgical evaluation."

        lesion_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(lesion_mask, [main_lesion], -1, 1, -1)

        return {
            "detected": invasion_mm >= 0.3,
            "encroachment_zone": zone,
            "limbic_invasion_mm": invasion_mm,
            "limbic_invasion_px": int(invasion_px),
            "pupil_clearance_mm": pupil_clearance_mm,
            "apex_coordinate": {"x": apex_x, "y": apex_y},
            "severity_grade": severity,
            "clinical_advice": advice,
            "lesion_mask": lesion_mask
        }

    def _generate_overlay(
        self,
        img_rgb: np.ndarray,
        cx: int,
        cy: int,
        iris_r: int,
        pupil_r: int,
        vessel_mask: Optional[np.ndarray],
        pterygium_data: Dict[str, Any],
        efron_grade: int,
        vessel_density_pct: float
    ) -> str:
        """
        Renders a transparent RGBA overlay:
        - Scleral vessels highlighted in vibrant crimson
        - Limbic circle in cyan
        - Pupillary border in emerald green
        - Pterygium lesion and apex caliper in amber
        - Telemetry annotations
        """
        h, w, _ = img_rgb.shape
        overlay = np.zeros((h, w, 4), dtype=np.uint8)

        # 1. Draw Scleral Microvessels (Crimson Red with alpha)
        if vessel_mask is not None and np.sum(vessel_mask) > 0:
            # Dilate slightly for display visibility on high-res photos
            dilated_vessels = cv2.dilate(vessel_mask, np.ones((2, 2), np.uint8), iterations=1)
            overlay[dilated_vessels > 0] = [239, 68, 68, 200]  # Red-500, alpha 200

        # 2. Draw Limbic Boundary (Cyan)
        cv2.circle(overlay, (cx, cy), iris_r, (6, 182, 212, 220), 2)  # Cyan-500

        # 3. Draw Pupillary Margin (Emerald)
        cv2.circle(overlay, (cx, cy), pupil_r, (16, 185, 129, 220), 2)  # Emerald-500
        cv2.circle(overlay, (cx, cy), 3, (255, 255, 255, 240), -1)      # Center reflex

        # 4. Draw Pterygium Encroachment Calipers if detected
        if pterygium_data.get("detected") and pterygium_data.get("apex_coordinate"):
            apex = pterygium_data["apex_coordinate"]
            apex_x, apex_y = apex["x"], apex["y"]

            # Highlight lesion body in translucent amber
            lesion_mask = pterygium_data.get("lesion_mask")
            if lesion_mask is not None and np.sum(lesion_mask) > 0:
                overlay[lesion_mask > 0] = [245, 158, 11, 150]  # Amber-500

            # Caliper line from limbus crossing point to apex
            limbus_x = cx - iris_r if apex_x < cx else cx + iris_r
            cv2.line(overlay, (limbus_x, apex_y), (apex_x, apex_y), (245, 158, 11, 240), 2)
            cv2.circle(overlay, (apex_x, apex_y), 5, (239, 68, 68, 255), -1)  # Apex marker

            # Line from apex to pupil margin
            cv2.line(overlay, (apex_x, apex_y), (cx, cy), (255, 255, 255, 160), 1, cv2.LINE_AA)

            # Annotation text
            inv_mm = pterygium_data.get("limbic_invasion_mm", 0.0)
            cv2.putText(
                overlay,
                f"Pterygium: {inv_mm}mm",
                (apex_x - 30, max(25, apex_y - 12)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (245, 158, 11, 255),
                1,
                cv2.LINE_AA
            )

        # 5. Burn telemetry badge in top corner
        badge_text_1 = f"Efron Grade {efron_grade} (VD: {vessel_density_pct:.1f}%)"
        cv2.putText(
            overlay,
            badge_text_1,
            (16, 28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (255, 255, 255, 240),
            1,
            cv2.LINE_AA
        )

        pil_img = Image.fromarray(overlay, mode="RGBA")
        buffer = io.BytesIO()
        pil_img.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "ocular_surface.jpg",
        eye_side: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end hyperaemia and pterygium screening on an eye photograph.
        """
        img_rgb = self._decode_image(image_bytes)
        h, w, _ = img_rgb.shape

        # 1. Localize iris and pupil centers
        cx, cy, iris_r, pupil_r = self._detect_iris_and_pupil(img_rgb)
        iris_diam_px = 2.0 * iris_r
        mm_per_px = self.adult_iris_diameter_mm / max(iris_diam_px, 1.0)

        # 2. Extract scleral mask
        sclera_mask = self._extract_sclera_mask(img_rgb, cx, cy, iris_r)

        # 3. Calculate hyperaemia metrics
        hyperaemia = self._calculate_hyperaemia_metrics(img_rgb, sclera_mask)

        # 4. Screen for pterygium encroachment
        pterygium = self._screen_pterygium_encroachment(img_rgb, cx, cy, iris_r, pupil_r, mm_per_px)

        # 5. Generate transparent RGBA visual overlay
        efron_grade = hyperaemia.get("efron_grade", 0) if hyperaemia.get("success") else 0
        vd_pct = hyperaemia.get("vascular_density_pct", 0.0) if hyperaemia.get("success") else 0.0
        vessel_mask = hyperaemia.get("vessel_mask")

        overlay_data_url = self._generate_overlay(
            img_rgb, cx, cy, iris_r, pupil_r, vessel_mask, pterygium, efron_grade, vd_pct
        )

        # Prepare clean JSON response
        clean_pterygium = {
            "detected": pterygium.get("detected", False),
            "encroachment_zone": pterygium.get("encroachment_zone", "NONE"),
            "limbic_invasion_mm": pterygium.get("limbic_invasion_mm", 0.0),
            "pupil_clearance_mm": pterygium.get("pupil_clearance_mm", 0.0),
            "severity_grade": pterygium.get("severity_grade", "NONE"),
            "clinical_advice": pterygium.get("clinical_advice", "")
        }

        clean_hyperaemia = {
            "evaluated": hyperaemia.get("success", False),
            "sclera_area_px": hyperaemia.get("sclera_evaluated_px", 0),
            "vascular_density_pct": hyperaemia.get("vascular_density_pct", 0.0),
            "efron_grade": hyperaemia.get("efron_grade", 0),
            "severity_label": hyperaemia.get("severity_label", "UNKNOWN"),
            "efron_grade_name": hyperaemia.get("efron_grade_name", "N/A"),
            "clinical_guidance": hyperaemia.get("clinical_guidance", "")
        }

        return {
            "success": True,
            "filename": filename,
            "eye_side": eye_side or "NOT_SPECIFIED",
            "calibration": {
                "iris_diameter_px": round(iris_diam_px, 1),
                "iris_radius_px": iris_r,
                "pupil_radius_px": pupil_r,
                "scale_factor_mm_per_px": round(mm_per_px, 6),
                "reference_iris_diameter_mm": self.adult_iris_diameter_mm
            },
            "hyperaemia": clean_hyperaemia,
            "pterygium": clean_pterygium,
            "overlay_rgba_base64": overlay_data_url,
            "disclaimer": DISCLAIMER
        }


_engine_instance: Optional[HyperaemiaAndPterygiumEngine] = None


def get_hyperaemia_engine() -> HyperaemiaAndPterygiumEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = HyperaemiaAndPterygiumEngine()
    return _engine_instance
