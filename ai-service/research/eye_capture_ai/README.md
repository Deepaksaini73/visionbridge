# VisionBridge EyeCapture AI — Research & Engineering Assets
**Milestone 5.1 — Smartphone Anterior Ocular Computer Vision**

This module hosts the research datasets, preprocessing pipelines, model architectures, and evaluation harnesses for **VisionBridge EyeCapture AI**.

---

## 1. Scope & Medical Disclaimer

- **Technical Assistance Only**: EyeCapture AI evaluates the capture quality (focus, lighting, framing) of anterior eye photographs and provides transparent multi-class semantic overlays (sclera, iris, pupil) for reference.
- **Strictly Non-Diagnostic**: EyeCapture AI **does NOT** diagnose glaucoma, cataract, diabetic retinopathy, or prescribe optical lens powers.
- **Optometrist Authority**: The licensed optometrist retains exclusive clinical authority over all image assessments and patient reviews.

---

## 2. Research Assets & Dataset Governance

### MOBIUS Anterior Ocular Dataset
- **Publisher**: University of Ljubljana, Laboratory for Machine Intelligence (LMI)
- **Official Portal**: [https://sclera.fri.uni-lj.si/datasets.html](https://sclera.fri.uni-lj.si/datasets.html)
- **Characteristics**: 16,717 RGB smartphone photographs across 100 subjects; 3,559 images with fine 4-class semantic segmentations.
- **Licensing Protocol**: Access requires a signed End-User License Agreement (EULA) with the University of Ljubljana. VisionBridge strictly adheres to academic compliance and does NOT redistribute raw proprietary images or personal subject identifying data.

### Subject-Wise Partitioning Rule
To prevent data contamination and identity leakage, splits are strictly partitioned at the **subject level** (never random sample shuffling):
- **Training (70%)**: e.g., 70 subjects
- **Validation (15%)**: e.g., 15 subjects
- **Testing (15%)**: e.g., 15 subjects

### Offline Synthetic Dataset Generator
For automated CI/CD testing, local development, and unit validation, a synthetic anterior ocular dataset generator is provided in `preprocessing/dataset_preprocessor.py`.

```python
from research.eye_capture_ai.preprocessing.dataset_preprocessor import generate_synthetic_mobius_dataset

# Generates 10 synthetic subjects (40 samples) with paired masks
dataset = generate_synthetic_mobius_dataset("data/synthetic_mobius", num_subjects=10)
```

---

## 3. Architecture Overview

### A. Quality Assessment Engine (`app/services/quality_assessor.py`)
A fast, dual-layer evaluation pipeline combining deterministic mathematical measurements with clear operator feedback:
1. **Laplacian Blur Variance**: Distinguishes crisp limbic edges from camera shake or defocus.
2. **Luminance & Exposure Mean**: Flags dark images (< 50.0) or overexposed captures (> 215.0).
3. **Specular Glare Clipping**: Quantifies high-intensity highlights (> 15% saturated pixels).
4. **Actionable Recapture Advice**: Translates sensor measurements into real-time operator instructions (e.g., *"Photograph is too dark. Increase ambient lighting."*).

### B. Ocular Anatomy Segmentation (`app/services/segmentation_engine.py`)
Clean-room 4-class semantic segmentation:
- **Class 0**: Background / Periocular skin
- **Class 1**: Sclera (conjunctival boundary) — RGBA: Cyan `(0, 220, 255, 110)`
- **Class 2**: Iris disc — RGBA: Emerald `(16, 215, 120, 110)`
- **Class 3**: Pupil aperture — RGBA: Crimson `(255, 45, 85, 130)`

**Dual-Mode Reliability**:
- **PyTorch Model Mode**: Clean-room depthwise-separable U-Net architecture optimized for CPU inference (< 120ms).
- **OpenCV Heuristic Mode**: Deterministic gradient-based and Hough-circle locator fallback whenever weights are offline or during initialization.
- Every API output explicitly declares its inference source (`pytorch_model` vs `opencv_fallback`), guaranteeing transparency without hallucinating nonexistent model weights.

---

## 4. Directory Structure

```
ai-service/research/eye_capture_ai/
├── README.md                          # Research overview & documentation
├── preprocessing/
│   ├── __init__.py
│   └── dataset_preprocessor.py        # MOBIUS parser & synthetic dataset generator
├── quality/
│   ├── __init__.py
│   └── mobilenet_quality.py           # MobileNetV3 quality assessment backbone
└── evaluation/
    ├── __init__.py
    └── metrics.py                     # Per-class IoU, Dice/F1 evaluation tools
```
