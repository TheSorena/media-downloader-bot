from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from models import user as user_model
from utils.formatter import format_bytes, get_day_key
from config import FREE_DAILY_QUOTA_MB
import locales.fa as fa

router = Router()


@router.message(Command("stats"))
async def cmd_stats(message: Message):
    user_id = message.from_user.id
    user = user_model.get_user(user_id)
    if not user:
        return

    day_key = get_day_key()
    user_model.reset_quota_if_needed(user_id, day_key)
    user = user_model.get_user(user_id)

    used = user.get("quota", {}).get("bytes_used", 0)
    limit = FREE_DAILY_QUOTA_MB * 1024 * 1024
    remaining = max(0, limit - used)
    count = user.get("download_count", 0)
    is_premium = user.get("is_premium", False)
    status = "💎 پرمیوم" if is_premium else "🎁 رایگان"

    await message.reply(
        fa.stats.format(
            status=status,
            count=count,
            used=format_bytes(used),
            total=format_bytes(limit),
            remaining=format_bytes(remaining),
        )
    )
