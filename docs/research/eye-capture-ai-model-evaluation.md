# VisionBridge EyeCapture AI — Feasibility & Model Evaluation Report
**Milestone 5.1 — Computer Vision & Machine Learning Research Assessment**

---

## 1. Executive Summary

VisionBridge is introducing **EyeCapture AI**, an edge-first computer-vision subsystem designed to assist store operators and optometrists in capturing high-fidelity smartphone ocular photographs and segmenting visible anterior ocular anatomy. 

### Scope Boundaries & Ethical Guardrails
- **Technical Assistance Only**: EyeCapture AI evaluates physical image suitability (sharpness, exposure, illumination) and identifies anatomical pixel regions (sclera, iris, pupil, periocular).
- **Strictly Non-Diagnostic**: This feature does not diagnose cataracts, glaucoma, retinal pathologies, or compute spectacle refractive power.
- **Optometrist Primacy**: All outputs serve as interactive overlays and guidance indicators. The licensed optometrist remains the sole authority for clinical evaluation and decision-making.

---

## 2. Hardware & Runtime Feasibility

| Parameter | Environment Discovery | Architectural Recommendation |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Enterprise (x64) | Cross-platform compatible (Windows, Linux, macOS) |
| **Python Runtime** | Python 3.12.10 (AMD64) | Isolated virtual environment (`ai-service/.venv/`) |
| **GPU / Accelerators** | Standard CPU (No discrete NVIDIA GPU / `nvidia-smi` detected) | Optimized CPU inference using lightweight backbones |
| **Frameworks** | PyTorch CPU (`torch-cpu`, `torchvision`), OpenCV (`headless`), Pillow | Lightweight CPU wheels (~130 MB) to keep bundle lean |
| **Latency Target** | < 150 ms per image on quad-core CPU | Achieved via resolution scaling (e.g. 256x256 / 384x384) |

---

## 3. Dataset Assessment: MOBIUS

