from config import FREE_DAILY_QUOTA_MB, FREE_MAX_FILE_MB

quota_gb = FREE_DAILY_QUOTA_MB // 1024
max_file_gb = FREE_MAX_FILE_MB // 1024

start = (
    f"🎬 **سلام {{name}} عزیز!**\n\n"
    f"به ربات مدیا دانلودر خوش اومدی!\n\n"
    f"یه لینک از یوتیوب، اینستاگرام، تیک\u200cتاک، X و... بفرست تا برات دانلود کنم.\n\n"
    f"📋 **قابلیت\u200cها:**\n"
    f"• دانلود ویدیو با کیفیت\u200cهای مختلف\n"
    f"• استخراج صدا به صورت MP3\n"
    f"• پشتیبانی از ۸+ پلتفرم\n"
    f"• پشتیبانی از فایل\u200cهای تا {max_file_gb} گیگابایت\n\n"
    f"🎁 **کاربر رایگان:**\n"
    f"• سهمیه روزانه: {quota_gb} گیگابایت\n"
    f"• حداکثر حجم هر فایل: {max_file_gb} گیگابایت\n\n"
    f"💎 **کاربر پرمیوم:**\n"
    f"• سهمیه نامحدود\n"
    f"• دانلود گروهی (پلی\u200cلیست)\n"
    f"• اولویت در صف دانلود\n\n"
    f"⬇️ لینک مورد نظرت رو بفرست!"
)

help = (
    "❓ **راهنمای استفاده**\n\n"
    "**۱. دانلود ویدیو:**\n"
    "لینک ویدیو (یوتیوب، اینستاگرام، تیک\u200cتاک و...) رو بفرست.\n\n"
    "**۲. استخراج صدا:**\n"
    "بعد از ارسال لینک، دکمه «فقط صدا (MP3)» رو بزن.\n\n"
    "**۳. دستورات:**\n"
    "• /start - شروع\n"
    "• /help - راهنما\n"
    "• /stats - آمار و سهمیه\n"
    "• /settings - تنظیمات\n"
    "• /history - تاریخچه دانلودها\n"
    "• /cancel - لغو دانلود فعال\n"
    "• /premium - خرید اشتراک\n\n"
    f"**۴. محدودیت کاربر رایگان:**\n"
    f"• {quota_gb} گیگابایت در روز\n"
    f"• نهایتاً {max_file_gb} گیگابایت هر فایل\n\n"
    "برای استفاده نامحدود، /premium رو بزن."
)

stats = (
    "📊 **آمار شما**\n\n"
    "📊 وضعیت: {status}\n\n"
    "📥 کل دانلودها: {count}\n\n"
    "📅 **سهمیه امروز:**\n"
    "💾 استفاده\u200cشده: {used} / {total}\n"
    "✅ باقی\u200cمانده: {remaining}"
)

premium = (
    "💎 **اشتراک پرمیوم**\n\n"
    "با خرید اشتراک پرمیوم از مزایای زیر بهره\u200cمند بشو:\n\n"
    "✅ سهمیه روزانه نامحدود\n"
    "✅ اولویت در صف دانلود\n"
    "✅ پشتیبانی از پلی\u200cلیست\n"
    "✅ دانلود گروهی\n\n"
    "💰 **پلن\u200cها:**\n"
    "• ماهانه: ۵۰,۰۰۰ تومان\n"
    "• سه\u200cماهه: ۱۲۰,۰۰۰ تومان (۲۰٪ تخفیف)\n"
    "• سالانه: ۴۰۰,۰۰۰ تومان (۳۳٪ تخفیف)\n\n"
    "یکی از گزینه\u200cهای زیر رو انتخاب کن:"
)

settings = (
    "⚙️ **تنظیمات شما**\n\n"
    "🎬 کیفیت پیش\u200cفرض: **{quality}**\n"
    "🎵 فقط صدا: {audio}\n\n"
    "تغییر مورد نظر رو انتخاب کن:"
)

