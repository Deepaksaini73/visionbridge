"""
VisionBridge EyeCapture AI — MobileNetV3 Anterior Eye Quality Classifier.
Milestone 5.1 — Research & Reference Architecture.

Inspired by MobileEye (Biomedical Signal Processing and Control 2025).
Evaluates whether smartphone ocular captures are sharp and diagnostically clear
or degraded by defocus, motion blur, specular glare, or severe underexposure.
"""

from typing import Dict, Any, Optional
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights


class EyeQualityClassifier(nn.Module):
    """
    Lightweight MobileNetV3-Small classifier for anterior-segment ocular quality.
    Outputs:
    - 3 Logits: [0: USABLE_FOR_ANALYSIS, 1: RETAKE_RECOMMENDED, 2: INCONCLUSIVE]
    - Auxiliary scalar: Continuous quality score [0.0..100.0]
    """

    def __init__(self, num_classes: int = 3, dropout_rate: float = 0.2):
        super().__init__()
        # Use torchvision MobileNetV3-Small backbone
        try:
            weights = MobileNet_V3_Small_Weights.DEFAULT
            base_model = mobilenet_v3_small(weights=weights)
        except Exception:
            # Fallback without weights if offline
            base_model = mobilenet_v3_small(weights=None)

        self.features = base_model.features
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        # Channel dimension for mobilenet_v3_small backbone output is 576
        in_features = 576

        self.classifier = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(256, num_classes),
        )

        self.score_head = nn.Sequential(
            nn.Linear(in_features, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
            nn.Sigmoid(),  # Outputs [0, 1] -> scaled to [0, 100]
        )

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        feat = self.features(x)
        pooled = self.avgpool(feat)
        flat = torch.flatten(pooled, 1)

        logits = self.classifier(flat)
        score = self.score_head(flat) * 100.0

        return {
            "logits": logits,
            "quality_score": score,
        }


def build_quality_model(device: str = "cpu") -> EyeQualityClassifier:
    """Build and initialize eye quality classifier on the specified device."""
    model = EyeQualityClassifier()
    model.to(device)
    model.eval()
    return model
