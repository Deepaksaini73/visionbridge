from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(default="healthy", description="Service health status")
    service: str = Field(description="Service name identifier")
    api_version: str = Field(description="Semantic version of the AI service")
    python_version: str = Field(description="Runtime Python interpreter version")
    timestamp: str = Field(description="ISO 8601 UTC timestamp of health check")


class CapabilityStatus(str, Enum):
    """Planned vs active implementation status."""
    NOT_IMPLEMENTED = "NOT_IMPLEMENTED"
    RESEARCHING = "RESEARCHING"
    IN_PROGRESS = "IN_PROGRESS"
    IMPLEMENTED = "IMPLEMENTED"


class CapabilityItem(BaseModel):
    """Structured description of an AI / Computer Vision capability."""
    id: str = Field(description="Unique capability identifier")
    name: str = Field(description="Human-readable capability title")
    category: str = Field(description="Clinical vision or computer vision subcategory")
    status: CapabilityStatus = Field(
        default=CapabilityStatus.NOT_IMPLEMENTED,
        description="Current engineering status"
    )
    description: str = Field(description="Purpose of capability in ophthalmic workflow")
    planned_milestone: str = Field(description="Target roadmap milestone for integration")


class CapabilitiesResponse(BaseModel):
    """Structured catalog of planned computer-vision capabilities."""
    service: str
    total_capabilities: int
    implemented_count: int
    capabilities: List[CapabilityItem]
    note: str = Field(
        default="Planned and active computer-vision capabilities in VisionBridge AI microservice."
    )


class ImageDimension(BaseModel):
    """Dimensions of a decoded image."""
    width: int
    height: int
    channels: int
    aspect_ratio: float


class ImageValidationResponse(BaseModel):
    """Non-clinical image upload validation result."""
    valid: bool = Field(description="True if image can be parsed and meets format criteria")
    filename: str = Field(description="Original filename received")
    format: Optional[str] = Field(default=None, description="Decoded image format (JPEG, PNG, etc.)")
    file_size_bytes: int = Field(description="Byte size of uploaded file")
    dimensions: Optional[ImageDimension] = Field(
        default=None,
        description="Pixel dimensions and aspect ratio if successfully decoded"
    )
    errors: List[str] = Field(default_factory=list, description="Validation failure messages")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings")
    disclaimer: str = Field(
        default="Non-clinical upload validation only. Does not determine image diagnostic quality or ocular health."
    )


# --- Milestone 5.1: EyeCapture AI Schemas ---

class QualityMetrics(BaseModel):
    """Raw computer vision sensor measurements."""
    laplacian_variance: float = Field(description="Laplacian variance sharpness metric")
    mean_luminance: float = Field(description="Average grayscale brightness [0..255]")
    contrast_rms: float = Field(description="RMS contrast / standard deviation")
    underexposed_pct: float = Field(description="Percentage of dark clipped pixels (<25)")
    overexposed_pct: float = Field(description="Percentage of specular clipped pixels (>235)")
    resolution: List[int] = Field(description="[width, height] in pixels")


class EyeQualityResponse(BaseModel):
    """Response schema for EyeCapture AI Quality Assessment."""
    status: str = Field(
        description="USABLE_FOR_ANALYSIS | RETAKE_RECOMMENDED | INCONCLUSIVE"
    )
    overall_score: float = Field(description="Composite suitability score [0.0..100.0]")
    is_usable: bool = Field(description="True if image meets baseline review standards")
    filename: str
    sharpness_score: float = Field(description="Normalized sharpness score [0.0..100.0]")
    exposure_score: float = Field(description="Normalized exposure balance [0.0..100.0]")
    contrast_score: float = Field(description="Normalized contrast score [0.0..100.0]")
    metrics: QualityMetrics
    recapture_guidance: List[str] = Field(
        default_factory=list,
        description="Actionable guidance tips for the operator to achieve optimal capture"
    )
    assessment_method: str = Field(
        default="opencv_deterministic_metrics",
        description="Underlying evaluation pipeline"
    )
    disclaimer: str = Field(
        default=(
            "Preliminary technical image-quality assistance only. "
            "Does not diagnose ocular conditions or determine visual acuity."
        )
    )


class LandmarkTelemetry(BaseModel):
    """Geometric center and dimensions for ocular landmark."""
    detected: bool
    center: List[int] = Field(description="[x, y] coordinates in original image space")
    estimated_diameter_px: float = Field(description="Equivalent circular diameter in pixels")


class AnatomicalTelemetry(BaseModel):
    """Non-clinical anatomical geometric telemetry."""
    iris: LandmarkTelemetry
    pupil: LandmarkTelemetry
    pupil_to_iris_ratio: float = Field(
        description="Calculated ratio of pupil diameter to iris diameter"
    )
    pupillary_symmetry_flag: str = Field(
        description="NORMAL_AMBIENT_RANGE or ASSESSMENT_SUGGESTED"
    )


class CoverageMetrics(BaseModel):
    """Percentage pixel coverage of ocular anatomical classes."""
    background_pct: float
    sclera_pct: float
    iris_pct: float
    pupil_pct: float


class SegmentationResponse(BaseModel):
    """Response schema for 4-Class Ocular Anatomy Segmentation."""
    success: bool
    filename: str
    inference_method: str = Field(
        description="Source of segmentation: 'pytorch_unet_inference' or 'opencv_anatomical_localization_fallback'"
    )
    original_dimensions: List[int] = Field(description="[width, height] in pixels")
    coverage: CoverageMetrics
    telemetry: AnatomicalTelemetry
    overlay_rgba_base64: str = Field(
        description="Base64 data URL of transparent RGBA overlay for UI superimposition"
    )
    blended_preview_base64: str = Field(
        description="Base64 data URL of original image blended with anatomical colors"
    )
    class_palette: Dict[str, str] = Field(
        description="Color mapping for segmented classes in CSS format"
    )
    disclaimer: str = Field(
        default=(
            "Anterior anatomical segmentation and geometric indicators are provided for "
            "technical visual assistance only. They do not substitute for comprehensive "
            "in-person slit-lamp biomicroscopy or professional optometrist evaluation."
        )
    )


class FullEyeAnalysisResponse(BaseModel):
    """Combined response running quality screening followed by anatomical segmentation."""
    success: bool
    filename: str
    quality: EyeQualityResponse
    segmentation: Optional[SegmentationResponse] = None
    halted_due_to_poor_quality: bool = Field(
        default=False,
        description="True if segmentation was bypassed because capture quality was insufficient"
    )
    message: str = Field(description="Summary message of the analysis pipeline")
