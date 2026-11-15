import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def create_test_image_bytes(width=320, height=240, format="JPEG", color=(100, 150, 200)) -> bytes:
    """Helper to generate in-memory synthetic image bytes."""
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


def test_validate_valid_jpeg():
    """Verify that a standard JPEG image is accepted and dimensions returned."""
    img_bytes = create_test_image_bytes(400, 300, format="JPEG")
    files = {"file": ("eye_sample.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["filename"] == "eye_sample.jpg"
    assert data["format"] == "JPEG"
    assert data["dimensions"]["width"] == 400
    assert data["dimensions"]["height"] == 300
    assert data["dimensions"]["channels"] == 3
    assert len(data["errors"]) == 0
    assert "Non-clinical" in data["disclaimer"]


def test_validate_valid_png():
    """Verify that a valid PNG image is accepted."""
    img_bytes = create_test_image_bytes(512, 512, format="PNG")
    files = {"file": ("anterior_segment.png", img_bytes, "image/png")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["dimensions"]["width"] == 512
    assert data["dimensions"]["height"] == 512


def test_validate_empty_file():
    """Verify that an empty (0 byte) file is rejected."""
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("empty" in err.lower() for err in data["errors"])


def test_validate_unsupported_extension():
    """Verify that an unsupported extension (.txt, .exe, .pdf) is rejected."""
    files = {"file": ("document.txt", b"Hello text", "text/plain")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("unsupported" in err.lower() for err in data["errors"])


def test_validate_corrupted_file():
    """Verify that random corrupted bytes disguised as .jpg are rejected."""
    corrupted_bytes = b"NOT_A_REAL_IMAGE_CORRUPTED_HEADER_123456789"
    files = {"file": ("corrupted.jpg", corrupted_bytes, "image/jpeg")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("corrupted" in err.lower() or "not a valid image" in err.lower() for err in data["errors"])


def test_validate_too_small_dimensions():
    """Verify that an image below minimum dimensions (e.g. 16x16) is flagged as invalid."""
    tiny_bytes = create_test_image_bytes(16, 16, format="JPEG")
    files = {"file": ("tiny.jpg", tiny_bytes, "image/jpeg")}
    response = client.post("/api/v1/images/validate", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("smaller than minimum" in err.lower() for err in data["errors"])
