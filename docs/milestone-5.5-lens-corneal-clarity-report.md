# VisionBridge — Milestone 5.5
# Lens & Corneal Clarity Engine: Cataract Opacity & Arcus Senilis Telemetry

**Document Status:** Final Production Specification & Engineering Audit Report  
**Author:** VisionBridge Core AI & Computer Vision Engineering Team  
**Review Standard:** CE / FDA SaMD Good Machine Learning Practice (GMLP) & WHO Blindness Prevention Framework  

---

## 1. Executive Summary & Clinical Intent

As part of VisionBridge's mission to extend high-grade tele-optometry to underserved and rural communities, **Milestone 5.5** introduces the **Lens & Corneal Clarity Engine**.

This capability targets two of the most prevalent optical and ocular surface abnormalities encountered in primary eye-care screenings:
1. **Crystalline Lens Opacification (Cataract Screening)**: Automated quantification of pupillary light scatter, luminance heterogeneity, and optical transmission loss across the visual axis, proxying the **WHO / LOCS III (Lens Opacities Classification System)** staging.
2. **Peripheral Corneal Arcus (Arcus Senilis)**: Detection and polar angular quantification of peripheral corneal lipid deposits adjacent to the limbus, aiding in early identification of systemic dyslipidemia risks in individuals under 50 years of age.

> [!IMPORTANT]
> **Regulatory & Diagnostic Disclaimer**:
> This engine provides **preliminary technical decision support only**. It does **NOT** provide a standalone medical diagnosis of cataract, corneal dystrophy, or hypercholesterolemia. It serves to prioritize cases for comprehensive in-person slit-lamp biomicroscopy and dilated ophthalmic examination.

---

## 2. Anatomical Foundations & Computer Vision Pipeline

```
                     [ High-Resolution Anterior Eye Photograph ]
                                         │
                                         ▼
                     [ Multi-Stage Hough & Iris Localization ]
                     (Iris Center: cx, cy | Radius: R_iris)
                                         │
                                         ▼
                     [ Pupillary Aperture Segmentation ]
                     (Pupil Center: cx, cy | Radius: R_pupil)
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
       [ Specular Glare Rejection ]             [ Polar Limbal Unwrapping ]
       (High V > 235 & Low S < 40)              (r ∈ [0.78, 0.95] · R_iris)
                         │                               │
                         ▼                               ▼
       [ Pupillary Transmission & Entropy ]    [ 72-Sector Radial Density Scan ]
       (Mean L, Std Dev, Shannon H)             (360° Angular Arc Quantification)
                         │                               │
                         ▼                               ▼
       [ Cataract Staging: Grade 0 to 3 ]      [ Arcus Senilis: Grade 0 to 3 ]
                         │                               │
                         └───────────────┬───────────────┘
                                         ▼
                     [ Calibrated Caliper Overlay Assembly ]
                     (Amber Pupillary Aperture + Cyan Limbus Ring)
                                         │
                                         ▼
                     [ Clinical Triage Telemetry Dossier ]
```

---

## 3. Mathematical Formulations & Calibration Constants

### 3.1 Anatomical Metric Scaling
Scaling from image pixels to millimeters uses the validated human corneal horizontal visible iris diameter standard:
$$\text{Scale Factor } (\text{mm/px}) = \frac{11.7\text{ mm}}{2 \cdot R_{\text{iris}}\text{ (px)}}$$
$$\text{Pupil Diameter } (\text{mm}) = 2 \cdot R_{\text{pupil}}\text{ (px)} \cdot \text{Scale Factor}$$

### 3.2 Pupillary Light Transmission & Glare Rejection
Corneal flash glares (Purkinje reflections) are isolated and masked using HSV color space thresholding:
$$\mathcal{M}_{\text{glare}}(x, y) = [V(x, y) > 235] \wedge [S(x, y) < 40]$$
The non-glare pupillary aperture evaluated region is defined as:
$$\mathcal{M}_{\text{pupil\_eval}} = \mathcal{C}(c_x, c_y, 0.90 \cdot R_{\text{pupil}}) \setminus \mathcal{M}_{\text{glare}}$$

### 3.3 Pupillary Opacity Area Fraction
In healthy eyes, the pupil is optically transparent and absorbs incoming light, rendering as deep black ($L_{\text{pupil}} < 45$). Crystalline lens opacification scatters back-reflected light. Opacity area fraction is formulated as:
$$\text{Opacity Fraction } (\%) = \frac{\sum_{p \in \mathcal{M}_{\text{pupil\_eval}}} [I(p) > \tau_{\text{opacity}}]}{|\mathcal{M}_{\text{pupil\_eval}}|} \times 100$$
Where $\tau_{\text{opacity}} = \max(55.0, \min(85.0, 0.65 \cdot \bar{L}_{\text{iris}}))$ is dynamically adapted to baseline iris pigmentation.

### 3.4 Texture Heterogeneity (Shannon Entropy)
Optical scattering and cortical spoking introduce textural heterogeneity, quantified via Shannon entropy over the pupillary grayscale intensity distribution:
$$H = -\sum_{k=1}^{K} p_k \log_2(p_k)$$
Where $p_k$ is the normalized probability of grayscale bin $k$ across non-glare pupillary pixels. High entropy ($H > 4.5$) reflects mature cataract light diffraction.

