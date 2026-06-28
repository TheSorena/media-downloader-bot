import os
import uuid
import aiohttp
from config import DOWNLOAD_DIR, COBALT_API_URL


async def download_via_cobalt(url: str, video_quality: str = "720", audio_only: bool = False) -> tuple[str, str] | None:
    from core.cobalt import cobalt_request_url, CobaltError

    result = await cobalt_request_url(url, video_quality, audio_only)
    download_url = result.get("url")
    filename = result.get("filename", "download.mp4")

    if not download_url:
        return None

    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    file_id = uuid.uuid4().hex[:8]
    ext = "mp3" if audio_only else "mp4"
    filepath = os.path.join(DOWNLOAD_DIR, f"{file_id}.{ext}")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "identity",
    }

    async with aiohttp.ClientSession() as session:
        async with session.get(
            download_url,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=300),
        ) as resp:
            if not resp.ok:
                raise Exception(f"Download failed: HTTP {resp.status}")

            with open(filepath, "wb") as f:
                async for chunk in resp.content.iter_chunked(65536):
                    f.write(chunk)

    return filepath, filename


def probe_video(filepath: str) -> dict:
    import subprocess
    import json

    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_streams", "-show_format",
                filepath,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        data = json.loads(result.stdout)
        video_stream = None
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                video_stream = stream
                break

        duration = int(float(data.get("format", {}).get("duration", "0")))
        width = int(video_stream.get("width", 0)) if video_stream else 0
        height = int(video_stream.get("height", 0)) if video_stream else 0

        return {"width": width, "height": height, "duration": duration}
    except Exception:
        return {"width": 0, "height": 0, "duration": 0}


def generate_thumbnail(filepath: str) -> str | None:
    import subprocess

    thumb_path = filepath + ".thumb.jpg"
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", "1",
                "-i", filepath,
                "-frames:v", "1",
                "-vf", "scale='min(320,iw)':-2",
                "-q:v", "5",
                thumb_path,
            ],
            capture_output=True,
            timeout=10,
        )
        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            return thumb_path

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", filepath,
                "-frames:v", "1",
                "-vf", "scale='min(320,iw)':-2",
                "-q:v", "5",
                thumb_path,
            ],
            capture_output=True,
            timeout=10,
        )
        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            return thumb_path
    except Exception:
        pass
    return None


def cleanup_file(filepath: str):
    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass


def cleanup_thumbnail(thumb_path: str | None):
    if thumb_path:
        cleanup_file(thumb_path)
