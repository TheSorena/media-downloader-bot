from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
from config import BOT_TOKEN, DOWNLOAD_DIR
from models import user as user_model
import locales.fa as fa
import os

router = Router()


@router.message(Command("setcookies"))
async def cmd_set_cookies(message: Message):
    user_id = message.from_user.id
    if not user_model.is_admin(user_id):
        await message.reply("🚫 فقط ادمین می‌تونه کوکی تنظیم کنه.")
        return

    await message.reply(
        "🍪 **تنظیم کوکی یوتیوب**\n\n"
        "فایل `cookies.txt` رو از مرورگرت export کن و اینجا بفرست.\n\n"
        "📋 **نحوه export:**\n"
        "1. اکستنشن **\"Get cookies.txt LOCALLY\"** رو نصب کن\n"
        "2. وارد یوتیوب شو\n"
        "3. اکستنشن رو باز کن → **Export**\n"
        "4. فایل رو اینجا بفرست\n\n"
        "⚠️ فقط ادمین می‌تونه کوکی تنظیم کنه.",
        parse_mode="Markdown",
    )


async def handle_cookie_upload(message: Message):
    user_id = message.from_user.id
    if not user_model.is_admin(user_id):
        return

    document = message.document
    if not document:
        return

    file_name = document.file_name or ""
    if not file_name.endswith(".txt") and not file_name.endswith(".cookies"):
        await message.reply("❌ فایل باید با پسوند `.txt` یا `.cookies` باشه.")
        return

    try:
        file = await message.bot.get_file(document.file_id)
        file_url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file.file_path}"

        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(file_url) as resp:
                if not resp.ok:
                    await message.reply("❌ خطا در دانلود فایل.")
                    return
                content = await resp.text()

        if "youtube.com" not in content and "google.com" not in content:
            await message.reply("❌ این فایل کوکی یوتیوب نیست.")
            return

        cookies_dir = os.path.join(os.getcwd(), "cookies")
        os.makedirs(cookies_dir, exist_ok=True)

        cookies_path = os.path.join(cookies_dir, "cookies.txt")
        with open(cookies_path, "w", encoding="utf-8") as f:
            f.write(content)

        cobalt_cookies = _convert_to_cobalt_format(content)
        cobalt_cookies_path = os.path.join(cookies_dir, "cobalt-cookies.json")
        import json
        with open(cobalt_cookies_path, "w", encoding="utf-8") as f:
            json.dump(cobalt_cookies, f, indent=2)

        lines = [l for l in content.split("\n") if l.strip() and not l.startswith("#")]
        await message.reply(
            f"✅ **کوکی با موفقیت ذخیره شد!**\n\n"
            f"📁 مسیر: `{cookies_path}`\n"
            f"📊 تعداد خطوط: {len(lines)}\n"
            f"🔧 cobalt cookies هم ساخته شد\n\n"
            f"از این به بعد یوتیوب با کوکی دانلود می‌شه.",
            parse_mode="Markdown",
        )
    except Exception as e:
        await message.reply(f"❌ خطا: {e}")


def _convert_to_cobalt_format(cookies_txt: str) -> dict:
    cookies = {}
    youtube_cookies = []

    for line in cookies_txt.split("\n"):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue

        parts = trimmed.split("\t")
        if len(parts) >= 7:
            domain = parts[0]
            name = parts[5]
            value = parts[6]

            if "youtube.com" in domain or "google.com" in domain:
                youtube_cookies.append(f"{name}={value}")

    if youtube_cookies:
        cookies["youtube"] = youtube_cookies

    return cookies
