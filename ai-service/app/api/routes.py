import sys
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, File, UploadFile, status, Query
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.common import (
    HealthResponse,
    CapabilityStatus,
    CapabilityItem,
    CapabilitiesResponse,
    ImageValidationResponse,
    EyeQualityResponse,
    SegmentationResponse,
    FullEyeAnalysisResponse,
)
from app.services.image_validator import validate_image_upload
from app.services.quality_assessor import QualityAssessor, STATUS_RETAKE
from app.services.segmentation_engine import get_segmentation_engine
from app.services.adnexal_engine import get_adnexal_engine

router = APIRouter()

PLANNED_CAPABILITIES = [
    CapabilityItem(
        id="eye_image_quality",
        name="Eye Image Quality Assessment",
        category="Pre-Analysis QA",
        status=CapabilityStatus.IMPLEMENTED,
        description="Assesses blurriness, illumination uniformity, and focus suitability for anterior segment photos with actionable recapture guidance.",
        planned_milestone="Milestone 5.1 (Active)"
    ),
    CapabilityItem(
        id="eye_detection_localization",
        name="Eye Detection and Localization",
        category="Anatomy Localization",
        status=CapabilityStatus.IMPLEMENTED,
        description="Detects anterior eye region, limbic boundary, and pupil center via hybrid neural and deterministic CV pipelines.",
        planned_milestone="Milestone 5.1 (Active)"
    ),
    CapabilityItem(
        id="iris_segmentation",
        name="Iris Segmentation",
        category="Semantic Segmentation",
        status=CapabilityStatus.IMPLEMENTED,
        description="Delineates the outer limbic boundary of the iris for spatial reference and corneal inspection.",
        planned_milestone="Milestone 5.1 (Active)"
    ),
    CapabilityItem(
        id="pupil_segmentation",
        name="Pupil Segmentation",
        category="Semantic Segmentation",
        status=CapabilityStatus.IMPLEMENTED,
        description="Delineates pupillary margin, pupil center, and computes relative pupillary asymmetry indicators.",
        planned_milestone="Milestone 5.1 (Active)"
    ),
    CapabilityItem(
        id="geometric_eye_analysis",
        name="Geometric Eye Analysis",
        category="Quantitative Telemetry",
        status=CapabilityStatus.IMPLEMENTED,
        description="Calculates pupil-to-iris diameter ratios, limbal boundary metrics, and coverage percentages.",
        planned_milestone="Milestone 5.1 (Active)"
    ),
    CapabilityItem(
        id="adnexal_alignment_telemetry",
        name="Adnexal & Alignment Telemetry",
        category="Adnexal Biometry",
        status=CapabilityStatus.IMPLEMENTED,
        description="Measures palpebral fissure height (PFH), margin reflex distances (MRD1/MRD2), ptosis asymmetry, IPD, and Hirschberg alignment.",
        planned_milestone="Milestone 5.2B (Active)"
    ),
    CapabilityItem(
        id="fundus_cup_to_disc",
        name="Optic Nerve Cup-to-Disc Ratio (Fundus)",
        category="Posterior Telemetry",
        status=CapabilityStatus.NOT_IMPLEMENTED,
        description="Estimates optic cup to optic disc diameter ratio on dilated fundus photographs.",
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
    summary="List Computer Vision Capabilities",
    tags=["Capabilities"]
)
async def get_capabilities():
    """
    Return a structured catalog of active and planned computer-vision capabilities.
    """
    implemented = [c for c in PLANNED_CAPABILITIES if c.status == CapabilityStatus.IMPLEMENTED]
    return CapabilitiesResponse(
        service=settings.SERVICE_NAME,
        total_capabilities=len(PLANNED_CAPABILITIES),
        implemented_count=len(implemented),
        capabilities=PLANNED_CAPABILITIES,
        note="VisionBridge EyeCapture AI capabilities: 5 active anterior-segment modules, 1 planned posterior module."
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
    Checks file size, decodability, extensions, and dimensions.
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


# --- Milestone 5.1: EyeCapture AI Endpoints ---

@router.get(
    "/api/v1/eye-analysis/status",
    summary="EyeCapture AI Engine Status",
    tags=["EyeCapture AI"]
)
async def get_eye_analysis_status():
    """
    Return active status of EyeCapture AI pipelines, loaded model weights,
    and computational hardware runtime.
    """
    engine = get_segmentation_engine()
    return {
        "status": "ONLINE",
        "module": "VisionBridge EyeCapture AI",
        "version": "1.1.0",
        "capabilities": [
            "AI Eye Image Quality Assessment",
            "Anterior Ocular Segmentation (Sclera, Iris, Pupil)",
            "Non-Clinical Geometric Telemetry (Pupil/Iris Ratio)",
            "Transparent RGBA Web Overlays"
        ],
        "segmentation_engine": {
            "device": str(engine.device),
            "target_resolution": list(engine.target_size),
            "has_trained_weights": engine.has_trained_weights,
            "fallback_active": not engine.has_trained_weights,
            "fallback_method": "opencv_anatomical_localization"
        },
        "quality_engine": {
            "method": "opencv_deterministic_metrics",
            "metrics": ["laplacian_variance", "mean_luminance", "contrast_rms", "saturation_clipping"]
        },
        "regulatory_disclaimer": (
            "EyeCapture AI provides preliminary technical capture assistance only. "
            "It does NOT diagnose ocular pathology or determine spectacle prescriptions."
        )
    }


@router.post(
    "/api/v1/eye-analysis/quality-check",
    response_model=EyeQualityResponse,
    summary="Evaluate Ocular Capture Quality",
    tags=["EyeCapture AI"]
)
async def check_eye_quality(
    file: UploadFile = File(..., description="Eye photograph (JPEG, PNG, WebP)")
):
    """
    Evaluate smartphone eye photograph quality.
    Computes sharpness, illumination uniformity, glare clipping, and RMS contrast.
    Generates actionable recapture advice for the operator if degraded.
    """
    try:
        content = await file.read()
        result = QualityAssessor.evaluate(
            image_bytes=content,
            filename=file.filename or "ocular_capture.jpg"
        )
        return result
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": STATUS_RETAKE,
                "overall_score": 0.0,
                "is_usable": False,
                "filename": file.filename or "unknown",
                "sharpness_score": 0.0,
                "exposure_score": 0.0,
                "contrast_score": 0.0,
                "metrics": {
                    "laplacian_variance": 0.0,
                    "mean_luminance": 0.0,
                    "contrast_rms": 0.0,
                    "underexposed_pct": 0.0,
                    "overexposed_pct": 0.0,
                    "resolution": [0, 0]
                },
                "recapture_guidance": [f"Quality evaluation error: {str(exc)}"],
                "assessment_method": "error_handler",
                "disclaimer": "Technical assistance only. Not for clinical diagnosis."
            }
        )


