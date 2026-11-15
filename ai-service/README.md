# VisionBridge AI & Computer Vision Service

FastAPI-based Python microservice providing foundational image upload validation and architecture for upcoming ocular computer-vision models.

## Architectural Position

```
[React Frontend] (Port 5173)
       │
       ▼ (REST / JWT)
[Node.js Backend] (Port 5000)
       │
       ▼ (Internal Microservice Gateway)
[Python FastAPI AI Service] (Port 8001)
```

The browser client communicates strictly with the Node.js backend. The Node.js backend proxies and coordinates calls to this Python service.

## Prerequisites

- Python 3.11 or 3.12
- pip

## Quick Setup (Windows PowerShell)

```powershell
# 1. Navigate to directory
cd ai-service

# 2. Create virtual environment (if not already created)
python -m venv .venv

# 3. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment file
Copy-Item .env.example .env

# 6. Run the FastAPI service
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

## Quick Setup (macOS / Linux)

```bash
# 1. Navigate to directory
cd ai-service

# 2. Create virtual environment
python3 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Copy environment file
cp .env.example .env

# 6. Run the FastAPI service
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

## API Documentation

When the service is running, interactive OpenAPI/Swagger documentation is available at:
- **Swagger UI**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **ReDoc**: [http://127.0.0.1:8001/redoc](http://127.0.0.1:8001/redoc)

## Implemented Endpoints (Milestone 5.0)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns service health status, API version, and runtime Python version |
| `GET` | `/api/v1/capabilities` | Returns structured catalog of planned computer-vision capabilities |
| `POST` | `/api/v1/images/validate` | Non-clinical upload validation (format, dimensions, decodability) |

## Running Automated Tests

```powershell
# With virtual environment activated:
pytest -v
```
