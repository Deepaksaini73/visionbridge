# VisionBridge — Milestone 5.0: Python AI & Computer Vision Foundation Report

## 1. Executive Summary

Milestone 5.0 establishes the dedicated Python microservice for VisionBridge. In accordance with architectural principles, this milestone sets up the clean, isolated foundation without introducing premature heavy model weights, mock clinical determinations, or altering existing Node.js core business logic.

The architectural pattern implemented is:
```
[React + TS Frontend] (Port 5173)
       │
       ▼ (REST / JWT)
[Node.js + Express Backend] (Port 5000)
       │
       ▼ (Internal Microservice Gateway)
[Python FastAPI AI Service] (Port 8001)
```

The browser client never communicates directly with the Python microservice in production, maintaining centralized authentication, multi-tenant store isolation, and audit logging within the Node.js backend.

---

## 2. Python Environment Architecture

- **Runtime Target**: Python 3.11 / 3.12 (standard CPython).
- **Service Root Directory**: `ai-service/`
- **Virtual Environment Directory**: `ai-service/.venv/` (strictly excluded from Git).
- **Web Framework**: FastAPI with standard asynchronous Uvicorn ASGI server.
- **Port Allocation**: `8001` (Node.js on `5000`, React Vite on `5173`).

### Foundational Dependencies (`ai-service/requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | `0.115.6` | Modern, high-performance async API framework |
| `uvicorn[standard]` | `0.34.0` | Production ASGI web server |
| `pydantic` | `2.10.4` | Data validation, type enforcement, and settings management |
| `pydantic-settings` | `2.7.0` | Environment configuration loading from `.env` |
| `python-multipart` | `0.0.20` | Streaming multipart file upload decoding |
| `opencv-python-headless` | `4.10.0.84` | Image decoding, raster array checks, future landmarking |
| `numpy` | `2.2.1` | Efficient multi-dimensional array manipulation |
| `Pillow` | `11.1.0` | Image format parsing, metadata inspection, and decompression checks |
| `pytest` | `8.3.4` | Automated testing framework |
| `httpx` | `0.28.1` | Async HTTP client for ASGI integration tests |

*Note: Heavy deep-learning frameworks (PyTorch, TensorFlow, CUDA) are intentionally excluded at this stage to keep the foundation lightweight and agile until specific model architectures are finalized in Milestone 5.1+.*

---

## 3. Directory Structure

```
ai-service/
├── .venv/                         # Isolated Python virtual environment
├── app/
│   ├── __init__.py                # Package declaration
│   ├── main.py                    # FastAPI application, CORS, and root router
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py              # Health, capabilities, and image validation endpoints
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # Pydantic BaseSettings and environment config
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── common.py              # Pydantic schemas (Health, Capabilities, Validation)
│   └── services/
│       ├── __init__.py
│       └── image_validator.py     # Structural image decodability & geometry validator
├── tests/
│   ├── __init__.py
│   ├── test_health.py             # Health check & root endpoint unit tests
│   ├── test_capabilities.py       # Catalog consistency unit tests
│   └── test_image_validation.py   # Format, corruption, and dimension unit tests
├── .env.example                   # Environment configuration template
├── .gitignore                     # Virtualenv and cache exclusion rules
├── requirements.txt               # Locked dependency specification
├── start.bat                      # Windows CMD launcher
├── start.ps1                      # Windows PowerShell launcher
└── README.md                      # Service documentation and setup instructions
```

---

## 4. Implemented Microservice Endpoints

### 1. `GET /health`
Returns operational telemetry, service name, API version, runtime Python version, and UTC timestamp.

**Response Example:**
```json
{
  "status": "healthy",
  "service": "VisionBridge AI & Computer Vision Service",
  "api_version": "0.1.0",
  "python_version": "3.12.10",
  "timestamp": "2026-11-15T14:00:00.000000+00:00"
}
```

### 2. `GET /api/v1/capabilities`
Returns a structured catalog of planned computer-vision capabilities and their implementation status:

| Capability ID | Name | Category | Status |
|---|---|---|---|
| `eye_image_quality` | Eye Image Quality Assessment | Pre-Analysis QA | `NOT_IMPLEMENTED` |
| `eye_detection_localization` | Eye Detection and Localization | Anatomy Localization | `NOT_IMPLEMENTED` |
| `iris_segmentation` | Iris Segmentation | Semantic Segmentation | `NOT_IMPLEMENTED` |
| `pupil_segmentation` | Pupil Segmentation | Semantic Segmentation | `NOT_IMPLEMENTED` |
| `geometric_eye_analysis` | Geometric Eye Analysis | Quantitative Telemetry | `NOT_IMPLEMENTED` |

