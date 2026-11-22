"""
VisionBridge EyeCapture AI — Dataset Preprocessing & Ingestion Module.
Milestone 5.1 — Research & Engineering Assets.

Handles data loading, subject-wise partitioning (70/15/15), mask normalization,
and synthetic validation dataset generation for the MOBIUS anterior-segment ocular dataset.

Ethical & Legal Compliance:
- MOBIUS is distributed under an academic research agreement by the University of Ljubljana.
- No personal identifiers, names, or non-ocular biometric data are ingested.
- Subject-wise splitting strictly prevents identity leakage across train/val/test partitions.
"""

import os
import json
import math
import random
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from PIL import Image, ImageDraw

logger = logging.getLogger("visionbridge-ai.preprocessing")

# Standard anterior ocular semantic classes
CLASS_BACKGROUND = 0  # Periocular skin & image borders
CLASS_SCLERA = 1      # Visible sclera (conjunctival zone)
CLASS_IRIS = 2        # Iris disc
CLASS_PUPIL = 3       # Central pupillary aperture

CLASS_NAMES = {
    CLASS_BACKGROUND: "periocular_background",
    CLASS_SCLERA: "sclera",
    CLASS_IRIS: "iris",
    CLASS_PUPIL: "pupil",
}

# Overlay RGBA colors for visualization (Alpha = 110/255 ~ 43% opacity)
CLASS_OVERLAY_COLORS = {
    CLASS_BACKGROUND: (0, 0, 0, 0),          # Transparent
    CLASS_SCLERA: (0, 220, 255, 110),        # Cyan
    CLASS_IRIS: (16, 215, 120, 110),         # Emerald
    CLASS_PUPIL: (255, 45, 85, 130),         # Crimson
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


class MOBIUSDatasetPreprocessor:
    """
    Preprocessor for MOBIUS smartphone ocular dataset.
    Enforces subject-wise partitioning and consistent class mask normalization.
    """

    def __init__(
        self,
        data_root: str,
        target_size: Tuple[int, int] = (256, 256),
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        random_seed: int = 42,
    ):
        self.data_root = Path(data_root)
        self.target_size = target_size
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio
        self.test_ratio = test_ratio
        self.random_seed = random_seed
        
        total_ratio = train_ratio + val_ratio + test_ratio
        if not math.isclose(total_ratio, 1.0, rel_tol=1e-3):
            raise ValueError(f"Partition ratios must sum to 1.0; received {total_ratio}")

    def extract_subject_id(self, filename: str) -> str:
        """
        Extract anonymized subject identifier from filename.
        Supported patterns:
        - Subj_001_1_iPhone_L.png -> Subj_001
        - S042_R_01.jpg -> S042
        - 012_gaze_up.jpg -> 012
        """
        base = Path(filename).stem
        parts = base.split("_")
        if len(parts) >= 1:
            return parts[0].strip().upper()
        return "UNKNOWN_SUBJECT"

    def scan_dataset(self) -> Dict[str, List[Path]]:
        """Scan data_root and group image paths by subject ID."""
        subject_map: Dict[str, List[Path]] = {}
        if not self.data_root.exists():
            return subject_map

        for file_path in self.data_root.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
                # Exclude mask files from image scanning if named *_mask.*
                if "_mask" in file_path.stem.lower():
                    continue
                subj = self.extract_subject_id(file_path.name)
                subject_map.setdefault(subj, []).append(file_path)

        return subject_map

    def partition_subjects(
        self, subject_map: Dict[str, List[Path]]
    ) -> Dict[str, List[str]]:
        """
        Subject-wise partition into train, val, and test groups.
        Guarantees zero subject identity leakage.
        """
        subjects = sorted(list(subject_map.keys()))
        rng = random.Random(self.random_seed)
        rng.shuffle(subjects)

        n_total = len(subjects)
        if n_total == 0:
            return {"train": [], "val": [], "test": []}

        n_train = max(1, int(round(n_total * self.train_ratio)))
        n_val = max(0, int(round(n_total * self.val_ratio)))
        
        # Ensure remaining go to test
        train_subjs = subjects[:n_train]
        val_subjs = subjects[n_train : n_train + n_val]
        test_subjs = subjects[n_train + n_val :]

        # Edge case adjustment if test is empty and total >= 3
        if n_total >= 3 and not test_subjs and len(train_subjs) > 1:
            test_subjs = [train_subjs.pop()]

        return {
            "train": train_subjs,
            "val": val_subjs,
            "test": test_subjs,
        }

    def generate_split_manifest(self, output_path: Optional[str] = None) -> Dict[str, Any]:
        """Generate manifest mapping splits to subjects and file paths."""
        subject_map = self.scan_dataset()
        splits = self.partition_subjects(subject_map)

        manifest = {
            "dataset": "MOBIUS Ocular Subset",
            "random_seed": self.random_seed,
            "target_resolution": list(self.target_size),
            "class_labels": CLASS_NAMES,
            "counts": {
                "total_subjects": len(subject_map),
                "total_images": sum(len(paths) for paths in subject_map.values()),
                "train_subjects": len(splits["train"]),
                "val_subjects": len(splits["val"]),
                "test_subjects": len(splits["test"]),
            },
            "splits": {
                split_name: {
                    "subjects": subjs,
                    "image_count": sum(len(subject_map[s]) for s in subjs if s in subject_map),
                    "images": [
                        str(p.relative_to(self.data_root))
                        for s in subjs
                        for p in subject_map.get(s, [])
                    ],
                }
                for split_name, subjs in splits.items()
            },
        }

        if output_path:
            out_file = Path(output_path)
            out_file.parent.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)
            logger.info("Split manifest written to %s", out_file)

        return manifest

    @staticmethod
    def normalize_mask(raw_mask: np.ndarray) -> np.ndarray:
        """
        Normalize raw segmentation mask into integer class indices [0, 1, 2, 3].
        Handles:
        - 2D grayscale masks where values are in [0, 1, 2, 3]
        - Scaled masks (e.g. 0, 85, 170, 255)
        - 3D RGB color-coded masks
        """
        if raw_mask.ndim == 3:
            # RGB mask -> convert to class index based on color heuristic
            h, w, c = raw_mask.shape
            clean_mask = np.zeros((h, w), dtype=np.uint8)
            # Pupil: darkest central circle
            # Iris: mid-intensity ring
            # Sclera: brightest conjunctival region
            r, g, b = raw_mask[:, :, 0], raw_mask[:, :, 1], raw_mask[:, :, 2]
            # Common MOBIUS / OcularSeg RGB palette:
            # Blue: Sclera, Green: Iris, Red: Pupil
            clean_mask[(b > 150) & (r < 100) & (g < 100)] = CLASS_SCLERA
            clean_mask[(g > 150) & (r < 100)] = CLASS_IRIS
            clean_mask[(r > 150) & (g < 100) & (b < 100)] = CLASS_PUPIL
            return clean_mask

        # 2D Grayscale mask
        clean_mask = raw_mask.copy().astype(np.uint8)
        unique_vals = np.unique(clean_mask)
        
        # If mask is 0..255 quantized (e.g. 0=bg, 85=sclera, 170=iris, 255=pupil)
        if unique_vals.max() > 3:
            mapped = np.zeros_like(clean_mask)
            mapped[(clean_mask >= 40) & (clean_mask < 120)] = CLASS_SCLERA
            mapped[(clean_mask >= 120) & (clean_mask < 200)] = CLASS_IRIS
            mapped[clean_mask >= 200] = CLASS_PUPIL
            return mapped

        # Already in [0..3]
        return np.clip(clean_mask, 0, 3)


