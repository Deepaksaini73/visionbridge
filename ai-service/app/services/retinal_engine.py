"""
VisionBridge Milestone 5.4: Production Retinal Foundation AI Engine
Integrates FLAIR (jusiro2/FLAIR) for zero-shot clinical decision-support on retinal fundus photographs.
Evaluates Diabetic Retinopathy, Macular Edema, Macular Holes, AMD, Glaucoma, and Vascular Occlusions.
CPU Execution: ~1.6 - 2.5s per image.
License: Apache 2.0.
Non-Diagnostic Disclaimer: Technical clinical decision-support only. Not a medical diagnosis.
"""

import os
import sys
import io
import time
import base64
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import cv2
from PIL import Image

# Ensure offline operation using local cached weights
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

DISCLAIMER = (
    "PRELIMINARY RETINAL FUNDUS TELEMETRY FOR CLINICAL DECISION SUPPORT. "
    "DOES NOT CONSTITUTE A MEDICAL DIAGNOSIS OF DIABETIC RETINOPATHY, GLAUCOMA, OR MACULOPATHY. "
    "REQUIRES FORMAL REVIEW AND CORROBORATION BY AN ACCREDITED OPTOMETRIST OR OPHTHALMOLOGIST."
)

# Standardized Clinical Candidate Prompts
CLINICAL_PROMPT_CATEGORIES = {
    "diabetic_retinopathy": [
        "normal retinal fundus without diabetic retinopathy",
        "mild non-proliferative diabetic retinopathy with microaneurysms",
        "moderate non-proliferative diabetic retinopathy with retinal hemorrhages",
        "severe diabetic retinopathy",
        "proliferative diabetic retinopathy with neovascularization"
    ],
    "macular_pathology": [
        "healthy normal macula with crisp foveal reflex",
        "diabetic macular edema with lipid exudates",
        "full-thickness macular hole with foveal defect",
        "age-related macular degeneration with confluent drusen",
        "epiretinal membrane with retinal surface wrinkling"
    ],
    "glaucoma_screening": [
        "normal optic disc and healthy neuroretinal rim",
        "glaucomatous optic neuropathy with marked optic cup enlargement"
    ],
    "vascular_occlusion": [
        "normal retinal vascular caliber",
        "retinal vein occlusion with widespread flame hemorrhages",
        "retinal artery occlusion with cherry red spot"
    ]
}

# Master list of benchmark conditions for Top-1 zero-shot matching
MASTER_CONDITIONS = [
    "normal retinal fundus",
    "diabetic retinopathy",
    "macular edema",
    "macular hole",
    "age-related macular degeneration",
    "glaucoma",
    "retinal vein occlusion"
]


