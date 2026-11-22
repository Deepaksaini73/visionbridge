"""
VisionBridge EyeCapture AI — Ocular Anatomy Segmentation Engine.
Milestone 5.1 — 4-Class Anterior Segment Segmentation & Interactive Overlays.

Classes:
0: Periocular skin / background
1: Sclera (conjunctival boundary)
2: Iris (limbic margin)
3: Pupil (central aperture)

Architecture:
- Clean-room PyTorch lightweight U-Net baseline for CPU execution.
- Deterministic OpenCV anatomical fallback (Hough circles + adaptive thresholding)
  when neural weights are offline or uninitialized.
- Transparent RGBA overlay generator with base64 PNG export for web viewing.
- Non-clinical geometric telemetry (pupil-to-iris ratio, detected diameters).

Ethical & Regulatory Disclaimer:
- Strictly technical anatomical visualization assistance.
- NEVER makes clinical claims (e.g. no cataract, glaucoma, or spectacle prescriptions).
- Licensed optometrist retains final clinical review authority.
"""

import io
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger("visionbridge-ai.segmentation")

# 4 Semantic Classes
CLASS_BG = 0
CLASS_SCLERA = 1
CLASS_IRIS = 2
CLASS_PUPIL = 3

CLASS_LABELS = {
    CLASS_BG: "Periocular Background",
    CLASS_SCLERA: "Sclera",
    CLASS_IRIS: "Iris",
    CLASS_PUPIL: "Pupil",
}

# RGBA palette: (R, G, B, Alpha [0..255])
RGBA_PALETTE = {
    CLASS_BG: (0, 0, 0, 0),             # Transparent
    CLASS_SCLERA: (0, 220, 255, 110),   # Cyan
    CLASS_IRIS: (16, 215, 120, 110),    # Emerald
    CLASS_PUPIL: (255, 45, 85, 135),    # Crimson
}


