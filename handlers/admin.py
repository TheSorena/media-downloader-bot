from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from models import user as user_model
from models import download as download_model
from utils.formatter import format_bytes, get_day_key
import locales.fa as fa
import keyboards.inline as kb

router = Router()


@router.message(Command("admin"))
async def cmd_admin(message: Message):
    user_id = message.from_user.id
    if not user_model.is_admin(user_id):
        await message.reply("🚫 فقط ادمین می‌تونه از این دستور استفاده کنه.")
        return

    stats = user_model.get_usage_stats()
    today = download_model.get_today_stats(get_day_key())

    await message.reply(
        fa.admin_dashboard(
            stats.get("total_users", 0),
            stats.get("total_downloads", 0),
            today.get("count", 0),
            format_bytes(today.get("total_bytes", 0)),
        ),
        reply_markup=kb.admin_keyboard(),
    )


async def handle_admin_stats(callback: CallbackQuery):
    await callback.answer()
    if not user_model.is_admin(callback.from_user.id):
        return

    stats = user_model.get_usage_stats()
    today = download_model.get_today_stats(get_day_key())

    await callback.message.edit_text(
        fa.admin_dashboard(
            stats.get("total_users", 0),
            stats.get("total_downloads", 0),
            today.get("count", 0),
            format_bytes(today.get("total_bytes", 0)),
        ),
        reply_markup=kb.admin_keyboard(),
    )


async def handle_admin_users(callback: CallbackQuery):
    await callback.answer()
    if not user_model.is_admin(callback.from_user.id):
        return

    users = user_model.get_users_with_usernames()
    user_list = []
    for u in users[-10:]:
        user_list.append({
            "name": u.get("first_name", "نامشخص"),
            "username": u.get("username", ""),
            "is_premium": u.get("is_premium", False),
            "downloads": u.get("download_count", 0),
            "last_active": u.get("last_active_at", "نامشخص"),
        })

    await callback.message.edit_text(
        fa.admin_user_list(user_list),
        reply_markup=kb.admin_keyboard(),
    )


async def handle_admin_recent(callback: CallbackQuery):
    await callback.answer()
    if not user_model.is_admin(callback.from_user.id):
        return

    downloads = download_model.get_recent_downloads(20)
    from datetime import datetime

    dl_list = []
    for dl in downloads:
        created = dl.get("created_at")
        if created and isinstance(created, datetime):
            date_str = created.strftime("%Y/%m/%d %H:%M")
        else:
            date_str = "نامشخص"
        dl_list.append({
            "title": dl.get("title", "بدون عنوان"),
            "user": str(dl.get("telegram_id", "?")),
            "platform": dl.get("platform", "نامشخص"),
            "status": dl.get("status", "نامشخص"),
            "date": date_str,
        })

    msg = "📜 **۲۰ دانلود اخیر سیستم**\n\n"
    for i, dl in enumerate(dl_list):
        status_icon = "✅" if dl["status"] == "completed" else "❌" if dl["status"] == "failed" else "⏳"
        msg += f"{i+1}. {status_icon} {dl['title']}\n"
        msg += f"   👤 {dl['user']} | 📱 {dl['platform']} | 📅 {dl['date']}\n\n"

    await callback.message.edit_text(msg, reply_markup=kb.admin_keyboard())


async def handle_admin_broadcast(callback: CallbackQuery):
    await callback.answer()
    if not user_model.is_admin(callback.from_user.id):
        return

    await callback.message.edit_text(fa.broadcast_prompt)
