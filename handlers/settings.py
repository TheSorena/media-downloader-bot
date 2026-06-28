from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from models import user as user_model
import locales.fa as fa
import keyboards.inline as kb

router = Router()


@router.message(Command("settings"))
async def cmd_settings(message: Message):
    user = user_model.get_user(message.from_user.id)
    if not user:
        return

    settings_data = user.get("settings", {"default_quality": "720p", "prefer_audio": False})
    quality = settings_data.get("default_quality", "720p")
    audio = "✅ فعال" if settings_data.get("prefer_audio") else "❌ غیرفعال"

    await message.reply(
        fa.settings.format(quality=quality, audio=audio),
        reply_markup=kb.settings_keyboard(settings_data),
    )


async def handle_settings_quality(callback: CallbackQuery, quality: str):
    await callback.answer()
    user_id = callback.from_user.id
    user_model.set_user_settings(user_id, default_quality=quality)
    await callback.message.edit_text(fa.settings_quality_changed.format(quality=quality))


async def handle_settings_audio_toggle(callback: CallbackQuery):
    await callback.answer()
    user_id = callback.from_user.id
    user = user_model.get_user(user_id)
    if not user:
        return

    current = user.get("settings", {}).get("prefer_audio", False)
    new_value = not current
    user_model.set_user_settings(user_id, prefer_audio=new_value)

    if new_value:
        await callback.message.edit_text(fa.settings_audio_toggled_enabled)
    else:
        await callback.message.edit_text(fa.settings_audio_toggled_disabled)


async def handle_menu_back(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(
        "منوی اصلی:",
        reply_markup=kb.main_menu_keyboard(),
    )


async def handle_menu_stats(callback: CallbackQuery):
    await callback.answer()
    from handlers.stats import cmd_stats
    await cmd_stats(callback.message)


async def handle_menu_settings(callback: CallbackQuery):
    await callback.answer()
    user = user_model.get_user(callback.from_user.id)
    if not user:
        return

    settings_data = user.get("settings", {"default_quality": "720p", "prefer_audio": False})
    quality = settings_data.get("default_quality", "720p")
    audio = "✅ فعال" if settings_data.get("prefer_audio") else "❌ غیرفعال"

    await callback.message.edit_text(
        fa.settings.format(quality=quality, audio=audio),
        reply_markup=kb.settings_keyboard(settings_data),
    )


async def handle_menu_premium(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(fa.premium, reply_markup=kb.premium_keyboard())


async def handle_menu_history(callback: CallbackQuery):
    await callback.answer()
    from models import download as download_model
    from utils.formatter import format_bytes
    from datetime import datetime

    downloads = download_model.get_user_downloads(callback.from_user.id, limit=10)
    history_list = []
    for dl in downloads:
        created = dl.get("created_at")
        if created and isinstance(created, datetime):
            date_str = created.strftime("%Y/%m/%d %H:%M")
        else:
            date_str = "نامشخص"
        history_list.append({
            "title": dl.get("title", "بدون عنوان"),
            "platform": dl.get("platform", "نامشخص"),
            "quality": dl.get("quality", ""),
            "file_size": format_bytes(dl.get("file_size", 0)),
            "created_at": date_str,
        })

    await callback.message.edit_text(
        fa.history(history_list),
        reply_markup=kb.back_to_menu_keyboard(),
    )


async def handle_menu_help(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(fa.help, reply_markup=kb.back_to_menu_keyboard())
