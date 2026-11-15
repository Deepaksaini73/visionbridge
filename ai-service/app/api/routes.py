import sys
from datetime import datetime, timezone
from fastapi import APIRouter, File, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.common import (
    HealthResponse,
    CapabilityStatus,
    CapabilityItem,
    CapabilitiesResponse,
    ImageValidationResponse,
)
from app.services.image_validator import validate_image_upload

router = APIRouter()

PLANNED_CAPABILITIES = [
    CapabilityItem(
        id="eye_image_quality",
        name="Eye Image Quality Assessment",
        category="Pre-Analysis QA",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Assesses blurriness, illumination uniformity, and focus suitability for anterior segment & fundus photos.",
        planned_milestone="Milestone 5.1+"
    ),
    CapabilityItem(
        id="eye_detection_localization",
        name="Eye Detection and Localization",
        category="Anatomy Localization",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Detects left and right eye bounding regions and key ocular landmarks (canthus, palpebral fissure).",
        planned_milestone="Milestone 5.1+"
    ),
    CapabilityItem(
        id="iris_segmentation",
        name="Iris Segmentation",
        category="Semantic Segmentation",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Identifies the outer limbic boundary of the iris for spatial reference and corneal inspection.",
        planned_milestone="Milestone 5.2+"
    ),
    CapabilityItem(
        id="pupil_segmentation",
        name="Pupil Segmentation",
        category="Semantic Segmentation",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Delineates pupillary margin, pupil center, and computes relative pupillary asymmetry indicators.",
        planned_milestone="Milestone 5.2+"
    ),
    CapabilityItem(
        id="geometric_eye_analysis",
        name="Geometric Eye Analysis",
        category="Quantitative Telemetry",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Calculates pupil-to-iris diameter ratios, limbal distance metrics, and horizontal visible iris diameter (HVID).",
        planned_milestone="Milestone 5.3+"
    ),
]


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="AI Service Health Check",
    tags=["System"]
)
async def get_health():
    """
    Return operational status of the Python AI & Computer Vision microservice.
    Used by Node.js backend proxy and monitoring probes.
    """
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        api_version=settings.API_VERSION,
        python_version=sys.version.split()[0],
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@router.get(
    "/api/v1/capabilities",
    response_model=CapabilitiesResponse,
    summary="List Planned Computer Vision Capabilities",
    tags=["Capabilities"]
)
async def get_capabilities():
    """
    Return a structured catalog of planned computer-vision capabilities
    and their current implementation status.
    
    All specialized models are currently listed as NOT_IMPLEMENTED,
    reflecting the foundation milestone stage before model integration.
    """
    implemented = [c for c in PLANNED_CAPABILITIES if c.status == CapabilityStatus.IMPLEMENTED]
    return CapabilitiesResponse(
        service=settings.SERVICE_NAME,
        total_capabilities=len(PLANNED_CAPABILITIES),
        implemented_count=len(implemented),
        capabilities=PLANNED_CAPABILITIES,
        note="Planned computer-vision capabilities. Foundation milestone established; models to be integrated in future milestone."
    )


@router.post(
    "/api/v1/images/validate",
    response_model=ImageValidationResponse,
    summary="Validate Image Format & Decodability",
    tags=["Validation"]
)
async def validate_image(
    file: UploadFile = File(..., description="Image file to validate (JPEG, PNG, WebP)")
):
    """
    Non-clinical image upload validation.
    
    Validates:
    - Allowed image extensions and MIME types.
    - File size limits (<= 15MB).
    - Whether the image can actually be parsed and rasterized with PIL and OpenCV.
    - Image dimensions (minimum 64px, maximum 8192px).
    - Checks for empty or corrupted files.
    
    DISCLAIMER: This endpoint verifies technical decodability only. It does not
    determine clinical quality, diagnostic adequacy, or patient eye health.
    """
    try:
        content = await file.read()
        result = validate_image_upload(
            filename=file.filename or "uploaded_image",
            content=content,
            content_type=file.content_type
        )
        return result
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "valid": False,
                "filename": file.filename or "unknown",
                "format": None,
                "file_size_bytes": 0,
                "dimensions": None,
                "errors": [f"Validation request failed: {str(exc)}"],
                "warnings": [],
                "disclaimer": "Non-clinical upload validation only. Does not determine image diagnostic quality or ocular health."
            }
        )
