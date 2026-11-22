"""
VisionBridge EyeCapture AI — Segmentation Evaluation Metrics.
Milestone 5.1 — Anterior Ocular Semantic Segmentation Benchmarks.

Calculates:
- Per-class Intersection over Union (IoU)
- Mean IoU (mIoU)
- Dice / F1 Coefficients for Sclera, Iris, Pupil
- Pixel Accuracy
"""

from typing import Dict, Any, List
import numpy as np

CLASS_NAMES = {
    0: "Background/Periocular",
    1: "Sclera",
    2: "Iris",
    3: "Pupil",
}


def calculate_iou_and_dice(
    pred_mask: np.ndarray,
    target_mask: np.ndarray,
    num_classes: int = 4,
    smooth: float = 1e-6,
) -> Dict[str, Any]:
    """
    Compute per-class IoU, Dice/F1 scores, mIoU, and overall pixel accuracy.
    pred_mask and target_mask should be 2D integer numpy arrays with values in [0..num_classes-1].
    """
    if pred_mask.shape != target_mask.shape:
        raise ValueError(
            f"Shape mismatch: pred_mask {pred_mask.shape} vs target_mask {target_mask.shape}"
        )

    class_metrics: Dict[str, Dict[str, float]] = {}
    ious: List[float] = []
    dices: List[float] = []

    for c in range(num_classes):
        pred_c = (pred_mask == c)
        target_c = (target_mask == c)

        intersection = np.logical_and(pred_c, target_c).sum()
        union = np.logical_or(pred_c, target_c).sum()
        total_pixels = pred_c.sum() + target_c.sum()

        iou = (intersection + smooth) / (union + smooth) if union > 0 else 1.0
        dice = (2.0 * intersection + smooth) / (total_pixels + smooth) if total_pixels > 0 else 1.0

        c_name = CLASS_NAMES.get(c, f"Class_{c}")
        class_metrics[c_name] = {
            "iou": round(float(iou), 4),
            "dice_f1": round(float(dice), 4),
            "target_pixels": int(target_c.sum()),
            "pred_pixels": int(pred_c.sum()),
        }

        ious.append(iou)
        dices.append(dice)

    correct_pixels = (pred_mask == target_mask).sum()
    pixel_accuracy = float(correct_pixels) / float(pred_mask.size)

    return {
        "mean_iou": round(float(np.mean(ious)), 4),
        "mean_dice_f1": round(float(np.mean(dices)), 4),
        "pixel_accuracy": round(pixel_accuracy, 4),
        "per_class": class_metrics,
    }
