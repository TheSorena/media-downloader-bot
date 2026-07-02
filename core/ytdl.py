import os
import uuid
import yt_dlp
from config import DOWNLOAD_DIR, COOKIE_FILE


class YtdlError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(f"ytdl: {message}")


def _base_opts() -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
        "extractor_retries": 3,
        "file_access_retries": 3,
        "ignoreerrors": False,
        "force_ipv4": True,
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "extractor_args": {
            "youtube": {
                "player_client": ["tv", "web_embedded"],
                "player_skip": ["webpage"],
            },
        },
    }
    if COOKIE_FILE and os.path.exists(COOKIE_FILE):
        opts["cookiefile"] = COOKIE_FILE
    return opts


async def download_youtube(
    url: str,
    video_quality: str = "720",
    audio_only: bool = False,
) -> tuple[str, str] | None:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    file_id = uuid.uuid4().hex[:8]

    if audio_only:
        outtmpl = os.path.join(DOWNLOAD_DIR, f"{file_id}.%(ext)s")
        ydl_opts = _base_opts()
        ydl_opts.update({
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
        })
    else:
        quality_map = {
            "4320": "bestvideo*+bestaudio/best[height<=4320]",
            "2160": "bestvideo*+bestaudio/best[height<=2160]",
            "1440": "bestvideo*+bestaudio/best[height<=1440]",
            "1080": "bestvideo*+bestaudio/best[height<=1080]",
            "720": "bestvideo*+bestaudio/best[height<=720]",
            "480": "bestvideo*+bestaudio/best[height<=480]",
            "360": "bestvideo*+bestaudio/best[height<=360]",
        }
        clean_quality = video_quality.replace("p", "")
        fmt = quality_map.get(clean_quality, quality_map["720"])

        outtmpl = os.path.join(DOWNLOAD_DIR, f"{file_id}.%(ext)s")
        ydl_opts = _base_opts()
        ydl_opts.update({
            "format": fmt,
            "outtmpl": outtmpl,
            "merge_output_format": "mp4",
        })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            if not info:
                raise YtdlError("اطلاعات ویدیو دریافت نشد.")

            filepath = ydl.prepare_filename(info)
            if not os.path.exists(filepath):
                base = os.path.splitext(filepath)[0]
                for e in ["mp4", "mkv", "webm", "mp3", "ogg"]:
                    candidate = f"{base}.{e}"
                    if os.path.exists(candidate):
                        filepath = candidate
                        break

            if not os.path.exists(filepath):
                raise YtdlError("فایل دانلود شد ولی یافت نشد.")

            title = info.get("title", "download")
            return filepath, title

    except yt_dlp.utils.DownloadError as e:
        error_msg = str(e).lower()
        if "sign in" in error_msg or "login" in error_msg:
            raise YtdlError("🔑 یوتیوب نیاز به ورود دارد.")
        elif "private" in error_msg:
            raise YtdlError("🔒 این ویدیو خصوصیه.")
        elif "unavailable" in error_msg or "not found" in error_msg:
            raise YtdlError("❌ ویدیو یافت نشد.")
        elif "geo" in error_msg or "block" in error_msg:
            raise YtdlError("🌍 این محتوا در منطقه شما در دسترس نیست.")
        elif "timeout" in error_msg:
            raise YtdlError("⏳ زمان پردازش تمام شد.")
        raise YtdlError(f"خطا در دانلود: {str(e)[:200]}")
    except Exception as e:
        if isinstance(e, YtdlError):
            raise
        raise YtdlError(f"خطا در دانلود: {str(e)[:200]}")


def get_youtube_info(url: str) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "noplaylist": True,
        "socket_timeout": 30,
        "force_ipv4": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["tv", "web_embedded"],
                "player_skip": ["webpage"],
            },
        },
    }
    if COOKIE_FILE and os.path.exists(COOKIE_FILE):
        opts["cookiefile"] = COOKIE_FILE

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {}
            return {
                "title": info.get("title", ""),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "uploader": info.get("uploader", ""),
            }
    except Exception:
        return {}
