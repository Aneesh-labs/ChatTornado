import json
import logging
import os
import secrets
import subprocess
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from auth import decode_token
from PIL import Image
from pillow_heif import register_heif_opener
logger = logging.getLogger(__name__)

register_heif_opener()

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_UPLOAD_BYTES = 1024 * 1024 * 1024  # 1 GB
CHUNK_SIZE = 8 * 1024 * 1024           # 8 MB

import shutil

# ----------------------------------------------------------------------
# FFmpeg / FFprobe paths (Cross-Platform)
# ----------------------------------------------------------------------
def _find_binary(name: str) -> str:
    # 1. Check system PATH first
    sys_path = shutil.which(name)
    if sys_path:
        return sys_path

    # 2. Check bundled Windows binary if present
    bundled_win = (
        Path(__file__).parent
        / "ffmpeg"
        / "ffmpeg-8.1.2-essentials_build"
        / "bin"
        / f"{name}.exe"
    )
    if bundled_win.exists():
        return str(bundled_win)

    # 3. Check bundled Unix/Linux binary if present
    bundled_unix = (
        Path(__file__).parent
        / "ffmpeg"
        / "ffmpeg-8.1.2-essentials_build"
        / "bin"
        / name
    )
    if bundled_unix.exists():
        return str(bundled_unix)

    # Fallback to binary name in PATH
    return name

FFMPEG_PATH = _find_binary("ffmpeg")
FFPROBE_PATH = _find_binary("ffprobe")
# ----------------------------------------------------------------------
# Category sets for relaxed MIME validation
# ----------------------------------------------------------------------
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".heic", ".heif", ".avif"}
VIDEO_EXTENSIONS = {
    ".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".3gp",
    ".flv", ".mpeg", ".mpg", ".ts", ".mts", ".m2ts", ".wmv",
    ".asf", ".ogv", ".vob"
}
AUDIO_EXTENSIONS = {
    ".mp3", ".wav", ".aac", ".m4a", ".ogg", ".opus", ".flac",
    ".wma", ".amr", ".aiff"
}
TEXT_EXTENSIONS = {
    ".txt", ".csv", ".rtf", ".xml", ".yaml", ".yml", ".sql",
    ".php", ".go", ".rs", ".sh", ".bat", ".html", ".css",
    ".js", ".jsx", ".ts", ".tsx", ".json", ".py", ".java",
    ".cpp", ".c", ".cs"
}
ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".epub", ".odt", ".ods", ".odp"}

ALLOWED_EXTENSIONS = (
    IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | AUDIO_EXTENSIONS |
    TEXT_EXTENSIONS | ARCHIVE_EXTENSIONS | DOCUMENT_EXTENSIONS
)

