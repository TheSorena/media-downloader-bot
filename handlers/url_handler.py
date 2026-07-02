from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, FSInputFile
from config import DOWNLOAD_DIR
from models import user as user_model
from models import download as download_model
from core.cobalt import cobalt_request_url, CobaltError
from core.downloader import (
    download_via_cobalt, probe_video, generate_thumbnail,
    cleanup_file, cleanup_thumbnail,
)
from core.piped import download_youtube as piped_download, PipedError
from core.ytdl import download_youtube as ytdlp_download, YtdlError
from utils.formatter import format_bytes, format_duration, get_day_key, check_quota
from utils.rate_limiter import rate_limiter
from utils.cleanup import cleanup_temp_directory
import keyboards.inline as kb
import locales.fa as fa
import os

router = Router()


async def handle_url(message: Message):
    text = message.text
    if not text:
        return

    from config import extract_url, detect_platform
    url = extract_url(text)
    if not url:
        await message.reply(fa.unsupported_url)
        return

    user_id = message.from_user.id
    user = user_model.get_user(user_id)
    if not user:
        user = user_model.create_user(
            user_id,
            message.from_user.first_name or "",
            message.from_user.last_name or "",
            message.from_user.username or "",
        )

    if user.get("is_banned"):
        await message.reply(fa.banned)
        return

    if not rate_limiter.is_allowed(user_id):
        wait = rate_limiter.seconds_until_allowed(user_id)
        await message.reply(f"⏳ لطفاً {wait} ثانیه صبر کنید.")
        return

    from config import FORCE_JOIN_CHANNEL, FORCE_JOIN_LINK
    if FORCE_JOIN_CHANNEL:
        try:
            member = await message.bot.get_chat_member(FORCE_JOIN_CHANNEL, user_id)
            if member.status not in ("member", "administrator", "creator"):
                if not user.get("is_premium"):
                    await message.reply(
                        fa.force_join_required(FORCE_JOIN_CHANNEL),
                        reply_markup=kb.force_join_keyboard(FORCE_JOIN_CHANNEL, FORCE_JOIN_LINK),
                    )
                    return
        except Exception:
            pass

    platform = detect_platform(url)
    if not platform:
        await message.reply(fa.unsupported_url)
        return

    status_msg = await message.reply(fa.waiting_for_info)

    qualities = ["1080p", "720p", "480p", "360p"]

    if user.get("settings", {}).get("prefer_audio"):
        await _start_download(message, user, url, platform, status_msg, "audio")
        return

    from config import PLATFORM_IDENTIFIERS
    non_yt_cobalt = ["TikTok", "X/Twitter", "Pinterest", "Reddit", "Facebook", "Vimeo"]
    is_youtube = platform == "YouTube"

    if is_youtube:
        pending_selections[user_id] = {
            "url": url,
            "platform": platform,
            "title": "دانلود از یوتیوب",
            "qualities": qualities,
        }
        await status_msg.edit_text(
            f"🔗 **{platform}** شناسایی شد.\n\nکیفیت مورد نظر رو انتخاب کن:",
            reply_markup=kb.quality_keyboard(qualities),
        )
        return

    if platform in non_yt_cobalt:
        pending_selections[user_id] = {
            "url": url,
            "platform": platform,
            "title": f"دانلود از {platform}",
            "qualities": qualities,
        }
        await status_msg.edit_text(
            fa.cobalt_detected(platform),
            reply_markup=kb.quality_keyboard(qualities),
        )
        return

    pending_selections[user_id] = {
        "url": url,
        "platform": platform,
        "title": f"دانلود از {platform}",
        "qualities": qualities,
    }
    await status_msg.edit_text(
        fa.cobalt_detected(platform),
        reply_markup=kb.quality_keyboard(qualities),
    )


pending_selections: dict[int, dict] = {}


async def handle_quality_selection(callback: CallbackQuery):
    await callback.answer()
    user_id = callback.from_user.id
    data = callback.data

    if data == "cancel":
        pending_selections.pop(user_id, None)
        await callback.message.edit_text(fa.cancelled)
        return

    if not data.startswith("dl:"):
        return

    quality = data[3:]
    pending = pending_selections.pop(user_id, None)
    if not pending:
        await callback.message.edit_text("⏱ زمان انتخاب کیفیت تمام شد. لطفاً دوباره لینک رو بفرست.")
        return

    user = user_model.get_user(user_id)
    if not user:
        return

    await _start_download(callback.message, user, pending["url"], pending["platform"], callback.message, quality)


