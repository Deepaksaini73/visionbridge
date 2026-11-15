from enum import Enum
from typing import List, Optional
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
        default="Planned computer-vision capabilities. Pretrained models will be integrated in future milestone."
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