settings_quality_changed = "✅ کیفیت پیش\u200cفرض به **{quality}** تغییر کرد."

settings_audio_toggled_enabled = "✅ حالت فقط صدا **فعال** شد. از این به بعد به صورت خودکار صدا استخراج می\u200cشه."
settings_audio_toggled_disabled = "❌ حالت فقط صدا **غیرفعال** شد."

waiting_for_info = "⏳ در حال دریافت اطلاعات ویدیو..."


def choose_quality(title, uploader, duration, view_count=0, like_count=0, description=""):
    msg = f"🎬 **{title}**\n"
    if uploader:
        msg += f"👤 {uploader}\n"
    if duration:
        msg += f"⏱ مدت: {duration}\n"
    if view_count and view_count > 0:
        msg += f"👁 بازدید: {view_count:,}\n"
    if like_count and like_count > 0:
        msg += f"❤️ لایک: {like_count:,}\n"
    if description:
        desc = description[:150] + ("..." if len(description) > 150 else "")
        msg += f"\n📝 {desc}\n"
    msg += "\nکیفیت مورد نظر رو انتخاب کن:"
    return msg


download_started = "⬇️ دانلود شروع شد..."


def download_progress(percent, speed, eta, downloaded=None):
    filled = round(percent / 10)
    empty = 10 - filled
    bar = "▓" * filled + "░" * empty
    msg = f"⬇️ **دانلود در حال انجام...**\n\n"
    msg += f"📊 {bar} {percent:.0f}%\n"
    msg += f"⚡ سرعت: {speed}\n"
    msg += f"⏱ زمان باقی\u200cمانده: {eta}"
    if downloaded:
        msg += f"\n💾 حجم دانلود شده: {downloaded}"
    return msg


upload_started = "⬆️ در حال آپلود به تلگرام..."


def success(title, size, uploader=None, platform=None, quality=None):
    msg = "✅ **دانلود کامل شد!**\n\n"
    if platform in ("SoundCloud", "YouTube"):
        msg += f"🎵 {title}\n"
    else:
        msg += f"🎬 {title}\n"
    if uploader:
        msg += f"👤 {uploader}\n"
    if quality:
        msg += f"📐 کیفیت: {quality}\n"
    msg += f"💾 حجم: {size}"
    return msg


error = "❌ **خطا:** {msg}"

quota_exceeded = (
    "⚠️ **سهمیه روزانه تمام شد!**\n\n"
    "💾 استفاده\u200cشده: {used} / {limit}\n\n"
    "برای استفاده نامحدود اشتراک پرمیوم بخر:\n/premium"
)

file_too_large = (
    "⚠️ **حجم فایل بیشتر از حد مجاز است!**\n\n"
    "📎 حجم فایل: {size}\n"
    "📏 حداکثر مجاز: {limit}\n\n"
    "برای دانلود فایل\u200cهای بزرگ\u200cتر اشتراک پرمیوم بخر:\n/premium"
)

unsupported_url = "❌ این لینک پشتیبانی نمی\u200cشه. لطفاً لینک معتبر بفرست."

processing = "⏳ در حال پردازش..."

cancelled = "❌ عملیات لغو شد."

banned = "🚫 شما از استفاده از این ربات مسدود شده\u200cاید."

already_downloading = "⏳ شما یک دانلود در حال انجام دارید. لطفاً صبر کنید."

playlist_not_supported = "⚠️ دانلود پلی\u200cلیست فقط برای کاربران پرمیوم در دسترس است."


def cobalt_detected(platform):
    return (
        f"🔗 لینک **{platform}** شناسایی شد.\n\n"
        f"کیفیت مورد نظر رو انتخاب کن:"
    )