@router.post(
    "/api/v1/eye-analysis/segment",
    response_model=SegmentationResponse,
    summary="Segment Ocular Anatomy & Extract Telemetry",
    tags=["EyeCapture AI"]
)
async def segment_ocular_anatomy(
    file: UploadFile = File(..., description="Eye photograph (JPEG, PNG, WebP)")
):
    """
    Segment eye photograph into Sclera, Iris, and Pupil.
    Returns geometric telemetry and transparent RGBA overlay for UI superimposition.
    """
    try:
        content = await file.read()
        engine = get_segmentation_engine()
        result = engine.segment_image(
            image_bytes=content,
            filename=file.filename or "ocular_capture.jpg"
        )
        if not result.get("success", False):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=result
            )
        return result
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": f"Segmentation pipeline error: {str(exc)}",
                "filename": file.filename or "unknown"
            }
        )


@router.post(
    "/api/v1/eye-analysis/analyze",
    response_model=FullEyeAnalysisResponse,
    summary="Comprehensive Quality Screening + Anatomy Segmentation",
    tags=["EyeCapture AI"]
)
async def analyze_eye_photograph(
    file: UploadFile = File(..., description="Eye photograph (JPEG, PNG, WebP)"),
    force_segmentation: bool = Query(
        False,
        description="If True, performs segmentation even when image is marked RETAKE_RECOMMENDED"
    )
):
    """
    Orchestrated pipeline:
    1. Evaluates capture quality and generates recapture guidance.
    2. If image quality is severely degraded (RETAKE_RECOMMENDED) and force_segmentation=False,
       halts pipeline with actionable guidance, preventing misleading anatomical contours.
    3. If quality is adequate (or force_segmentation=True), performs 4-class segmentation
       and generates base64 RGBA overlays.
    """
    try:
        content = await file.read()
        filename = file.filename or "ocular_capture.jpg"

        # Step 1: Quality assessment
        quality = QualityAssessor.evaluate(image_bytes=content, filename=filename)

        # Step 2: Quality gating
        if quality["status"] == STATUS_RETAKE and not force_segmentation and not quality["is_usable"]:
            return FullEyeAnalysisResponse(
                success=True,
                filename=filename,
                quality=quality,
                segmentation=None,
                halted_due_to_poor_quality=True,
                message=(
                    "Anatomical segmentation skipped due to inadequate capture quality. "
                    "Follow recapture guidance to record a clearer photograph."
                )
            )

        # Step 3: Anatomical segmentation
        engine = get_segmentation_engine()
        segmentation = engine.segment_image(image_bytes=content, filename=filename)

        return FullEyeAnalysisResponse(
            success=True,
            filename=filename,
            quality=quality,
            segmentation=segmentation if segmentation.get("success", False) else None,
            halted_due_to_poor_quality=False,
            message="EyeCapture AI analysis completed successfully."
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "filename": file.filename or "unknown",
                "quality": None,
                "segmentation": None,
                "halted_due_to_poor_quality": False,
                "message": f"Eye analysis pipeline failure: {str(exc)}"
            }
        )


