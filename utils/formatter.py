from datetime import datetime, timezone
from config import FREE_DAILY_QUOTA_MB, FREE_MAX_FILE_MB, PREMIUM_MAX_FILE_MB
import locales.fa as fa


def get_day_key() -> str:
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%d")


def format_bytes(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def format_duration(seconds: int) -> str:
    if seconds <= 0:
        return "نامشخص"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def format_number(n: int) -> str:
    return f"{n:,}"


def check_quota(user: dict, file_size: int) -> dict:
    if user.get("is_premium"):
        max_file = PREMIUM_MAX_FILE_MB * 1024 * 1024
    else:
        max_file = FREE_MAX_FILE_MB * 1024 * 1024

    if file_size > max_file:
        return {
            "ok": False,
            "message": fa.file_too_large(format_bytes(file_size), format_bytes(max_file)),
        }

    if not user.get("is_premium"):
        day_key = get_day_key()
        from models.user import get_quota_used
        used = get_quota_used(user["telegram_id"], day_key)
        limit = FREE_DAILY_QUOTA_MB * 1024 * 1024
        if used + file_size > limit:
            return {
                "ok": False,
                "message": fa.quota_exceeded(format_bytes(used), format_bytes(limit)),
            }

    return {"ok": True}
