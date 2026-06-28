import os
import re
from dotenv import load_dotenv

load_dotenv()


def _int_list(key: str, default: list[int] | None = None) -> list[int]:
    raw = os.getenv(key, "")
    if not raw:
        return default or []
    return [int(x.strip()) for x in raw.split(",") if x.strip().isdigit()]


def _int(key: str, default: int = 0) -> int:
    raw = os.getenv(key)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


BOT_TOKEN = os.getenv("BOT_TOKEN", "")
BOT_MODE = os.getenv("BOT_MODE", "polling")
PORT = _int("PORT", 8000)
HOST = os.getenv("HOST", "0.0.0.0")
WEBHOOK_PATH = os.getenv("WEBHOOK_PATH", "/webhook")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")

MONGODB_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://localhost:27017/media_downloader",
)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "media_downloader")
MONGODB_USERS_COLLECTION = os.getenv("MONGODB_USERS_COLLECTION", "users")
MONGODB_DOWNLOADS_COLLECTION = os.getenv("MONGODB_DOWNLOADS_COLLECTION", "downloads")

ADMIN_IDS = _int_list("ADMIN_IDS", [])

COBALT_API_URL = os.getenv("COBALT_API_URL", "http://cobalt-api:9000/")
COBALT_API_KEY = os.getenv("COBALT_API_KEY", "")

FREE_DAILY_QUOTA_MB = _int("FREE_DAILY_QUOTA_MB", 5120)
FREE_MAX_FILE_MB = _int("FREE_MAX_FILE_MB", 2048)
PREMIUM_MAX_FILE_MB = _int("PREMIUM_MAX_FILE_MB", 2000)

BLUEPAL_API_KEY = os.getenv("BLUEPAL_API_KEY", "")
BLUEPAL_CALLBACK_URL = os.getenv("BLUEPAL_CALLBACK_URL", "")

FORCE_JOIN_CHANNEL = os.getenv("FORCE_JOIN_CHANNEL", "")
FORCE_JOIN_LINK = os.getenv("FORCE_JOIN_LINK", "")

COOKIE_FILE = os.getenv("COOKIE_FILE", "")

LOCAL_BOT_API_URL = os.getenv("LOCAL_BOT_API_URL", "")

WEB_ADMIN_PASSWORD = os.getenv("WEB_ADMIN_PASSWORD", "admin")

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")

PLATFORM_IDENTIFIERS = {
    "youtube.com": "YouTube",
    "youtu.be": "YouTube",
    "instagram.com": "Instagram",
    "tiktok.com": "TikTok",
    "vm.tiktok.com": "TikTok",
    "x.com": "X/Twitter",
    "twitter.com": "X/Twitter",
    "facebook.com": "Facebook",
    "fb.watch": "Facebook",
    "pinterest.com": "Pinterest",
    "reddit.com": "Reddit",
    "reddit.app.link": "Reddit",
    "vimeo.com": "Vimeo",
    "soundcloud.com": "SoundCloud",
}


def extract_url(text: str) -> str | None:
    match = re.search(r"https?://[^\s]+", text)
    return match.group(0) if match else None


def detect_platform(url: str) -> str | None:
    for pattern, platform in PLATFORM_IDENTIFIERS.items():
        if pattern in url:
            return platform
    return None
