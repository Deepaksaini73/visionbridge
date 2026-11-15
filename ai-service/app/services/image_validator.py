import io
import os
from typing import Optional
import numpy as np
from PIL import Image, UnidentifiedImageError
import cv2

from app.core.config import settings
from app.schemas.common import ImageDimension, ImageValidationResponse


def validate_image_upload(
    filename: str,
    content: bytes,
    content_type: Optional[str] = None
) -> ImageValidationResponse:
    """
    Perform structural, non-clinical upload validation on an image buffer.
    
    Checks:
    1. Empty file detection.
    2. File size constraints (<= 15MB).
    3. File extension against allowed list (jpg, jpeg, png, webp).
    4. Successful image decoding with PIL & OpenCV.
    5. Dimension integrity (width, height, channels, aspect ratio).
    6. Non-clinical advisory warnings (low resolution, extreme aspect ratio).
    
    NOTE: This endpoint strictly validates technical file decodability and
    formats. It does not perform clinical quality scoring or ocular disease detection.
    """
    errors = []
    warnings = []
    dimensions = None
    decoded_format = None
    file_size = len(content)

    # 1. Empty content check
    if file_size == 0:
        errors.append("Uploaded file is empty (0 bytes).")
        return ImageValidationResponse(
            valid=False,
            filename=filename or "unknown",
            format=None,
            file_size_bytes=0,
            dimensions=None,
            errors=errors,
            warnings=warnings,
        )

    # 2. Maximum file size check
    if file_size > settings.MAX_IMAGE_SIZE_BYTES:
        max_mb = settings.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        errors.append(
            f"File size exceeds the {max_mb:.0f} MB limit (received {file_size / (1024 * 1024):.2f} MB)."
        )

    # 3. Filename & Extension check
    clean_filename = filename or "unnamed_image"
    ext = os.path.splitext(clean_filename)[1].lstrip(".").lower()
    if not ext:
        errors.append("File name does not contain a recognized file extension.")
    elif ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        errors.append(
            f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_IMAGE_EXTENSIONS)}."
        )

    # 4. MIME type check if supplied
    if content_type and content_type.lower() not in settings.ALLOWED_IMAGE_MIME_TYPES:
        warnings.append(
            f"MIME type '{content_type}' might not match standard formats ({', '.join(settings.ALLOWED_IMAGE_MIME_TYPES)})."
        )

    # 5. Image Decoding with PIL
    pil_image = None
    try:
        pil_image = Image.open(io.BytesIO(content))
        pil_image.verify()  # Verifies file integrity without full decoding
        # Reopen because verify() closes the file pointer in PIL
        pil_image = Image.open(io.BytesIO(content))
        decoded_format = pil_image.format
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError) as err:
        errors.append(f"Image could not be parsed: file is corrupted or not a valid image ({str(err)}).")

    # 6. Image Decoding with OpenCV (verifies raster compatibility)
    cv_image = None
    if pil_image is not None:
        try:
            nparr = np.frombuffer(content, np.uint8)
            cv_image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
            if cv_image is None:
                errors.append("OpenCV failed to decode image buffer. File may contain incomplete raster data.")
        except Exception as cv_err:
            errors.append(f"OpenCV decoding error: {str(cv_err)}")

    # 7. Dimension and aspect ratio evaluation
    if pil_image is not None and cv_image is not None and len(errors) == 0:
        width, height = pil_image.size
        
        # Calculate channel count safely
        if len(cv_image.shape) == 2:
            channels = 1
        else:
            channels = cv_image.shape[2]

        aspect_ratio = round(width / height, 3) if height > 0 else 0.0

        dimensions = ImageDimension(
            width=width,
            height=height,
            channels=channels,
            aspect_ratio=aspect_ratio,
        )

        # Dimension boundaries
        if width < settings.MIN_IMAGE_DIMENSION or height < settings.MIN_IMAGE_DIMENSION:
            errors.append(
                f"Image dimensions ({width}x{height}) are smaller than minimum allowed ({settings.MIN_IMAGE_DIMENSION}x{settings.MIN_IMAGE_DIMENSION})."
            )
        elif width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
            errors.append(
                f"Image dimensions ({width}x{height}) exceed maximum allowed ({settings.MAX_IMAGE_DIMENSION}x{settings.MAX_IMAGE_DIMENSION})."
            )

        # Advisory warnings (non-fatal)
        if width < 300 or height < 300:
            warnings.append(
                "Image resolution is low (< 300px). For clinical eye inspection, higher resolution is recommended."
            )
        if aspect_ratio < 0.4 or aspect_ratio > 2.5:
            warnings.append(
                f"Unusual aspect ratio ({aspect_ratio}). Standard anterior segment or fundus photos are usually closer to 4:3 or 1:1."
            )

    is_valid = len(errors) == 0

    return ImageValidationResponse(
        valid=is_valid,
        filename=clean_filename,
        format=decoded_format,
        file_size_bytes=file_size,
        dimensions=dimensions,
        errors=errors,
        warnings=warnings,
    )
