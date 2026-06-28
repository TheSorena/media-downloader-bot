from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


def quality_keyboard(qualities: list[str]) -> InlineKeyboardMarkup:
    kb = []
    row = []
    priority = ["1080p", "720p", "480p", "360p"]
    sorted_q = list(dict.fromkeys(qualities + priority))
    sorted_q = [q for q in sorted_q if q in qualities or q in priority]

    for q in sorted_q[:4]:
        row.append(InlineKeyboardButton(text=f"🎬 {q}", callback_data=f"dl:{q}"))
    kb.append(row)
    kb.append([InlineKeyboardButton(text="🎵 فقط صدا (MP3)", callback_data="dl:audio")])
    kb.append([InlineKeyboardButton(text="❌ لغو", callback_data="cancel")])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def cancel_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="❌ لغو", callback_data="cancel")]
    ])


def progress_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🛑 لغو دانلود", callback_data="download:cancel")]
    ])


def main_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 آمار من", callback_data="menu:stats"),
            InlineKeyboardButton(text="⚙️ تنظیمات", callback_data="menu:settings"),
        ],
        [
            InlineKeyboardButton(text="💎 اشتراک پرمیوم", callback_data="menu:premium"),
            InlineKeyboardButton(text="📜 تاریخچه", callback_data="menu:history"),
        ],
        [
            InlineKeyboardButton(text="❓ راهنما", callback_data="menu:help"),
        ],
    ])


def premium_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💎 ماهانه - ۵۰,۰۰۰ تومان", callback_data="pay:month")],
        [InlineKeyboardButton(text="💎 سه‌ماهه - ۱۲۰,۰۰۰ تومان", callback_data="pay:3months")],
        [InlineKeyboardButton(text="💎 سالانه - ۴۰۰,۰۰۰ تومان", callback_data="pay:year")],
        [InlineKeyboardButton(text="❌ بازگشت", callback_data="menu:back")],
    ])


def settings_keyboard(user_settings: dict) -> InlineKeyboardMarkup:
    qualities = ["1080p", "720p", "480p", "360p"]
    kb = []
    row = []
    for q in qualities:
        prefix = "✓ " if q == user_settings.get("default_quality") else ""
        row.append(InlineKeyboardButton(text=f"{prefix}{q}", callback_data=f"set:quality:{q}"))
    kb.append(row)
    audio_prefix = "✓ " if user_settings.get("prefer_audio") else ""
    kb.append([InlineKeyboardButton(text=f"{audio_prefix}🎵 فقط صدا", callback_data="set:audio:toggle")])
    kb.append([InlineKeyboardButton(text="🔙 بازگشت", callback_data="menu:back")])
    return InlineKeyboardMarkup(inline_keyboard=kb)


def admin_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 آمار کلی", callback_data="admin:stats"),
            InlineKeyboardButton(text="👥 کاربران", callback_data="admin:users"),
        ],
        [
            InlineKeyboardButton(text="📢 ارسال پیام", callback_data="admin:broadcast"),
            InlineKeyboardButton(text="📜 دانلودهای اخیر", callback_data="admin:recent"),
        ],
        [InlineKeyboardButton(text="🔙 بازگشت", callback_data="menu:back")],
    ])


def force_join_keyboard(channel_username: str, channel_link: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📢 عضویت در کانال", url=channel_link)],
        [InlineKeyboardButton(text="✅ عضو شدم", callback_data="forcejoin:check")],
    ])


def back_to_menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔙 بازگشت به منو", callback_data="menu:back")]
    ])