class RetinalFoundationEngine:
    def __init__(self):
        self.model = None
        self._is_loading = False
        self._load_error = None

    def _ensure_model_loaded(self):
        """Lazily load FLAIR model into memory upon first inference request."""
        if self.model is not None:
            return

        try:
            from flair import FLAIRModel
            import torch

            # Multithreaded CPU optimization
            torch.set_num_threads(max(1, os.cpu_count() or 4))
            self.model = FLAIRModel.from_pretrained("jusiro2/FLAIR")
            self.model.eval()
            self._load_error = None
        except Exception as exc:
            self._load_error = str(exc)
            raise RuntimeError(f"Failed to initialize FLAIR retinal model: {exc}")

    def _decode_image(self, image_bytes: bytes) -> np.ndarray:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Failed to decode image bytes into valid raster image.")
        return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    def validate_fundus_domain(self, img_rgb: np.ndarray) -> Tuple[bool, Dict[str, Any]]:
        """
        Pre-flight domain gate to verify the image exhibits Color Fundus Photography (CFP) characteristics.
        Prevents running retinal models on selfies, skin photos, or anterior segment photos.
        """
        h, w, _ = img_rgb.shape
        r = img_rgb[:, :, 0].astype(np.float32)
        g = img_rgb[:, :, 1].astype(np.float32)
        b = img_rgb[:, :, 2].astype(np.float32)

        mean_r = float(np.mean(r))
        mean_b = float(np.mean(b))
        red_to_blue_ratio = mean_r / (mean_b + 1e-5)

        # Check for circular optical aperture (perimeter darkness)
        border_thickness = max(4, int(min(h, w) * 0.05))
        top_border = img_rgb[:border_thickness, :, :]
        bottom_border = img_rgb[-border_thickness:, :, :]
        left_border = img_rgb[:, :border_thickness, :]
        right_border = img_rgb[:, -border_thickness:, :]

        border_pixels = np.vstack([
            top_border.reshape(-1, 3),
            bottom_border.reshape(-1, 3),
            left_border.reshape(-1, 3),
            right_border.reshape(-1, 3)
        ])
        dark_pixels = np.sum(np.mean(border_pixels, axis=1) < 45)
        perimeter_dark_fraction = float(dark_pixels / len(border_pixels))

        # Fundus criteria: Red reflectance dominates blue (>1.65) and circular dark mask or dark borders
        is_fundus = (red_to_blue_ratio > 1.65) and (perimeter_dark_fraction > 0.25 or mean_b < 65)

        details = {
            "red_to_blue_ratio": round(red_to_blue_ratio, 2),
            "perimeter_dark_fraction": round(perimeter_dark_fraction, 2),
            "mean_luminance": round(float(np.mean(img_rgb)), 1),
            "is_fundus": is_fundus
        }
        return is_fundus, details

    def _evaluate_prompts(
        self, img_rgb: np.ndarray, text_prompts: List[str]
    ) -> List[Dict[str, Any]]:
        """Executes FLAIR forward pass for a given list of clinical candidate prompts."""
        probs, logits = self.model(img_rgb, text_prompts)
        probs_np = np.asarray(probs).flatten()
        logits_np = np.asarray(logits).flatten()

        results = []
        for i, prompt in enumerate(text_prompts):
            results.append({
                "prompt": prompt,
                "probability_pct": round(float(probs_np[i] * 100.0), 2),
                "logit": round(float(logits_np[i]), 2)
            })

        # Sort descending by probability
        results.sort(key=lambda x: x["probability_pct"], reverse=True)
        return results

    def _generate_fundus_overlay(
        self, img_rgb: np.ndarray, top_condition: str, top_confidence: float
    ) -> str:
        """
        Renders a diagnostic fundus overlay:
        - Outlines circular field of view
        - Burns clinical decision-support telemetry banner
        """
        h, w, _ = img_rgb.shape
        overlay = np.zeros((h, w, 4), dtype=np.uint8)

        # Draw telecentric circular border
        cx, cy = w // 2, h // 2
        radius = int(min(w, h) * 0.46)
        cv2.circle(overlay, (cx, cy), radius, (6, 182, 212, 180), 2)  # Cyan boundary

        # Center foveal reference circle
        cv2.circle(overlay, (cx, cy), 14, (245, 158, 11, 200), 1)     # Amber foveal ring
        cv2.circle(overlay, (cx, cy), 2, (255, 255, 255, 220), -1)

        # Burn banner text
        banner_text = f"FLAIR AI: {top_condition.upper()} ({top_confidence:.1f}%)"
        cv2.putText(
            overlay,
            banner_text,
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
        filename: str = "fundus_capture.jpg",
        eye_side: Optional[str] = None,
        force_inference: bool = False
    ) -> Dict[str, Any]:
        """
        Performs comprehensive zero-shot retinal foundation analysis on a fundus photograph.
        """
        img_rgb = self._decode_image(image_bytes)

        # 1. Modality Pre-Flight Domain Gate
        is_fundus, domain_metrics = self.validate_fundus_domain(img_rgb)
        if not is_fundus and not force_inference:
            return {
                "success": False,
                "is_fundus_image": False,
                "filename": filename,
                "eye_side": eye_side or "NOT_SPECIFIED",
                "error": (
                    "DOMAIN_MISMATCH: The provided image does not exhibit standard color retinal fundus characteristics. "
                    "FLAIR is a retinal foundation model and must only be executed on color fundus photographs (CFP). "
                    "For external eye or anterior segment photographs, please use EyeCapture AI or Adnexal Telemetry."
                ),
                "domain_metrics": domain_metrics,
                "disclaimer": DISCLAIMER
            }

        # 2. Ensure model weights are loaded
        self._ensure_model_loaded()

        start_time = time.perf_counter()

        # 3. Master Condition Zero-Shot Retrieval
        master_results = self._evaluate_prompts(img_rgb, MASTER_CONDITIONS)
        top_condition = master_results[0]["prompt"]
        top_confidence = master_results[0]["probability_pct"]

        # 4. Category-Specific Evaluations
        dr_results = self._evaluate_prompts(img_rgb, CLINICAL_PROMPT_CATEGORIES["diabetic_retinopathy"])
        macula_results = self._evaluate_prompts(img_rgb, CLINICAL_PROMPT_CATEGORIES["macular_pathology"])
        glaucoma_results = self._evaluate_prompts(img_rgb, CLINICAL_PROMPT_CATEGORIES["glaucoma_screening"])
        vascular_results = self._evaluate_prompts(img_rgb, CLINICAL_PROMPT_CATEGORIES["vascular_occlusion"])

        inference_duration_ms = round((time.perf_counter() - start_time) * 1000, 1)

        # 5. Extract Pathology Flags & Triage Recommendation
        dr_top = dr_results[0]["prompt"]
        has_dr = "without" not in dr_top and "normal" not in dr_top
        referable_dr = has_dr and any(k in dr_top for k in ["moderate", "severe", "proliferative"])

        macula_top = macula_results[0]["prompt"]
        has_maculopathy = "healthy" not in macula_top and "normal" not in macula_top

        glaucoma_top = glaucoma_results[0]["prompt"]
        glaucoma_suspected = "neuropathy" in glaucoma_top or "enlargement" in glaucoma_top

        # Triage urgency calculation
        if "proliferative" in dr_top or "macular hole" in macula_top or "artery occlusion" in vascular_results[0]["prompt"]:
            triage_urgency = "URGENT_RETINA_SPECIALIST"
            clinical_advice = "Urgent specialist retinal consultation advised for advanced pathology evaluation."
        elif referable_dr or has_maculopathy or glaucoma_suspected:
            triage_urgency = "ELECTIVE_OPHTHALMOLOGY_CONSULT"
            clinical_advice = "Referral for dilated slit-lamp biomicroscopy and OCT examination recommended within 2 to 4 weeks."
        else:
            triage_urgency = "ROUTINE_OBSERVATION"
            clinical_advice = "Normal retinal findings observed. Continue routine annual optometric screening."

        # 6. Generate Diagnostic Overlay
        overlay_rgba = self._generate_fundus_overlay(img_rgb, top_condition, top_confidence)

        return {
            "success": True,
            "is_fundus_image": True,
            "filename": filename,
            "eye_side": eye_side or "NOT_SPECIFIED",
            "model_metadata": {
                "model_name": "FLAIR (Foundation Language-Image Model of the Retina)",
                "checkpoint": "jusiro2/FLAIR",
                "parameters": "133.26M",
                "vision_encoder": "ResNet-50",
                "text_encoder": "Bio_ClinicalBERT",
                "embedding_dimension": 512,
                "latency_ms": inference_duration_ms
            },
            "domain_metrics": domain_metrics,
            "primary_assessment": {
                "top_condition": top_condition,
                "confidence_pct": top_confidence,
                "master_ranking": master_results
            },
            "clinical_categories": {
                "diabetic_retinopathy": {
                    "top_stage": dr_top,
                    "confidence_pct": dr_results[0]["probability_pct"],
                    "referable_dr": referable_dr,
                    "all_stages": dr_results
                },
                "macular_integrity": {
                    "top_finding": macula_top,
                    "confidence_pct": macula_results[0]["probability_pct"],
                    "referable_maculopathy": has_maculopathy,
                    "all_findings": macula_results
                },
                "glaucoma_screening": {
                    "top_finding": glaucoma_top,
                    "confidence_pct": glaucoma_results[0]["probability_pct"],
                    "glaucoma_suspected": glaucoma_suspected,
                    "all_findings": glaucoma_results
                },
                "vascular_occlusion": {
                    "top_finding": vascular_results[0]["prompt"],
                    "confidence_pct": vascular_results[0]["probability_pct"],
                    "all_findings": vascular_results
                }
            },
            "decision_support": {
                "triage_urgency": triage_urgency,
                "referral_indicated": referable_dr or has_maculopathy or glaucoma_suspected,
                "clinical_advice": clinical_advice
            },
            "overlay_rgba_base64": overlay_rgba,
            "disclaimer": DISCLAIMER
        }


_retinal_engine_instance: Optional[RetinalFoundationEngine] = None


def get_retinal_engine() -> RetinalFoundationEngine:
    global _retinal_engine_instance
    if _retinal_engine_instance is None:
        _retinal_engine_instance = RetinalFoundationEngine()
    return _retinal_engine_instance
