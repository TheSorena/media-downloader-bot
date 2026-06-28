from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message
from models import user as user_model
import locales.fa as fa
import keyboards.inline as kb

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    user_id = message.from_user.id
    user = user_model.get_user(user_id)
    if not user:
        user = user_model.create_user(
            user_id,
            message.from_user.first_name or "",
            message.from_user.last_name or "",
            message.from_user.username or "",
        )
    else:
        user_model.update_user_activity(
            user_id,
            message.from_user.first_name or "",
            message.from_user.last_name or "",
            message.from_user.username or "",
        )

    name = message.from_user.first_name or "کاربر"
    await message.reply(
        fa.start.format(name=name),
        reply_markup=kb.main_menu_keyboard(),
    )
