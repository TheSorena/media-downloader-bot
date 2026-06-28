from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
import locales.fa as fa

router = Router()


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.reply(fa.help)