def generate_synthetic_mobius_dataset(
    output_dir: str,
    num_subjects: int = 10,
    images_per_subject: int = 4,
    size: Tuple[int, int] = (256, 256),
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Generate synthetic ocular images and paired 4-class segmentation masks
    for offline CI testing, benchmarking, and unit verification.
    No academic dataset download required for running verification tests.
    """
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    out_path = Path(output_dir)
    images_dir = out_path / "images"
    masks_dir = out_path / "masks"
    images_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)

    generated_files = []
    gazes = ["straight", "left", "right", "up"]

    w, h = size
    for subj_idx in range(1, num_subjects + 1):
        subj_id = f"SUBJ_{subj_idx:03d}"
        for img_idx in range(1, images_per_subject + 1):
            gaze = gazes[(img_idx - 1) % len(gazes)]
            stem = f"{subj_id}_sess1_phone1_{gaze}_{img_idx:02d}"

            # Create synthetic eye image and mask
            # Background skin tone: warm beige-pink
            base_r = int(np_rng.integers(180, 230))
            base_g = int(np_rng.integers(140, 180))
            base_b = int(np_rng.integers(120, 160))

            img_arr = np.zeros((h, w, 3), dtype=np.uint8)
            img_arr[:, :, 0] = base_r
            img_arr[:, :, 1] = base_g
            img_arr[:, :, 2] = base_b

            # Add subtle skin texture noise
            noise = np_rng.integers(-15, 15, (h, w, 3))
            img_arr = np.clip(img_arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)

            img_pil = Image.fromarray(img_arr)
            draw_img = ImageDraw.Draw(img_pil)

            mask_pil = Image.new("L", (w, h), CLASS_BACKGROUND)
            draw_mask = ImageDraw.Draw(mask_pil)

            # Eye dimensions
            center_x = w // 2 + (15 if gaze == "right" else -15 if gaze == "left" else 0)
            center_y = h // 2 + (-10 if gaze == "up" else 0)

            # Palpebral fissure (sclera outline)
            eye_w = int(w * 0.42)
            eye_h = int(h * 0.22)
            sclera_box = [center_x - eye_w, center_y - eye_h, center_x + eye_w, center_y + eye_h]

            # Draw sclera: light off-white (240, 240, 245)
            draw_img.ellipse(sclera_box, fill=(238, 239, 244), outline=(140, 110, 100), width=2)
            draw_mask.ellipse(sclera_box, fill=CLASS_SCLERA)

            # Draw iris: brown/hazel or blue
            iris_r = int(eye_h * 0.95)
            iris_box = [center_x - iris_r, center_y - iris_r, center_x + iris_r, center_y + iris_r]
            iris_color = (
                int(np_rng.integers(40, 80)),
                int(np_rng.integers(30, 60)),
                int(np_rng.integers(20, 40)),
            )
            draw_img.ellipse(iris_box, fill=iris_color, outline=(25, 20, 15), width=1)
            draw_mask.ellipse(iris_box, fill=CLASS_IRIS)

            # Draw pupil: dark black (15, 15, 20)
            pupil_r = int(iris_r * 0.38)
            pupil_box = [center_x - pupil_r, center_y - pupil_r, center_x + pupil_r, center_y + pupil_r]
            draw_img.ellipse(pupil_box, fill=(15, 15, 20))
            draw_mask.ellipse(pupil_box, fill=CLASS_PUPIL)

            # Corneal reflection / specular highlight (small white dot)
            glint_x = center_x - pupil_r // 2
            glint_y = center_y - pupil_r // 2
            draw_img.ellipse([glint_x - 2, glint_y - 2, glint_x + 2, glint_y + 2], fill=(255, 255, 255))

            # Save image and mask
            img_file = images_dir / f"{stem}.png"
            mask_file = masks_dir / f"{stem}_mask.png"
            img_pil.save(img_file)
            mask_pil.save(mask_file)

            generated_files.append({
                "subject": subj_id,
                "image": str(img_file),
                "mask": str(mask_file),
                "gaze": gaze,
            })

    # Generate partition manifest
    preprocessor = MOBIUSDatasetPreprocessor(data_root=str(images_dir), target_size=size, random_seed=seed)
    manifest = preprocessor.generate_split_manifest(output_path=str(out_path / "split_manifest.json"))

    logger.info(
        "Generated synthetic MOBIUS dataset at %s with %d subjects (%d samples)",
        output_dir,
        num_subjects,
        len(generated_files),
    )
    return {
        "output_dir": output_dir,
        "sample_count": len(generated_files),
        "manifest": manifest,
    }