# Exact MIME type map (used for strict check, fallback to relaxed)
EXTENSION_MIME_MAP = {
    # Images
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".bmp": ["image/bmp"],
    ".webp": ["image/webp"],
    ".tiff": ["image/tiff"],
    ".heic": ["image/heic"],
    ".heif": ["image/heif"],
    ".avif": ["image/avif"],
    # Videos
    ".mp4": ["video/mp4"],
    ".mov": ["video/quicktime"],
    ".mkv": ["video/x-matroska"],
    ".avi": ["video/x-msvideo"],
    ".webm": ["video/webm"],
    ".m4v": ["video/x-m4v", "video/mp4"],
    ".3gp": ["video/3gpp"],
    ".flv": ["video/x-flv"],
    ".mpeg": ["video/mpeg"],
    ".mpg": ["video/mpeg"],
    ".ts": ["video/mp2t"],
    ".mts": ["video/mp2t"],
    ".m2ts": ["video/mp2t"],
    ".wmv": ["video/x-ms-wmv"],
    ".asf": ["video/x-ms-asf"],
    ".ogv": ["video/ogg"],
    ".vob": ["video/mpeg"],
    # Audio
    ".mp3": ["audio/mpeg"],
    ".wav": ["audio/wav", "audio/x-wav"],
    ".aac": ["audio/aac"],
    ".m4a": ["audio/mp4a-latm", "audio/m4a"],
    ".ogg": ["audio/ogg"],
    ".opus": ["audio/opus"],
    ".flac": ["audio/flac"],
    ".wma": ["audio/x-ms-wma"],
    ".amr": ["audio/amr"],
    ".aiff": ["audio/aiff"],
    # Documents
    ".pdf": ["application/pdf"],
    ".txt": ["text/plain"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".xls": ["application/vnd.ms-excel"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".ppt": ["application/vnd.ms-powerpoint"],
    ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ".csv": ["text/csv"],
    ".rtf": ["application/rtf"],
    ".epub": ["application/epub+zip"],
    ".odt": ["application/vnd.oasis.opendocument.text"],
    ".ods": ["application/vnd.oasis.opendocument.spreadsheet"],
    ".odp": ["application/vnd.oasis.opendocument.presentation"],
    # Archives
    ".zip": ["application/zip"],
    ".rar": ["application/vnd.rar", "application/x-rar"],
    ".7z": ["application/x-7z-compressed"],
    ".tar": ["application/x-tar"],
    ".gz": ["application/gzip"],
    ".bz2": ["application/x-bzip2"],
    ".xz": ["application/x-xz"],
    # Code
    ".py": ["text/x-python", "text/plain"],
    ".java": ["text/x-java-source", "text/plain"],
    ".cpp": ["text/x-c", "text/plain"],
    ".c": ["text/x-c", "text/plain"],
    ".cs": ["text/x-csharp", "text/plain"],
    ".js": ["application/javascript", "text/javascript"],
    ".jsx": ["text/jsx", "application/javascript"],
    ".ts": ["application/typescript", "text/typescript"],
    ".tsx": ["text/tsx"],
    ".json": ["application/json"],
    ".xml": ["application/xml", "text/xml"],
    ".yaml": ["application/x-yaml", "text/yaml"],
    ".yml": ["application/x-yaml", "text/yaml"],
    ".sql": ["application/sql", "text/x-sql"],
    ".php": ["application/x-php", "text/plain"],
    ".go": ["text/x-go", "text/plain"],
    ".rs": ["text/x-rust", "text/plain"],
    ".sh": ["application/x-sh", "text/x-sh"],
    ".bat": ["application/x-bat", "text/plain"],
    ".html": ["text/html"],
    ".css": ["text/css"],
}

# ----------------------------------------------------------------------
# Relaxed MIME validation
# ----------------------------------------------------------------------
def is_allowed_file(extension: str, content_type: str) -> bool:
    """Return True if the extension and content type are allowed."""
    ext = extension.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False

    ct = content_type.lower() if content_type else ""

    # 1) Exact match from the map
    if ext in EXTENSION_MIME_MAP and ct in EXTENSION_MIME_MAP[ext]:
        return True

    # 2) Common browser aliases
    # application/octet-stream – trust the extension (we have a safe list)
    if ct == "application/octet-stream":
        return True

    # text/plain – acceptable for text/code files
    if ct == "text/plain" and ext in TEXT_EXTENSIONS:
        return True

    # 3) Category wildcards
    if ext in IMAGE_EXTENSIONS and ct.startswith("image/"):
        return True
    if ext in VIDEO_EXTENSIONS and ct.startswith("video/"):
        return True
    if ext in AUDIO_EXTENSIONS and ct.startswith("audio/"):
        return True
    if ext in TEXT_EXTENSIONS and ct.startswith("text/"):
        return True
    # Archives: allow application/zip, application/x-rar, etc. (already covered by map)
    # For archives, we already have exact matches; no need to relax further.

    return False

# ----------------------------------------------------------------------
# FFprobe helper (single call)
# ----------------------------------------------------------------------
def get_video_info(file_path: Path):
    """
    Return a dict with:
        container   (str): format name (e.g., 'mp4')
        video_codec (str or None)
        audio_codec (str or None)
        duration    (float): seconds
    If no video stream, video_codec is None.
    """
    cmd = [
        str(FFPROBE_PATH),
        "-v", "error",
        "-show_entries", "format=format_name,duration",
        "-show_entries", "stream=codec_name,codec_type,width,height,r_frame_rate",
        "-of", "json",
        str(file_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="FFprobe timeout")

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail="FFprobe failed to read video file")

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="FFprobe returned invalid JSON")

    info = {"container": "", "video_codec": None, "audio_codec": None, "duration": 0.0, "width": 0, "height": 0, "fps": 0.0}

    fmt = data.get("format", {})
    if fmt.get("format_name"):
        info["container"] = fmt["format_name"].lower()
    if fmt.get("duration"):
        try:
            info["duration"] = float(fmt["duration"])
        except ValueError:
            pass

    for stream in data.get("streams", []):
        codec_type = stream.get("codec_type")
        codec_name = stream.get("codec_name")
        if codec_type == "video" and codec_name and info["video_codec"] is None:
            info["video_codec"] = codec_name.lower()
            info["width"] = stream.get("width", 0)
            info["height"] = stream.get("height", 0)
            fps = stream.get("r_frame_rate", "0/1")
            try:
                num, den = fps.split("/")
                info["fps"] = round(float(num) / float(den), 2) if float(den) != 0 else 0
            except Exception:
                info["fps"] = 0
        elif codec_type == "audio" and codec_name and info["audio_codec"] is None:
            info["audio_codec"] = codec_name.lower()

    return info

# ----------------------------------------------------------------------
# Video processing helpers
# ----------------------------------------------------------------------
def is_browser_compatible_video(info: dict) -> bool:
    """Check if the video is browser compatible using ffprobe info."""
    container = info.get("container", "")
    vcodec = info.get("video_codec")
    acodec = info.get("audio_codec")

    # Container must be mp4 (or contain mp4 like 'mov,mp4')
    if "mp4" not in container:
        return False

    if vcodec != "h264":
        return False

    # If audio exists, it must be aac
    if acodec and acodec != "aac":
        return False

    return True


def convert_video_to_mp4(input_path: Path, output_path: Path) -> tuple[bool, str]:
    """Convert to H264/AAC MP4, return True on success."""
    cmd = [
        str(FFMPEG_PATH),
        "-i", str(input_path),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-profile:v", "high",
        "-movflags", "+faststart",
        "-y",
        str(output_path)
    ]
    try:
        result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=3600,
                )
        if result.returncode != 0:
            logger.error("FFmpeg conversion failed:\n%s", result.stderr)
            return False, result.stderr.strip()
        return True, ""
    except subprocess.TimeoutExpired:
        logger.exception("Video conversion timed out")
        return False, "Video conversion timed out"