*Ethical Safeguard*: All specialized clinical models remain explicitly marked `NOT_IMPLEMENTED` until rigorous validation in future milestones.

### 3. `POST /api/v1/images/validate`
Performs non-clinical technical validation on uploaded image buffers:
- **Format Verification**: Checks allowed extensions (`.jpg`, `.jpeg`, `.png`, `.webp`) and MIME types.
- **Decompression Integrity**: Verifies that the file can be decoded by both PIL and OpenCV without truncation or corruption.
- **Dimensionality**: Ensures dimensions meet minimum (64px) and maximum (8192px) thresholds.
- **Advisory Warnings**: Flags low-resolution captures (< 300px) or irregular aspect ratios.
- **Non-Clinical Disclaimer**: Every response contains an explicit disclaimer that technical upload validation does not constitute diagnostic ocular assessment.

---

## 5. Node.js Backend Gateway Integration

The Node.js Express backend integrates the Python microservice via:
- Configurable environment variable: `AI_SERVICE_URL=http://127.0.0.1:8001`
- Gateway Controller: `server/src/controllers/aiController.ts`
- Gateway Routes: `server/src/routes/aiRoutes.ts` registered at `/api/ai`

### Proxy Endpoints:
1. `GET /api/ai/health`: Proxies Python `/health` with a 4-second timeout. Gracefully returns `{ connected: false, status: 'OFFLINE' }` if Python is down, preventing backend crashes.
2. `GET /api/ai/capabilities`: Proxies Python capabilities catalog with local fallback.
3. `POST /api/ai/validate-image`: Authenticated endpoint that forwards patient image buffers to Python for format and decodability validation.

### Frontend Service Status Badge:
- Component: `client/src/components/common/AiServiceStatusBadge.tsx`
- Integrated into the global header navigation.
- Shows dynamic status:
  - **Connected** (teal chip with pulsing dot) when Python service is active on port 8001.
  - **Offline** (slate chip) when Python service is not running, with tooltip instructions.

---

## 6. How to Run

### Option A: Using NPM Scripts (from project root)
```bash
# Start Node.js backend + React frontend
npm run dev

# In a separate terminal, start Python AI service
npm run dev:ai

# Run Python AI service unit tests
npm run test:ai
```

### Option B: Using Windows PowerShell
```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Option C: Using Windows Batch Script
Double-click `ai-service/start.bat` or run `.\ai-service\start.bat` from terminal.

---

## 7. Verification & Automated Test Results

### Python Unit Test Suite (`pytest`):
```
tests/test_capabilities.py::test_capabilities_endpoint PASSED            [ 11%]
tests/test_health.py::test_health_endpoint PASSED                        [ 22%]
tests/test_health.py::test_root_endpoint PASSED                          [ 33%]
tests/test_image_validation.py::test_validate_valid_jpeg PASSED          [ 44%]
tests/test_image_validation.py::test_validate_valid_png PASSED           [ 55%]
tests/test_image_validation.py::test_validate_empty_file PASSED          [ 66%]
tests/test_image_validation.py::test_validate_unsupported_extension PASSED [ 77%]
tests/test_image_validation.py::test_validate_corrupted_file PASSED      [ 88%]
tests/test_image_validation.py::test_validate_too_small_dimensions PASSED [100%]

======================== 9 passed in 1.15s =========================
```

### TypeScript & Vite Build Verifications:
- `client`: `npm --prefix client run build` completed with **0 errors**.
- `server`: `npm --prefix server run build` completed with **0 errors**.

---

## 8. Current Limitations & Roadmap to Milestone 5.1

1. **Current Limitations**:
   - The Python service strictly validates file decodability and geometry. It does not yet perform machine-learning inference.
   - Clinical eye images must continue to be reviewed by licensed optometrists.
2. **Next Milestone Recommendations**:
   - Research lightweight pretrained eye landmarking models (e.g. MediaPipe Iris, OpenCV Haar cascade eye detectors).
   - Evaluate anterior segment illumination assessment algorithms.
   - Establish benchmarking datasets for Indian rural lighting conditions.
