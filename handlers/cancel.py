from aiogram import Router
from aiogram.types import CallbackQuery
import locales.fa as fa

router = Router()


async def handle_cancel(callback: CallbackQuery):
    await callback.answer()
    await callback.message.edit_text(fa.cancelled)


async def handle_download_cancel(callback: CallbackQuery):
    await callback.answer()
    from handlers.url_handler import pending_selections
    user_id = callback.from_user.id
    pending_selections.pop(user_id, None)
    await callback.message.edit_text(fa.cancel_active)
