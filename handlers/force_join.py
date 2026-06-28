from aiogram import Router
from aiogram.types import CallbackQuery
from config import FORCE_JOIN_CHANNEL, FORCE_JOIN_LINK
from models import user as user_model

router = Router()


async def handle_force_join_check(callback: CallbackQuery):
    await callback.answer()
    user_id = callback.from_user.id

    if not FORCE_JOIN_CHANNEL:
        await callback.message.delete()
        return

    user = user_model.get_user(user_id)
    if user and user.get("is_premium"):
        await callback.message.delete()
        return

    try:
        member = await callback.bot.get_chat_member(FORCE_JOIN_CHANNEL, user_id)
        if member.status in ("member", "administrator", "creator"):
            await callback.message.edit_text("✅ عضویت تأیید شد! حالا لینک بفرست.")
        else:
            await callback.message.edit_text(
                "❌ هنوز عضو نشدی!\n\nابتدا در کانال عضو شو و دوباره دکمه رو بزن.",
            )
    except Exception:
        await callback.message.edit_text("✅ عضویت تأیید شد! حالا لینک بفرست.")