async def _start_download(message: Message, user: dict, url: str, platform: str, status_msg: Message, quality: str):
    user_id = user["telegram_id"]
    audio_only = quality == "audio"
    actual_quality = "audio" if audio_only else quality
    is_youtube = platform == "YouTube"

    download_doc = download_model.create_download(user_id, url, platform, quality=actual_quality)
    download_model.update_download_status(
        download_doc["_id"], "downloading",
        started_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )

    try:
        await status_msg.edit_text("⬇️ در حال دانلود...")

        if is_youtube:
            try:
                result = await piped_download(url, actual_quality, audio_only)
            except (PipedError, Exception):
                try:
                    result = await ytdlp_download(url, actual_quality, audio_only)
                except YtdlError:
                    result = await download_via_cobalt(url, actual_quality if not audio_only else "720", audio_only)
        else:
            result = await download_via_cobalt(url, actual_quality if not audio_only else "720", audio_only)

        if not result:
            raise Exception("دانلود ناموفق بود.")

        filepath, filename = result
        file_size = os.path.getsize(filepath)

        quota_check = check_quota(user, file_size)
        if not quota_check["ok"]:
            cleanup_file(filepath)
            await status_msg.edit_text(quota_check["message"])
            return

        await status_msg.edit_text(fa.upload_started)
        download_model.update_download_status(download_doc["_id"], "uploading")

        probe_data = probe_video(filepath)
        thumb_path = generate_thumbnail(filepath)

        caption = fa.success(
            platform,
            format_bytes(file_size),
            user.get("first_name", ""),
            platform,
            actual_quality,
        )

        try:
            if audio_only:
                sent_msg = await message.answer_audio(
                    audio=FSInputFile(filepath),
                    caption=caption,
                    parse_mode="Markdown",
                    title=platform,
                )
            else:
                sent_msg = await message.answer_video(
                    video=FSInputFile(filepath),
                    caption=caption,
                    parse_mode="Markdown",
                    supports_streaming=True,
                    width=probe_data.get("width"),
                    height=probe_data.get("height"),
                    duration=probe_data.get("duration"),
                    thumbnail=FSInputFile(thumb_path) if thumb_path else None,
                )
        except Exception as send_error:
            if "file is too big" in str(send_error).lower() or "request EntityTooLarge" in str(send_error):
                await status_msg.edit_text(
                    fa.error.format(msg="حجم فایل بیشتر از حد مجاز تلگرام است. اشتراک پرمیوم بخرید.")
                )
                cleanup_file(filepath)
                cleanup_thumbnail(thumb_path)
                return
            raise

        await status_msg.delete()
        cleanup_file(filepath)
        cleanup_thumbnail(thumb_path)
        cleanup_temp_directory()

        day_key = get_day_key()
        user_model.add_quota_usage(user_id, day_key, file_size)
        download_model.update_download_status(
            download_doc["_id"], "completed",
            file_size=file_size,
            format="mp3" if audio_only else "mp4",
            completed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        )

    except YtdlError as e:
        await status_msg.edit_text(fa.error.format(msg=e.message))
        download_model.update_download_status(download_doc["_id"], "failed", error_message=str(e))
    except CobaltError as e:
        error_msg = cobalt_error_to_message_simple(e.code)
        await status_msg.edit_text(fa.error.format(msg=error_msg))
        download_model.update_download_status(download_doc["_id"], "failed", error_message=str(e))
    except Exception as e:
        error_msg = str(e)
        if "timeout" in error_msg.lower():
            error_msg = "زمان پردازش تمام شد."
        elif "private" in error_msg.lower():
            error_msg = "این ویدیو خصوصیه."
        await status_msg.edit_text(fa.error.format(msg=error_msg))
        download_model.update_download_status(download_doc["_id"], "failed", error_message=str(e))


def cobalt_error_to_message_simple(code: str) -> str:
    messages = {
        "private": "🔒 این ویدیو خصوصیه.",
        "age": "🔞 محتوای محدود سنی.",
        "geo": "🌍 این محتوا در منطقه شما در دسترس نیست.",
        "region": "🌍 این محتوا در منطقه شما در دسترس نیست.",
        "rate": "⏳ درخواست‌های زیادی ارسال شده.",
        "timeout": "⏳ زمان پردازش تمام شد.",
        "unavailable": "❌ ویدیو یافت نشد.",
        "not_found": "❌ ویدیو یافت نشد.",
        "empty": "❌ محتوایی برای دانلود وجود ندارد.",
        "no_matching_format": "🚫 فرمت دانلود موجود نیست.",
        "unsupported": "🚫 این پلتفرم پشتیبانی نمی‌شود.",
        "error.api.youtube.login": "🔑 یوتیوب نیاز به ورود دارد. لطفاً فایل cookies آپلود کنید.",
        "error.api.youtube.login_required": "🔑 یوتیوب نیاز به ورود دارد. لطفاً فایل cookies آپلود کنید.",
    }
    return messages.get(code, f"خطا در دانلود: {code}")
