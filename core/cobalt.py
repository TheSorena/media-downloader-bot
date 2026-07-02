import aiohttp
from config import COBALT_API_URL, COBALT_API_KEY


class CobaltError(Exception):
    def __init__(self, code: str, message: str = ""):
        self.code = code
        self.message = message
        super().__init__(f"cobalt: {code} - {message}")


async def cobalt_request_url(
    url: str,
    video_quality: str = "720",
    audio_only: bool = False,
    audio_format: str = "mp3",
) -> dict:
    payload = {
        "url": url,
        "downloadMode": "audio" if audio_only else "auto",
        "audioFormat": audio_format,
        "audioBitrate": "128",
        "filenameStyle": "pretty",
    }
    if not audio_only:
        clean_quality = video_quality.replace("p", "")
        if clean_quality in ("max", "4320", "2160", "1440", "1080", "720", "480", "360", "240", "144"):
            payload["videoQuality"] = clean_quality
        else:
            payload["videoQuality"] = "720"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "MediaDownloaderBot/2.0",
    }
    if COBALT_API_KEY:
        headers["Authorization"] = f"Api-Key {COBALT_API_KEY}"

    async with aiohttp.ClientSession() as session:
        async with session.post(
            COBALT_API_URL,
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=120),
        ) as resp:
            if not resp.ok:
                text = await resp.text()
                raise CobaltError("http_error", f"HTTP {resp.status}: {text[:200]}")

            data = await resp.json()

    status = data.get("status", "")

    if status == "error":
        error_code = data.get("error", {}).get("code", "unknown")
        raise CobaltError(error_code, cobalt_error_to_message(error_code))

    if status in ("tunnel", "redirect"):
        return {"status": status, "url": data.get("url"), "filename": data.get("filename", "download.mp4")}

    if status == "picker":
        picker = data.get("picker", [])
        for item in picker:
            if item.get("type") == "video" and item.get("url"):
                return {"status": "picker", "url": item["url"], "filename": "download.mp4"}
        if picker:
            return {"status": "picker", "url": picker[0].get("url"), "filename": "download.mp4"}
        raise CobaltError("empty_picker", "No downloadable items found")

    raise CobaltError("unexpected", f"Unexpected cobalt response: {status}")


def cobalt_error_to_message(code: str) -> str:
    messages = {
        "private": "🔒 این ویدیو خصوصیه و قابل دانلود نیست.",
        "age": "🔞 محتوای محدود سنی.",
        "geo": "🌍 این محتوا در منطقه شما در دسترس نیست.",
        "region": "🌍 این محتوا در منطقه شما در دسترس نیست.",
        "rate": "⏳ درخواست‌های زیادی ارسال شده. بعداً تلاش کن.",
        "timeout": "⏳ زمان پردازش تمام شد.",
        "unavailable": "❌ ویدیو یافت نشد.",
        "not_found": "❌ ویدیو یافت نشد.",
        "empty": "❌ محتوایی برای دانلود وجود ندارد.",
        "no_matching_format": "🚫 فرمت دانلود موجود نیست.",
        "unsupported": "🚫 این پلتفرم پشتیبانی نمی‌شود.",
        "post.no_video": "📝 این پست حاوی ویدیو نیست.",
    }
    return messages.get(code, f"خطا در دانلود: {code}")