### 3.5 Cataract Staging Criteria (WHO / LOCS III Proxy)

| Cataract Grade | Staging Label | Opacity Fraction | Mean Luminance | Clinical Assessment Guidance |
| :--- | :--- | :--- | :--- | :--- |
| **Grade 0** | `NORMAL_CLEAR` | $< 12.0\%$ | $< 46.0$ | Clear optical transmission. Crystalline lens transparent. |
| **Grade 1** | `MILD_OPACITY` | $12.0\% - 28.0\%$ | $46.0 - 65.0$ | Early nuclear haze or cortical spoking. Correlate with contrast sensitivity. |
| **Grade 2** | `MODERATE_CATARACT` | $28.0\% - 55.0\%$ | $65.0 - 95.0$ | Noticeable opacification within the visual axis. Dilated slit-lamp review advised. |
| **Grade 3** | `ADVANCED_CATARACT` | $> 55.0\%$ | $\ge 95.0$ | Dense mature crystalline cataract. Retro-illumination blocked; surgical consult advised. |

### 3.6 Corneal Arcus (Arcus Senilis) Formulation
The peripheral limbal band is sampled across 72 radial sectors ($\Delta\theta = 5^\circ$):
$$r \in [0.78 \cdot R_{\text{iris}}, 0.95 \cdot R_{\text{iris}}]$$
$$\text{Angular Extent } (^\circ) = \left(\frac{\text{Positive Sectors}}{72}\right) \times 360^\circ$$
- **Grade 0 (`NONE`)**: Extent $< 54^\circ$ ($< 15\%$ circumference).
- **Grade 1 (`PARTIAL_ARC`)**: Localized arc ($54^\circ - 126^\circ$).
- **Grade 2 (`CONFLUENT_ARC`)**: Superior & inferior confluent arcs ($126^\circ - 252^\circ$).
- **Grade 3 (`CIRCUMFERENTIAL_RING`)**: 360° gerontoxon ($> 252^\circ$).

---

## 4. REST API Schema Specification

### 4.1 Status Endpoint: `GET /api/v1/clarity/status`
Returns module metadata, version `1.5.0`, framework descriptions, and regulatory notices.

### 4.2 Analysis Endpoint: `POST /api/v1/clarity/analyze`
**Request Payload**: Multipart Form Data (`file`: Image, `eye_side`: optional `RIGHT` / `LEFT`).

**Response JSON**:
```json
{
  "success": true,
  "filename": "clinical_anterior_eye.jpg",
  "eye_side": "RIGHT",
  "calibration": {
    "iris_center_xy": [250, 250],
    "iris_diameter_px": 260,
    "iris_radius_px": 130,
    "pupil_radius_px": 45,
    "pupil_diameter_mm": 4.05,
    "scale_factor_mm_per_px": 0.045,
    "reference_iris_diameter_mm": 11.7
  },
  "lens_opacity": {
    "cataract_grade": 0,
    "grade_name": "Grade 0: Normal / Clear Lens",
    "severity_label": "NORMAL_CLEAR",
    "mean_luminance": 22.4,
    "median_luminance": 20.0,
    "std_luminance": 8.1,
    "opacity_area_fraction_pct": 2.1,
    "shannon_entropy": 3.12,
    "evaluated_pupil_pixels": 5120,
    "clinical_advice": "Normal optical transparency through pupillary aperture."
  },
  "corneal_arcus": {
    "arcus_detected": false,
    "severity_grade": "NONE",
    "extent_degrees": 0,
    "coverage_pct": 0.0,
    "limbal_band_luminance": 68.2,
    "span_description": "Clear peripheral cornea. No arcus senilis ring detected.",
    "clinical_advice": "Peripheral corneal clarity normal."
  },
  "triage": {
    "urgency": "NORMAL_CLEAR",
    "summary": "Clear crystalline lens and peripheral cornea. Normal ocular optical transmission.",
    "referral_indicated": false
  },
  "telemetry": {
    "latency_ms": 62.4,
    "resolution": "500x500"
  },
  "overlay_rgba_base64": "data:image/png;base64,...",
  "disclaimer": "PRELIMINARY LENS & CORNEAL CLARITY TELEMETRY FOR TECHNICAL DECISION SUPPORT..."
}
```

---

## 5. Automated Verification & Testing Suite

All unit and integration tests are automated in `ai-service/tests/test_corneal_lens_engine.py`:
- `test_corneal_lens_engine_initialization`: Verifies engine instantiation and adult corneal iris standard ($11.7\text{ mm}$).
- `test_normal_clear_crystalline_lens`: Validates clear pupil returns Grade 0 (`NORMAL_CLEAR`), opacity fraction $< 15\%$, and zero arcus.
- `test_dense_cataract_opacity`: Validates cloudy/cataractous pupil triggers Grade $\ge 2$ with triage referral flag.
- `test_corneal_arcus_detection`: Validates peripheral limbal lipid ring triggers positive arcus flag and extent measurement.
- `test_invalid_image_handling`: Confirms corrupted raster bytes throw explicit `ValueError`.
- `test_clarity_routes_via_testclient`: Verifies FastAPI `TestClient` routes (`/status` and `/analyze`).

**Full AI Microservice Suite**: 38 / 38 Tests Passing (100%).
