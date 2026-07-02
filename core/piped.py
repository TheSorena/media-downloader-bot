import os
import uuid
import aiohttp
import re
from config import DOWNLOAD_DIR

PIPED_INSTANCES = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi-admin.xyz",
    "https://api.piped.mha.fi",
    "https://pipedapi.r4fo.com",
]

class PipedError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(f"piped: {message}")


def _extract_video_id(url: str) -> str | None:
    patterns = [
        r"(?:youtube\.com/watch\?.*v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"(?:youtube\.com/shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def _quality_sort_key(stream: dict) -> int:
    raw = stream.get("quality", "").replace("p", "").replace(" ", "")
    try:
        return int(raw)
    except ValueError:
        return 0


async def _fetch_streams(video_id: str, instance: str) -> dict | None:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{instance}/streams/{video_id}",
                timeout=aiohttp.ClientTimeout(total=15),
                headers={"User-Agent": "Mozilla/5.0"},
            ) as resp:
                if resp.ok:
                    return await resp.json()
    except Exception:
        pass
    return None


async def download_youtube(
    url: str,
    video_quality: str = "720",
    audio_only: bool = False,
) -> tuple[str, str] | None:
    video_id = _extract_video_id(url)
    if not video_id:
        raise PipedError("❌ شناسه ویدیو یافت نشد.")

    data = None
    for instance in PIPED_INSTANCES:
        data = await _fetch_streams(video_id, instance)
        if data:
            break

    if not data:
        raise PipedError("❌ امکان دریافت اطلاعات ویدیو وجود ندارد.")

    title = data.get("title", "download")

    if audio_only:
        streams = data.get("audioStreams", [])
        if not streams:
            raise PipedError("❌ استریم صوتی یافت نشد.")
        picked = streams[0]
        ext = "mp3"
    else:
        clean_q = video_quality.replace("p", "")
        streams = data.get("videoStreams", [])
        if not streams:
            raise PipedError("❌ استریم ویدیویی یافت نشد.")

        target = int(clean_q) if clean_q.isdigit() else 720
        picked = None
        for s in sorted(streams, key=_quality_sort_key, reverse=True):
            sq = _quality_sort_key(s)
            if sq <= target:
                picked = s
                break
        if not picked:
            picked = streams[-1]

        ext = "mp4"

    download_url = picked.get("url")
    if not download_url:
        raise PipedError("❌ لینک دانلود یافت نشد.")

    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    file_id = uuid.uuid4().hex[:8]
    filepath = os.path.join(DOWNLOAD_DIR, f"{file_id}.{ext}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                download_url,
                timeout=aiohttp.ClientTimeout(total=900),
                headers={"User-Agent": "Mozilla/5.0"},
            ) as resp:
                if not resp.ok:
                    raise PipedError(f"خطا در دانلود: HTTP {resp.status}")
                with open(filepath, "wb") as f:
                    async for chunk in resp.content.iter_chunked(65536):
                        f.write(chunk)
    except PipedError:
        raise
    except Exception as e:
        raise PipedError(f"خطا در دانلود: {str(e)[:100]}")

    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        raise PipedError("فایل دانلود نشد.")

    return filepath, title


def get_youtube_info(url: str) -> dict:
    video_id = _extract_video_id(url)
    if not video_id:
        return {}

    for instance in PIPED_INSTANCES:
        data = asyncio.run(_fetch_streams(video_id, instance)) if "asyncio" in dir() else None
        if data:
            return {
                "title": data.get("title", ""),
                "duration": data.get("duration", 0),
                "thumbnail": data.get("thumbnailUrl", ""),
                "uploader": data.get("uploader", ""),
            }
    return {}