# --- Milestone 5.2B: Adnexal & Alignment Telemetry Endpoints ---

@router.get(
    "/api/v1/adnexal/status",
    summary="Adnexal Telemetry Engine Status",
    tags=["Adnexal Telemetry"]
)
async def get_adnexal_status():
    """
    Return operational status of Google MediaPipe FaceLandmarker and
    unilateral macro segmentation fallback engines.
    """
    engine = get_adnexal_engine()
    has_model = engine.landmarker is not None
    return {
        "status": "ONLINE",
        "module": "VisionBridge Adnexal & Alignment Engine",
        "version": "1.2.0",
        "framework": "Google MediaPipe Tasks (478-Landmark FaceMesh + Iris Topology)",
        "model_loaded": has_model,
        "supported_modes": [
            "BILATERAL_FACE_LANDMARKER",
            "UNILATERAL_MACRO_CLOSEUP"
        ],
        "metrics_computed": [
            "Palpebral Fissure Height (PFH)",
            "Margin Reflex Distance 1 (MRD1 proxy)",
            "Margin Reflex Distance 2 (MRD2 proxy)",
            "Interpupillary Distance (IPD in mm)",
            "Ptosis Asymmetry Index (%)",
            "Hirschberg Strabismus Alignment Index"
        ],
        "regulatory_disclaimer": (
            "Adnexal and alignment telemetry provides preliminary photographic assistance only. "
            "It does NOT replace manual prism cover testing, exophthalmometry, or specialized ophthalmic evaluation."
        )
    }


@router.post(
    "/api/v1/adnexal/analyze",
    summary="Analyze Ocular Adnexa & Optical Alignment",
    tags=["Adnexal Telemetry"]
)
async def analyze_adnexal_telemetry(
    file: UploadFile = File(..., description="Frontal facial portrait or anterior eye photograph (JPEG, PNG, WebP)"),
    eye_side: Optional[str] = Query(None, description="Optional target eye side: RIGHT (OD) or LEFT (OS)")
):
    """
    Processes a facial or ocular photograph:
    - Bilateral mode: Measures left/right PFH, MRD1, MRD2, IPD, eyelid asymmetry, and strabismus deviation.
    - Unilateral macro fallback: Measures single-eye eyelid margins and calibrated iris diameter.
    Returns quantitative telemetry, clinical recommendations, and a transparent RGBA overlay.
    """
    try:
        content = await file.read()
        filename = file.filename or "adnexal_capture.jpg"
        engine = get_adnexal_engine()
        result = engine.analyze_image(image_bytes=content, filename=filename, eye_side=eye_side)
        return result
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "detected": False,
                "filename": file.filename or "unknown",
                "error": f"Adnexal analysis failure: {str(exc)}",
                "disclaimer": "Technical assistance only. Not for standalone clinical diagnosis."
            }
        )