class ConvBlock(nn.Module):
    """Depthwise-separable convolutional block for fast CPU inference."""
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.conv = nn.Sequential(
            # Depthwise
            nn.Conv2d(in_ch, in_ch, kernel_size=3, padding=1, groups=in_ch, bias=False),
            # Pointwise
            nn.Conv2d(in_ch, out_ch, kernel_size=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            # Second layer
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, groups=out_ch, bias=False),
            nn.Conv2d(out_ch, out_ch, kernel_size=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


class LightweightOcularUNet(nn.Module):
    """
    Clean-room 4-class lightweight U-Net for anterior ocular segmentation.
    Optimized for sub-100ms CPU execution on 256x256 tensors.
    """
    def __init__(self, in_channels: int = 3, num_classes: int = 4):
        super().__init__()
        # Encoder
        self.enc1 = ConvBlock(in_channels, 24)
        self.pool1 = nn.MaxPool2d(2)

        self.enc2 = ConvBlock(24, 48)
        self.pool2 = nn.MaxPool2d(2)

        self.enc3 = ConvBlock(48, 96)
        self.pool3 = nn.MaxPool2d(2)

        # Bottleneck
        self.bottleneck = ConvBlock(96, 128)

        # Decoder
        self.up3 = nn.ConvTranspose2d(128, 96, kernel_size=2, stride=2)
        self.dec3 = ConvBlock(96 + 96, 96)

        self.up2 = nn.ConvTranspose2d(96, 48, kernel_size=2, stride=2)
        self.dec2 = ConvBlock(48 + 48, 48)

        self.up1 = nn.ConvTranspose2d(48, 24, kernel_size=2, stride=2)
        self.dec1 = ConvBlock(24 + 24, 24)

        # Final 1x1 classifier
        self.classifier = nn.Conv2d(24, num_classes, kernel_size=1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Encoder
        e1 = self.enc1(x)
        p1 = self.pool1(e1)

        e2 = self.enc2(p1)
        p2 = self.pool2(e2)

        e3 = self.enc3(p2)
        p3 = self.pool3(e3)

        # Bottleneck
        b = self.bottleneck(p3)

        # Decoder with skip connections
        d3 = self.up3(b)
        d3 = torch.cat([d3, e3], dim=1)
        d3 = self.dec3(d3)

        d2 = self.up2(d3)
        d2 = torch.cat([d2, e2], dim=1)
        d2 = self.dec2(d2)

        d1 = self.up1(d2)
        d1 = torch.cat([d1, e1], dim=1)
        d1 = self.dec1(d1)

        logits = self.classifier(d1)
        return logits


class OcularSegmentationEngine:
    """
    Manages anterior eye segmentation, telemetry calculation,
    and transparent RGBA overlay generation.
    """

    def __init__(self, weights_path: Optional[str] = None, device: str = "cpu"):
        self.device = torch.device(device)
        self.target_size = (256, 256)
        self.model = LightweightOcularUNet(in_channels=3, num_classes=4).to(self.device)
        self.model.eval()
        self.has_trained_weights = False
        self.weights_path = weights_path

        if weights_path and Path(weights_path).exists():
            try:
                ckpt = torch.load(weights_path, map_location=self.device)
                state = ckpt.get("model_state_dict", ckpt)
                self.model.load_state_dict(state)
                self.has_trained_weights = True
                logger.info("Loaded ocular segmentation weights from %s", weights_path)
            except Exception as e:
                logger.warning("Failed to load segmentation weights from %s: %s", weights_path, e)

    def segment_image(
        self,
        image_bytes: bytes,
        filename: str = "ocular_capture.jpg",
    ) -> Dict[str, Any]:
        """
        Segment eye anatomy into Sclera, Iris, and Pupil.
        Returns class mask, telemetry, and base64 RGBA overlays.
        """
        # Decode original image
        img_arr = np.frombuffer(image_bytes, dtype=np.uint8)
        img_bgr = cv2.imdecode(img_arr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            # Fallback PIL
            try:
                pil_img = Image.open(io.BytesIO(image_bytes))
                img_rgb = np.array(pil_img.convert("RGB"))
            except Exception as exc:
                return {
                    "success": False,
                    "error": f"Failed to decode image bytes: {str(exc)}",
                    "filename": filename,
                }
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        orig_h, orig_w = img_rgb.shape[:2]

        if self.has_trained_weights:
            mask_2d, method = self._infer_pytorch(img_rgb)
        else:
            # Deterministic OpenCV anatomical localization fallback
            mask_2d, method = self._infer_opencv_heuristic(img_rgb)

        # Resize mask back to original resolution if needed
        if mask_2d.shape != (orig_h, orig_w):
            mask_2d = cv2.resize(
                mask_2d, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST
            )

        # Extract non-clinical anatomical telemetry
        telemetry = self._extract_telemetry(mask_2d, orig_w, orig_h)

        # Generate base64 RGBA transparent overlay and blended preview
        overlay_b64, blended_b64 = self._create_overlay_images(img_rgb, mask_2d)

        # Calculate class coverage percentages
        total_pixels = mask_2d.size
        coverage = {
            "background_pct": round(float(np.sum(mask_2d == CLASS_BG) / total_pixels * 100.0), 2),
            "sclera_pct": round(float(np.sum(mask_2d == CLASS_SCLERA) / total_pixels * 100.0), 2),
            "iris_pct": round(float(np.sum(mask_2d == CLASS_IRIS) / total_pixels * 100.0), 2),
            "pupil_pct": round(float(np.sum(mask_2d == CLASS_PUPIL) / total_pixels * 100.0), 2),
        }

        return {
            "success": True,
            "filename": filename,
            "inference_method": method,
            "original_dimensions": [orig_w, orig_h],
            "coverage": coverage,
            "telemetry": telemetry,
            "overlay_rgba_base64": overlay_b64,
            "blended_preview_base64": blended_b64,
            "class_palette": {
                "sclera": "rgba(0, 220, 255, 0.43)",
                "iris": "rgba(16, 215, 120, 0.43)",
                "pupil": "rgba(255, 45, 85, 0.53)",
            },
            "disclaimer": (
                "Anterior anatomical segmentation and geometric indicators are provided for "
                "technical visual assistance only. They do not substitute for comprehensive "
                "in-person slit-lamp biomicroscopy or professional optometrist evaluation."
            ),
        }

    def _infer_pytorch(self, img_rgb: np.ndarray) -> Tuple[np.ndarray, str]:
        """Perform neural inference on resized tensor."""
        resized = cv2.resize(img_rgb, self.target_size, interpolation=cv2.INTER_LINEAR)
        # Normalize ImageNet mean/std
        t = torch.from_numpy(resized).permute(2, 0, 1).float() / 255.0
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        t = (t - mean) / std
        t = t.unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(t)
            preds = torch.argmax(logits, dim=1).squeeze(0).cpu().numpy().astype(np.uint8)

        return preds, "pytorch_unet_inference"

    def _infer_opencv_heuristic(self, img_rgb: np.ndarray) -> Tuple[np.ndarray, str]:
        """
        Deterministic computer-vision anterior ocular localization:
        - Locates iris via circular Hough transform & intensity gradient
        - Locates central pupil aperture via adaptive thresholding within iris bounds
        - Identifies lateral and medial scleral regions via high-reflectance thresholding
        """
        h, w = img_rgb.shape[:2]
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        mask = np.zeros((h, w), dtype=np.uint8)

        # Smooth to reduce noise
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)

        # Iris search parameters relative to image dimensions
        min_radius = int(min(h, w) * 0.10)
        max_radius = int(min(h, w) * 0.40)

        # Hough Circle Transform for iris candidate
        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=int(min(h, w) * 0.3),
            param1=80,
            param2=30,
            minRadius=min_radius,
            maxRadius=max_radius,
        )

        iris_found = False
        center_x, center_y, iris_r = w // 2, h // 2, int(min(h, w) * 0.22)

        if circles is not None:
            c = np.round(circles[0, :]).astype(int)
            # Find circle closest to image center
            center_dist = [np.hypot(c_i[0] - w / 2, c_i[1] - h / 2) for c_i in c]
            best_idx = int(np.argmin(center_dist))
            candidate = c[best_idx]
            # Ensure candidate center is within central 70% of image
            if (0.15 * w < candidate[0] < 0.85 * w) and (0.15 * h < candidate[1] < 0.85 * h):
                center_x, center_y, iris_r = candidate[0], candidate[1], candidate[2]
                iris_found = True

        # Draw Iris region
        cv2.circle(mask, (center_x, center_y), iris_r, CLASS_IRIS, -1)

        # Pupil detection inside iris bounding box
        x1 = max(0, center_x - iris_r)
        y1 = max(0, center_y - iris_r)
        x2 = min(w, center_x + iris_r)
        y2 = min(h, center_y + iris_r)

        iris_roi_gray = gray[y1:y2, x1:x2]
        if iris_roi_gray.size > 0:
            # Pupil is the darkest central aperture
            # Estimate pupil threshold as 1.5x minimum value inside ROI
            min_val = np.min(iris_roi_gray)
            pupil_thresh_val = min(int(min_val * 1.6 + 15), 65)
            _, pupil_bin = cv2.threshold(iris_roi_gray, pupil_thresh_val, 255, cv2.THRESH_BINARY_INV)

            # Circular mask for ROI to ensure pupil is inside iris
            roi_h, roi_w = iris_roi_gray.shape
            roi_mask = np.zeros((roi_h, roi_w), dtype=np.uint8)
            cv2.circle(
                roi_mask,
                (center_x - x1, center_y - y1),
                int(iris_r * 0.75),
                255,
                -1,
            )
            pupil_bin = cv2.bitwise_and(pupil_bin, roi_mask)

            # Find largest pupil contour
            contours, _ = cv2.findContours(pupil_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest_cnt = max(contours, key=cv2.contourArea)
                if cv2.contourArea(largest_cnt) > (iris_r * iris_r * 0.05):
                    # Offset contour back to image coordinate frame
                    offset_cnt = largest_cnt + np.array([x1, y1])
                    cv2.drawContours(mask, [offset_cnt], -1, CLASS_PUPIL, -1)
                else:
                    # Fallback geometric pupil
                    pupil_r = max(4, int(iris_r * 0.35))
                    cv2.circle(mask, (center_x, center_y), pupil_r, CLASS_PUPIL, -1)
            else:
                pupil_r = max(4, int(iris_r * 0.35))
                cv2.circle(mask, (center_x, center_y), pupil_r, CLASS_PUPIL, -1)
        else:
            pupil_r = max(4, int(iris_r * 0.35))
            cv2.circle(mask, (center_x, center_y), pupil_r, CLASS_PUPIL, -1)

        # Sclera detection: bright conjunctival region lateral/medial to iris
        # Sclera is typically characterized by high luminance and low saturation
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        sat = hsv[:, :, 1]
        val = hsv[:, :, 2]

        sclera_candidates = (val > 140) & (sat < 95) & (mask == CLASS_BG)

        # Restrict sclera search to horizontal band aligned with eye fissure
        band_y1 = max(0, center_y - int(iris_r * 1.25))
        band_y2 = min(h, center_y + int(iris_r * 1.25))
        band_x1 = max(0, center_x - int(iris_r * 3.0))
        band_x2 = min(w, center_x + int(iris_r * 3.0))

        band_mask = np.zeros((h, w), dtype=bool)
        band_mask[band_y1:band_y2, band_x1:band_x2] = True

        mask[sclera_candidates & band_mask] = CLASS_SCLERA

        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        sclera_bin = (mask == CLASS_SCLERA).astype(np.uint8)
        sclera_clean = cv2.morphologyEx(sclera_bin, cv2.MORPH_OPEN, kernel)
        sclera_clean = cv2.morphologyEx(sclera_clean, cv2.MORPH_CLOSE, kernel)
        mask[mask == CLASS_SCLERA] = CLASS_BG
        mask[sclera_clean == 1] = CLASS_SCLERA

        return mask, "opencv_anatomical_localization_fallback"

    def _extract_telemetry(self, mask: np.ndarray, w: int, h: int) -> Dict[str, Any]:
        """Compute non-clinical geometric indicators from segmented masks."""
        # Iris telemetry
        iris_pts = np.argwhere(mask == CLASS_IRIS)
        iris_detected = len(iris_pts) > 50
        iris_center = [w // 2, h // 2]
        iris_diameter_px = 0.0

        if iris_detected:
            # argwhere returns (row, col) = (y, x)
            iris_y, iris_x = iris_pts[:, 0], iris_pts[:, 1]
            iris_center = [int(np.mean(iris_x)), int(np.mean(iris_y))]
            # Approximate equivalent diameter = 2 * sqrt(Area / pi)
            iris_area = len(iris_pts)
            iris_diameter_px = round(2.0 * np.sqrt(iris_area / np.pi), 1)

        # Pupil telemetry
        pupil_pts = np.argwhere(mask == CLASS_PUPIL)
        pupil_detected = len(pupil_pts) > 10
        pupil_center = iris_center
        pupil_diameter_px = 0.0

        if pupil_detected:
            pupil_y, pupil_x = pupil_pts[:, 0], pupil_pts[:, 1]
            pupil_center = [int(np.mean(pupil_x)), int(np.mean(pupil_y))]
            pupil_area = len(pupil_pts)
            pupil_diameter_px = round(2.0 * np.sqrt(pupil_area / np.pi), 1)

        # Ratio
        ratio = round(pupil_diameter_px / iris_diameter_px, 3) if iris_diameter_px > 0 else 0.0

        return {
            "iris": {
                "detected": iris_detected,
                "center": iris_center,
                "estimated_diameter_px": iris_diameter_px,
            },
            "pupil": {
                "detected": pupil_detected,
                "center": pupil_center,
                "estimated_diameter_px": pupil_diameter_px,
            },
            "pupil_to_iris_ratio": ratio,
            "pupillary_symmetry_flag": "NORMAL_AMBIENT_RANGE" if (0.20 <= ratio <= 0.60) else "ASSESSMENT_SUGGESTED",
        }

    def _create_overlay_images(
        self, img_rgb: np.ndarray, mask: np.ndarray
    ) -> Tuple[str, str]:
        """
        Generate base64 data URLs for:
        1. Transparent RGBA overlay (can be superimposed directly in client canvas)
        2. Blended RGB preview for quick modal display
        """
        h, w = mask.shape
        rgba_overlay = np.zeros((h, w, 4), dtype=np.uint8)

        for class_idx, (r, g, b, a) in RGBA_PALETTE.items():
            if a > 0:
                match = (mask == class_idx)
                rgba_overlay[match] = [r, g, b, a]

        # 1. Encode transparent RGBA PNG
        pil_rgba = Image.fromarray(rgba_overlay, mode="RGBA")
        buf_rgba = io.BytesIO()
        pil_rgba.save(buf_rgba, format="PNG")
        overlay_b64 = "data:image/png;base64," + base64.b64encode(buf_rgba.getvalue()).decode("ascii")

        # 2. Encode Blended image (RGB original + alpha blended colors)
        blended_arr = img_rgb.copy().astype(np.float32)
        alpha_mask = (rgba_overlay[:, :, 3].astype(np.float32) / 255.0)[:, :, np.newaxis]
        color_layer = rgba_overlay[:, :, :3].astype(np.float32)

        blended_arr = (1.0 - alpha_mask) * blended_arr + alpha_mask * color_layer
        blended_uint8 = np.clip(blended_arr, 0, 255).astype(np.uint8)

        pil_blended = Image.fromarray(blended_uint8, mode="RGB")
        buf_blended = io.BytesIO()
        pil_blended.save(buf_blended, format="JPEG", quality=88)
        blended_b64 = "data:image/jpeg;base64," + base64.b64encode(buf_blended.getvalue()).decode("ascii")

        return overlay_b64, blended_b64


# Singleton engine instance for FastAPI worker
_segmentation_engine: Optional[OcularSegmentationEngine] = None


def get_segmentation_engine() -> OcularSegmentationEngine:
    """Return singleton segmentation engine instance."""
    global _segmentation_engine
    if _segmentation_engine is None:
        _segmentation_engine = OcularSegmentationEngine()
    return _segmentation_engine