def generate_video_thumbnail(input_path: Path, output_path: Path, duration: float) -> tuple[bool, str]:
    """Generate a WebP thumbnail, using an appropriate timestamp."""
    # Choose timestamp: at 1 second if duration > 1, else at half of duration (or 0 if duration <= 0)
    if duration > 1.0:
        seek_time = 1.0
    elif duration > 0:
        seek_time = duration / 2.0
    else:
        seek_time = 0.0

    cmd = [
        str(FFMPEG_PATH),
        "-i", str(input_path),
        "-ss", f"{seek_time:.3f}",
        "-vframes", "1",
        "-vf", "scale=480:-1",
        "-f", "image2",
        "-c:v", "libwebp",
        "-quality", "90",
        "-compression_level", "4",
        "-y",
        str(output_path)
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            logger.error("FFmpeg thumbnail generation failed:\n%s", result.stderr)
            return False, result.stderr.strip()
        return True, ""
    except subprocess.TimeoutExpired:
        logger.exception("Thumbnail generation timed out")
        return False, "Thumbnail generation timed out"


# ----------------------------------------------------------------------
# Upload endpoint
# ----------------------------------------------------------------------
@router.post("")
async def upload_file(token: str, file: UploadFile = File(...)):
    print("UPLOAD ENDPOINT HIT:", file.filename)
    # Authenticate
    if not decode_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")

    # Check ffmpeg/ffprobe existence once
    if not FFMPEG_PATH.exists():
        raise HTTPException(status_code=500, detail="FFmpeg not found on server")
    if not FFPROBE_PATH.exists():
        raise HTTPException(status_code=500, detail="FFprobe not found on server")

    # Safe filename
    original_name = Path(file.filename or "upload").name
    if not original_name:
        original_name = "upload"

    extension = Path(original_name).suffix.lower()
    content_type = (file.content_type or "application/octet-stream").lower()

    # Validate file type
    if not is_allowed_file(extension, content_type):
        raise HTTPException(
            status_code=415,
            detail="This file type is not supported"
        )

    # Generate a safe random filename
    suffix = extension[:12]
    filename = f"{secrets.token_urlsafe(18)}{suffix}"

    upload_dir = Path(
        os.getenv("UPLOAD_DIR", Path(__file__).parent / "uploads")
    )
    upload_dir.mkdir(parents=True, exist_ok=True)

    original_path = upload_dir / filename
    total_size = 0

    # Streaming upload with size limit
    try:
        with open(original_path, "wb") as output:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_BYTES:
                    output.close()
                    if original_path.exists():
                        original_path.unlink()
                    raise HTTPException(
                        status_code=413,
                        detail="Files must be 1 GB or smaller"
                    )
                output.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        if original_path.exists():
            original_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Upload failed: {exc}"
        )

    if total_size == 0:
        if original_path.exists():
            original_path.unlink()
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    # Determine final file, preview, thumbnail, etc.
    final_path = original_path
    preview_path = None
    thumbnail_path = None
    is_video = content_type.startswith("video/") or extension in VIDEO_EXTENSIONS

    # --------------------------------------------------------------
    # HEIC / HEIF preview generation (existing behaviour)
    # --------------------------------------------------------------
    if extension in (".heic", ".heif"):
        try:
            preview_filename = f"{Path(filename).stem}.webp"
            preview_path = upload_dir / preview_filename
            with Image.open(original_path) as img:
                img.load()
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGB")
                img.save(
                    preview_path,
                    "WEBP",
                    quality=90,
                    method=6
                )
            preview_for_response = preview_path
        except Exception as exc:
            
            logger.exception("HEIC preview generation failed")
            preview_for_response = original_path  # fallback
    # --------------------------------------------------------------
    # Video processing (conversion + thumbnail)
    # --------------------------------------------------------------
    elif is_video:
        # Get video info
        try:
            info = get_video_info(original_path)
        except HTTPException:
            # If ffprobe fails, we cannot process; clean up and abort
            if original_path.exists():
                original_path.unlink()
            raise HTTPException(status_code=500, detail="Failed to read video metadata")

        compatible = is_browser_compatible_video(info)

        if compatible:
            final_path = original_path
        else:
            # Convert to MP4
            mp4_name = f"{Path(filename).stem}_converted.mp4"
            mp4_path = upload_dir / mp4_name
            success, error = convert_video_to_mp4(original_path, mp4_path)

            if not success:
                if original_path.exists():
                    original_path.unlink()
                if mp4_path.exists():
                    mp4_path.unlink()   
                raise HTTPException(
                    status_code=500,
                    detail=error
                )
            # Delete original, keep converted
            if original_path.exists():
                original_path.unlink()
            final_path = mp4_path
            filename = mp4_name  # update filename
            content_type = "video/mp4"
            original_path = mp4_path
            info = get_video_info(final_path)

        # Generate thumbnail for every video
        thumb_name = f"thumb_{Path(filename).stem}.webp"
        thumb_path = upload_dir / thumb_name
        duration = info.get("duration", 0.0)
        success, thumb_error = generate_video_thumbnail(
            final_path,
            thumb_path,
            duration
        )
        if success:
            thumbnail_path = thumb_path
        else:
            # Thumbnail generation failed; delete any partial file
            if thumb_path.exists():
                thumb_path.unlink()
            thumbnail_path = None

        # For video, preview_url will point to thumbnail if available, else to video itself
        preview_for_response = thumbnail_path if thumbnail_path else final_path
    else:
        # Non-video, non-HEIC: no extra processing
        final_path = original_path
        preview_for_response = original_path

    # Build response (preserve existing fields and add new ones)
    final_url = f"/uploads/{final_path.name}"
    original_url = f"/uploads/{original_path.name}" if content_type in ("image/heic", "image/heif") else final_url
    preview_url = f"/uploads/{preview_for_response.name}" if preview_for_response else None
    thumbnail_url = f"/uploads/{thumbnail_path.name}" if thumbnail_path and is_video else None
    playback_url = final_url if is_video else None

    response = {
        "url": final_url,
        "original_url": original_url,
        "preview_url": preview_url,
        "name": original_name,
        "content_type": content_type,
        "size": total_size,
        "thumbnail_url": thumbnail_url,
        "playback_url": playback_url,
    }
    response["width"] = info.get("width", 0) if is_video else None
    response["height"] = info.get("height", 0) if is_video else None
    response["fps"] = info.get("fps", 0) if is_video else None
    response["duration"] = info.get("duration", 0) if is_video else None
    response["codec"] = info.get("video_codec") if is_video else None
    response["audio_codec"] = info.get("audio_codec") if is_video else None
    response["container"] = info.get("container") if is_video else None
    return response