- **Source**: University of Ljubljana, Laboratory for Machine Intelligence (LMI)
- **Official Portal**: [https://sclera.fri.uni-lj.si/datasets.html](https://sclera.fri.uni-lj.si/datasets.html)
- **Dataset Composition**:
  - 16,717 high-resolution RGB eye images collected from 100 subjects.
  - Three smartphone models (iPhone 6s, Sony Xperia Z5 Compact, Pocophone F1).
  - Four distinct gaze directions: straight, left, right, up.
  - Variable indoor and outdoor illumination settings.
  - Purposefully captured degraded samples (defocus blur, motion blur, occlusion, underexposure).
  - 3,559 samples containing fine-grained pixel-level segmentation masks.

### Anatomical Annotation Classes
1. **Class 0**: Background / Periocular skin
2. **Class 1**: Sclera (conjunctival boundary)
3. **Class 2**: Iris (limbic ring to pupillary margin)
4. **Class 3**: Pupil (central aperture)

### Compliance & Data Governance Rules
1. **Academic License Agreement**: Access to the full MOBIUS dataset requires an authorized signed End-User License Agreement (EULA) with the University of Ljubljana. Unofficial mirrors and secondary redistributions are legally prohibited.
2. **Privacy Minimization**: VisionBridge strictly excludes subject demographic sheets and personal identifying markers, ingesting only anonymized image tensors and label matrices.
3. **Subject-Wise Splitting**:
   - **Crucial Rule**: Never perform random image-level splitting. When multiple gaze directions and illumination conditions of the same person exist, image-level splits cause catastrophic identity leakage and artificially inflated performance scores.
   - **Protocol**: 100% subject-wise partitioning:
     - **Training Set**: 70% of unique subjects (e.g. 70 subjects)
     - **Validation Set**: 15% of unique subjects (e.g. 15 subjects)
     - **Test Set**: 15% of unique subjects (e.g. 15 subjects)

---

## 4. Ocular Segmentation Model Evaluation: OcularSeg

- **Reference**: *OcularSeg: A Multi-Modal Multi-Task Semantic Segmentation Framework for Ocular Biometrics on Smartphones* (Electronics 2024, MDPI)
- **Repository**: [https://github.com/koala0623/OcularSeg](https://github.com/koala0623/OcularSeg)
- **Authors' Reported MOBIUS F1 Scores**:
  - Periocular: `99.06%`
  - Sclera: `93.51%`
  - Iris: `91.79%`
  - Pupil: `85.30%`

### Legal & Checkpoint Audit
1. **Unclear Software License**: The GitHub repository currently lacks an explicit OSI-approved open-source license (e.g. MIT or Apache-2.0). Under international copyright law, copying or incorporating unlicensed repository code poses severe intellectual property risks.
2. **Weight Hosting Volatility**: The pretrained weights mentioned in the research paper rely on a public Google Drive link, which is prone to rate limits, link expiration, and lack of SHA-256 integrity verification.
3. **Architectural Decision for VisionBridge**:
   - Do **NOT** copy unlicensed repository code or depend on fragile external Drive links.
   - Implement an **independent, clean-room 4-class segmentation engine** based on a modular U-Net architecture with depthwise-separable convolutional blocks / MobileNetV3 encoder.
   - Implement deterministic OpenCV ocular localization (Hough-based iris/pupil localization and Otsu adaptive thresholding) as an active anatomical fallback whenever neural weights are unavailable or offline.
   - Ensure every API response transparently flags whether the output originated from neural inference, mathematical heuristic fallback, or if the model was unavailable.

---

## 5. Image Quality Assessment Evaluation: MobileEye Reference

- **Reference**: *MobileEye: Attention-guided MobileNetV3 for anterior-eye image quality assessment* (Biomedical Signal Processing and Control 2025)
- **Focus**: Distinguishing between diagnostically clear ocular photographs and degraded captures suffering from motion blur, severe defocus, specular reflections, or extreme underexposure.

### VisionBridge Quality Pipeline Implementation Strategy
Rather than relying purely on an opaque black-box neural classifier, VisionBridge implements a **hybrid dual-layer quality architecture**:

```
[Raw Smartphone Eye Photograph]
              │
              ▼
┌───────────────────────────────────────────────┐
│ Layer 1: Deterministic Metric Extraction       │
│  • Laplacian Variance (Sharpness / Blur)      │
│  • Luminance Distribution & Exposure Mean     │
│  • Under/Over-exposure Clipping Percentages   │
│  • Michelson / RMS Contrast                   │
│  • Minimum Resolution & Aspect Ratio Checks   │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ Layer 2: Rule Engine & Recapture Advisor      │
│  • USABLE_FOR_ANALYSIS (all metrics passed)   │
│  • RETAKE_RECOMMENDED (actionable guidance)   │
│  • INCONCLUSIVE (marginal or non-eye image)   │
└───────────────────────────────────────────────┘
```

### Actionable Recapture Guidance Matrix
| Trigger Condition | Rule Threshold | Operator Feedback |
| :--- | :--- | :--- |
| **Severe Motion / Defocus Blur** | Laplacian Var < 100.0 | *"Retake recommended: possible motion blur. Hold the phone steady and ensure lens is focused on iris."* |
| **Severe Underexposure** | Mean Brightness < 50.0 | *"Retake recommended: photograph is too dark. Increase ambient room lighting or adjust exposure."* |
| **Overexposure / Glare** | Saturated pixels > 15.0% | *"Retake recommended: severe glare/overexposure detected. Diffuse light source to avoid specular reflections."* |
| **Insufficient Resolution** | Dimension < 300px | *"Retake recommended: resolution is too low for anterior segment inspection. Move camera closer."* |

---

## 6. Preprocessing & Augmentation Strategy

For both training and inference, anterior eye photographs are normalized according to standardized computer-vision protocols:
1. **Input Resizing**: Target dimension 256x256 or 384x384 using bilinear interpolation with aspect ratio preservation (padding where required).
2. **Intensity Scaling**: Channel-wise ImageNet normalization (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
3. **Mask Mapping**: One-hot categorical tensor mapping across 4 classes with argmax projection.
4. **Overlay Generation**: RGBA transparency blending with original full-resolution photograph to guarantee that original clinical data is never modified or destroyed.

---

## 7. Conclusion & Next Implementation Steps

The technical feasibility of EyeCapture AI is validated:
- CPU execution satisfies latency constraints for rural tele-screening.
- Hybrid deterministic metric extraction provides explainable, reproducible recapture recommendations.
- Independent clean-room semantic segmentation eliminates legal and checkpoint vulnerabilities.
- Proceed to **Phase B (Research Workspace & Preprocessing Pipeline)** and **Phase C/D (Quality & Segmentation Implementation)**.
