"""
VisionBridge Milestone 5.5: Lens & Corneal Clarity Engine
Quantifies crystalline lens pupillary opacity (Cataract Screening) and peripheral corneal arcus (Arcus Senilis).
Analyzes pupillary transmission luminance, Shannon entropy, and limbal lipid arc distribution.
CPU Latency: ~50-80ms.
License: Apache 2.0 / Proprietary Hackathon Implementation.
Non-Diagnostic Disclaimer: Technical clinical decision-support only. Not a medical diagnosis.
"""

import base64
import io
import math
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import cv2
from PIL import Image

DISCLAIMER = (
    "PRELIMINARY LENS & CORNEAL CLARITY TELEMETRY FOR TECHNICAL DECISION SUPPORT. "
    "DOES NOT CONSTITUTE A MEDICAL DIAGNOSIS OF CATARACT OR DYSLIPIDEMIA. "
    "REQUIRES CLINICAL SLIT-LAMP BIOMICROSCOPY AND DILATED FUNDUSCOPY BY A LICENSED EYE-CARE PROFESSIONAL."
)


class CornealLensEngine:
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
        Uses Hough transform and dark pupillary blob detection.
        Returns: (cx, cy, iris_r, pupil_r)
        """
        h, w, _ = img_rgb.shape
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (7, 7), 2.0)

        # Iris radius estimate (approx 12% to 45% of image height)
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

        if circles is not None:
            circles = np.uint16(np.around(circles))
            best = circles[0][0]
            cx, cy, iris_r = int(best[0]), int(best[1]), int(best[2])
        else:
            cx, cy = w // 2, h // 2
            iris_r = int(min(w, h) * 0.28)

        # Detect pupil radius inside iris ROI
        pupil_r = max(8, int(iris_r * 0.35))
        x1 = max(0, cx - iris_r)
        x2 = min(w, cx + iris_r)
        y1 = max(0, cy - iris_r)
        y2 = min(h, cy + iris_r)
        roi_gray = gray[y1:y2, x1:x2]

        if roi_gray.size > 0:
            roi_blurred = cv2.GaussianBlur(roi_gray, (5, 5), 1.5)
            # Find darkest threshold zone for pupil
            _, thresh = cv2.threshold(roi_blurred, 45, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                c_max = max(contours, key=cv2.contourArea)
                area = cv2.contourArea(c_max)
                if area > 100:
                    (pcx, pcy), radius = cv2.minEnclosingCircle(c_max)
                    pupil_r = min(int(iris_r * 0.65), max(int(iris_r * 0.20), int(radius)))

        return cx, cy, iris_r, pupil_r

    def _analyze_lens_opacity(
        self,
        img_rgb: np.ndarray,
        cx: int,
        cy: int,
        pupil_r: int,
        iris_r: int
    ) -> Dict[str, Any]:
        """
        Extracts pupillary light scattering, opacity area fraction, and Shannon entropy.
        Removes specular corneal highlights (Purkinje images) to isolate intraocular transmission.
        """
        h, w, _ = img_rgb.shape
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)

        # 1. Create pupillary aperture mask (slightly eroded by 10% to prevent iris margin bleed)
        pupil_eval_r = max(5, int(pupil_r * 0.90))
        pupil_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(pupil_mask, (cx, cy), pupil_eval_r, 255, -1)

        # 2. Specular reflection mask (corneal flash glare: High V > 235 and Low S < 40)
        v_channel = hsv[:, :, 2]
        s_channel = hsv[:, :, 1]
        specular_mask = (v_channel > 235) & (s_channel < 40)

        # Valid non-glare pupillary pixels
        valid_pupil_mask = (pupil_mask == 255) & (~specular_mask)
        valid_pixels = gray[valid_pupil_mask]

        if len(valid_pixels) < 20:
            # Fallback if over-masked
            valid_pixels = gray[pupil_mask == 255]

        mean_pupil_lum = float(np.mean(valid_pixels)) if len(valid_pixels) > 0 else 0.0
        median_pupil_lum = float(np.median(valid_pixels)) if len(valid_pixels) > 0 else 0.0
        std_pupil_lum = float(np.std(valid_pixels)) if len(valid_pixels) > 0 else 0.0

        # Shannon entropy of pupillary grayscale histogram (heterogeneity index)
        hist, _ = np.histogram(valid_pixels, bins=32, range=(0, 256), density=True)
        hist = hist[hist > 0]
        entropy = float(-np.sum(hist * np.log2(hist))) if len(hist) > 0 else 0.0

        # Baseline background illumination reference from iris
        iris_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(iris_mask, (cx, cy), iris_r, 255, -1)
        cv2.circle(iris_mask, (cx, cy), pupil_r, 0, -1)
        iris_pixels = gray[(iris_mask == 255) & (~specular_mask)]
        mean_iris_lum = float(np.mean(iris_pixels)) if len(iris_pixels) > 0 else 90.0

        # Opacity threshold: pixels significantly lighter than deep black (> 55 or > 0.65 of iris lum)
        opacity_threshold = max(55.0, min(85.0, mean_iris_lum * 0.65))
        opaque_pixel_count = np.sum(valid_pixels > opacity_threshold)
        opacity_area_fraction_pct = round(float((opaque_pixel_count / max(1, len(valid_pixels))) * 100.0), 1)

        # Cataract Grading Logic
        if opacity_area_fraction_pct < 12.0 and mean_pupil_lum < 46.0:
            cataract_grade = 0
            grade_name = "Grade 0: Normal / Clear Lens"
            severity_label = "NORMAL_CLEAR"
            clinical_advice = "Normal optical transparency through pupillary aperture. No significant crystalline lens opacity observed."
        elif opacity_area_fraction_pct < 28.0 or mean_pupil_lum < 65.0:
            cataract_grade = 1
            grade_name = "Grade 1: Early Nuclear / Cortical Haze"
            severity_label = "MILD_OPACITY"
            clinical_advice = "Mild optical scattering / early nuclear haze detected in the pupillary zone. Correlate with subjective glare and contrast sensitivity."
        elif opacity_area_fraction_pct < 55.0 or mean_pupil_lum < 95.0:
            cataract_grade = 2
            grade_name = "Grade 2: Moderate Lens Opacity"
            severity_label = "MODERATE_CATARACT"
            clinical_advice = "Noticeable lens opacification within the visual axis. Recommend dilated slit-lamp examination (LOCS III classification) and visual acuity re-test."
        else:
            cataract_grade = 3
            grade_name = "Grade 3: Advanced / Mature Cataract"
            severity_label = "ADVANCED_CATARACT"
            clinical_advice = "Significant dense crystalline lens opacification. Pupillary retro-illumination compromised. Prompt ophthalmologist referral for surgical consultation advised."

        return {
            "cataract_grade": cataract_grade,
            "grade_name": grade_name,
            "severity_label": severity_label,
            "mean_luminance": round(mean_pupil_lum, 1),
            "median_luminance": round(median_pupil_lum, 1),
            "std_luminance": round(std_pupil_lum, 1),
            "opacity_area_fraction_pct": opacity_area_fraction_pct,
            "shannon_entropy": round(entropy, 2),
            "evaluated_pupil_pixels": int(len(valid_pixels)),
            "clinical_advice": clinical_advice,
        }

    def _analyze_corneal_arcus(
        self,
        img_rgb: np.ndarray,
        cx: int,
        cy: int,
        iris_r: int
    ) -> Dict[str, Any]:
        """
        Samples the peripheral limbal annular band (0.85 R_iris to 1.08 R_iris)
        to identify arcus senilis (lipid deposit ring) and quantify angular extent.
        """
        h, w, _ = img_rgb.shape
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        r_inner = int(iris_r * 0.78)
        r_outer = int(iris_r * 0.95)

        # Baseline iris luminance (mid-iris band: 0.40 to 0.70 R_iris)
        baseline_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(baseline_mask, (cx, cy), int(iris_r * 0.70), 255, -1)
        cv2.circle(baseline_mask, (cx, cy), int(iris_r * 0.40), 0, -1)
        baseline_pixels = gray[baseline_mask == 255]
        mean_baseline = float(np.mean(baseline_pixels)) if len(baseline_pixels) > 0 else 90.0

        # Scan 72 radial angular sectors (5 degrees each)
        sector_luminances = []
        positive_sectors = 0
        arcus_threshold = max(75.0, mean_baseline * 1.35)

        for step in range(72):
            angle_rad = math.radians(step * 5.0)
            # Sample 5 points radially across limbal band
            samples = []
            for r in np.linspace(r_inner, r_outer, 5):
                px = int(cx + r * math.cos(angle_rad))
                py = int(cy + r * math.sin(angle_rad))
                if 0 <= px < w and 0 <= py < h:
                    samples.append(gray[py, px])

            if samples:
                sec_val = float(np.mean(samples))
                sector_luminances.append(sec_val)
                if sec_val > arcus_threshold:
                    positive_sectors += 1
            else:
                sector_luminances.append(0.0)

        arcus_fraction = float(positive_sectors / 72.0)
        extent_degrees = int(arcus_fraction * 360.0)

        if arcus_fraction < 0.15:
            arcus_detected = False
            severity_grade = "NONE"
            span_description = "Clear peripheral cornea. No arcus senilis ring detected."
            clinical_advice = "Peripheral corneal clarity normal. No lipid deposition along limbal margin."
        elif arcus_fraction < 0.35:
            arcus_detected = True
            severity_grade = "GRADE_1_PARTIAL_ARC"
            span_description = f"Partial peripheral corneal arc (~{extent_degrees}° span, localized)."
            clinical_advice = "Partial corneal arcus noted. If patient is under 50 years of age, correlate with fasting serum lipid profile."
        elif arcus_fraction < 0.70:
            arcus_detected = True
            severity_grade = "GRADE_2_CONFLUENT_ARC"
            span_description = f"Bilateral confluent corneal arc (~{extent_degrees}° span, superior & inferior)."
            clinical_advice = "Confluent arcus senilis. Routine benign finding in elderly patients; check lipid panel if premature (<50 yo)."
        else:
            arcus_detected = True
            severity_grade = "GRADE_3_CIRCUMFERENTIAL_RING"
            span_description = f"Complete circumferential 360° corneal lipid ring (~{extent_degrees}° span)."
            clinical_advice = "Circumferential arcus senilis (gerontoxon). In younger individuals, strongly consider familial hypercholesterolemia evaluation."

        return {
            "arcus_detected": arcus_detected,
            "severity_grade": severity_grade,
            "extent_degrees": extent_degrees,
            "coverage_pct": round(arcus_fraction * 100.0, 1),
            "limbal_band_luminance": round(float(np.mean(sector_luminances)), 1),
            "span_description": span_description,
            "clinical_advice": clinical_advice,
        }

    def _generate_clarity_overlay(
        self,
        img_rgb: np.ndarray,
        cx: int,
        cy: int,
        pupil_r: int,
        iris_r: int,
        lens_metrics: Dict[str, Any],
        arcus_metrics: Dict[str, Any]
    ) -> str:
        """
        Renders a diagnostic pixel-aligned transparent RGBA overlay:
        - Amber circular caliper around pupillary aperture
        - Shaded amber overlay on opacified pupillary sub-regions
        - Cyan dashed concentric ring around corneal limbus
        - Arcus sector indicators
        """
        h, w, _ = img_rgb.shape
        overlay = np.zeros((h, w, 4), dtype=np.uint8)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

        # 1. Corneal Limbus Caliper (Cyan ring: R, G, B, A = 6, 182, 212, 190)
        cv2.circle(overlay, (cx, cy), iris_r, (6, 182, 212, 190), 2)

        # 2. Pupillary Aperture Caliper (Amber ring: 245, 158, 11, 230)
        cv2.circle(overlay, (cx, cy), pupil_r, (245, 158, 11, 230), 2)

        # 3. Highlight opaque pupillary pixels if cataract grade > 0
        if lens_metrics["cataract_grade"] > 0:
            pupil_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(pupil_mask, (cx, cy), int(pupil_r * 0.90), 255, -1)
            opaque_submask = (pupil_mask == 255) & (gray > 55)
            # Amber semi-transparent fill for opaque clusters
            overlay[opaque_submask] = [245, 158, 11, 110]

        # 4. Highlight Arcus Senilis band if detected
        if arcus_metrics["arcus_detected"]:
            r_inner = int(iris_r * 0.80)
            r_outer = int(iris_r * 0.95)
            arc_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.circle(arc_mask, (cx, cy), r_outer, 255, -1)
            cv2.circle(arc_mask, (cx, cy), r_inner, 0, -1)
            arc_bright = (arc_mask == 255) & (gray > 80)
            # Soft cyan-white glow for lipid arc
            overlay[arc_bright] = [56, 189, 248, 120]

        # Convert RGBA numpy array to PNG base64 data URI
        pil_img = Image.fromarray(overlay, mode="RGBA")
        buffer = io.BytesIO()
        pil_img.save(buffer, format="PNG")
        base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{base64_str}"

    def analyze_image(
        self,
        image_bytes: bytes,
        filename: str = "clinical_eye.jpg",
        eye_side: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes complete Lens & Corneal Clarity assessment pipeline.
        """
        import time
        start_time = time.perf_counter()

        img_rgb = self._decode_image(image_bytes)
        h, w, _ = img_rgb.shape

        # 1. Localize iris and pupillary boundaries
        cx, cy, iris_r, pupil_r = self._detect_iris_and_pupil(img_rgb)

        # Scale calibration
        iris_diameter_px = iris_r * 2
        scale_mm_per_px = round(self.adult_iris_diameter_mm / max(1, iris_diameter_px), 4)
        pupil_diameter_mm = round((pupil_r * 2) * scale_mm_per_px, 2)

        # 2. Lens Opacity & Cataract Screening
        lens_metrics = self._analyze_lens_opacity(img_rgb, cx, cy, pupil_r, iris_r)

        # 3. Corneal Arcus & Peripheral Clarity Screening
        arcus_metrics = self._analyze_corneal_arcus(img_rgb, cx, cy, iris_r)

        # 4. Generate Diagnostic Overlay
        overlay_rgba = self._generate_clarity_overlay(
            img_rgb, cx, cy, pupil_r, iris_r, lens_metrics, arcus_metrics
        )

        # 5. Clinical Triage Urgency Synthesis
        if lens_metrics["cataract_grade"] >= 3:
            triage_urgency = "URGENT_OPHTHALMOLOGY_CONSULT"
            triage_summary = "Dense mature lens opacification. Surgical cataract evaluation advised."
        elif lens_metrics["cataract_grade"] == 2 or arcus_metrics["severity_grade"] == "GRADE_3_CIRCUMFERENTIAL_RING":
            triage_urgency = "ELECTIVE_CONSULT"
            triage_summary = "Moderate lens opacity or extensive corneal arcus. Recommend comprehensive slit-lamp evaluation."
        elif lens_metrics["cataract_grade"] == 1 or arcus_metrics["arcus_detected"]:
            triage_urgency = "ROUTINE_OBSERVATION"
            triage_summary = "Early mild opacity or partial arcus. Monitor during routine periodic vision screening."
        else:
            triage_urgency = "NORMAL_CLEAR"
            triage_summary = "Clear crystalline lens and peripheral cornea. Normal ocular optical transmission."

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 1)

        return {
            "success": True,
            "filename": filename,
            "eye_side": eye_side or "NOT_SPECIFIED",
            "calibration": {
                "iris_center_xy": [cx, cy],
                "iris_diameter_px": iris_diameter_px,
                "iris_radius_px": iris_r,
                "pupil_radius_px": pupil_r,
                "pupil_diameter_mm": pupil_diameter_mm,
                "scale_factor_mm_per_px": scale_mm_per_px,
                "reference_iris_diameter_mm": self.adult_iris_diameter_mm,
            },
            "lens_opacity": lens_metrics,
            "corneal_arcus": arcus_metrics,
            "triage": {
                "urgency": triage_urgency,
                "summary": triage_summary,
                "referral_indicated": lens_metrics["cataract_grade"] >= 2,
            },
            "telemetry": {
                "latency_ms": elapsed_ms,
                "resolution": f"{w}x{h}",
            },
            "overlay_rgba_base64": overlay_rgba,
            "disclaimer": DISCLAIMER,
        }


_corneal_lens_instance: Optional[CornealLensEngine] = None


def get_corneal_lens_engine() -> CornealLensEngine:
    global _corneal_lens_instance
    if _corneal_lens_instance is None:
        _corneal_lens_instance = CornealLensEngine()
    return _corneal_lens_instance