def history(downloads):
    if not downloads:
        return "📜 **تاریخچه دانلودها**\n\nهنوز هیچ دانلودی نداشتی!\n\nیه لینک بفرست تا شروع کنی"
    msg = "📜 **تاریخچه ۱۰ دانلود اخیر**\n\n"
    for i, dl in enumerate(downloads):
        msg += f"{i+1}. 🎬 {dl['title']}\n"
        msg += f"   📱 {dl['platform']} | 📐 {dl['quality']} | 💾 {dl['file_size']}\n"
        msg += f"   📅 {dl['created_at']}\n\n"
    return msg


cancel_active = "🛑 دانلود فعال لغو شد."

no_active_download = "ℹ️ هیچ دانلود فعالی نداری."


def admin_dashboard(total_users, total_downloads, today_downloads, today_traffic):
    return (
        f"🔧 **پنل ادمین**\n\n"
        f"👥 کل کاربران: {total_users}\n"
        f"📥 کل دانلودها: {total_downloads}\n"
        f"📅 دانلودهای امروز: {today_downloads}\n"
        f"💾 ترافیک امروز: {today_traffic}\n\n"
        f"یکی از گزینه\u200cها رو انتخاب کن:"
    )


def admin_user_list(users):
    msg = "👥 **آخرین کاربران فعال**\n\n"
    for i, u in enumerate(users):
        icon = "💎" if u.get("is_premium") else "🎁"
        msg += f"{i+1}. {icon} {u['name']}"
        if u.get("username"):
            msg += f" (@{u['username']})"
        msg += f"\n   📥 {u['downloads']} دانلود | 📅 {u['last_active']}\n\n"
    return msg


broadcast_prompt = "📝 پیام مورد نظر برای ارسال به همه کاربران رو بفرست:\n\n(برای لغو /cancel بزن)"

broadcast_success = "✅ پیام به {count} کاربر ارسال شد."

broadcast_cancelled = "❌ ارسال پیام لغو شد."


def broadcast_confirm(text, count):
    return (
        f"📢 **تأیید ارسال پیام**\n\n"
        f"📝 متن پیام:\n{text}\n\n"
        f"👥 تعداد دریافت\u200cکنندگان: {count}\n\n"
        f"آیا مطمئنی؟"
    )


def force_join_required(channel_name):
    return (
        f"📢 برای استفاده از ربات، ابتدا باید عضو کانال **{channel_name}** بشی.\n\n"
        f"عضو شدی؟ دکمه زیر رو بزن:"
    )


def payment_success(plan, amount):
    return (
        f"✅ **پرداخت موفق!**\n\n"
        f"💎 اشتراک {plan} فعال شد.\n"
        f"💰 مبلغ پرداختی: {amount} تومان\n\n"
        f"از این به بعد از مزایای پرمیوم بهره\u200cمند می\u200cشوی!"
    )


payment_failed = "❌ **پرداخت ناموفق!**\n\nلطفاً دوباره تلاش کن."


def referral(code, referral_count, bonus_mb):
    return (
        f"🎁 **سیستم دعوت**\n\n"
        f"لینک دعوت اختصاصی تو:\n"
        f"t.me/{code}\n\n"
        f"👥 تعداد دعوت\u200cشده\u200cها: {referral_count}\n"
        f"💾 سهمیه دریافتی: {bonus_mb} مگابایت\n\n"
        f"به ازای هر نفر که با لینک تو عضو بشه، ۵۰۰ مگابایت سهمیه اضافی می\u200cگیری!"
    )


def referral_welcome(referrer_name):
    return (
        f"🎉 با موفقیت عضو شدی!\n\n"
        f"{referrer_name} تو رو به ربات دعوت کرده.\n"
        f"🎁 **۵۰۰ مگابایت سهمیه اضافی** به عنوان هدیه دریافت کردی!"
    )


def user_settings(quality, audio):
    return f"🎬 **{quality}** | 🎵 فقط صدا: {'✅' if audio else '❌'}"


cancel_keyboard_label = "❌ لغو"
back_keyboard_label = "🔙 بازگشت"
