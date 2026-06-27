import { config } from '../config/index.js';

const quotaGB = (config.limits.freeDailyQuotaMB / 1024).toFixed(0);
const maxFileGB = (config.limits.freeMaxFileMB / 1024).toFixed(0);

export const fa = {
  start: (name: string) =>
    `🎬 **سلام ${name} عزیز!**\n\n` +
    `به ربات مدیا دانلودر خوش اومدی! 🎉\n\n` +
    `یه لینک از یوتیوب، اینستاگرام، تیک‌تاک، X و... بفرست تا برات دانلود کنم.\n\n` +
    `📋 **قابلیت‌ها:**\n` +
    `• دانلود ویدیو با کیفیت‌های مختلف\n` +
    `• استخراج صدا به صورت MP3\n` +
    `• پشتیبانی از ۸+ پلتفرم\n` +
    `• پشتیبانی از فایل‌های تا ${maxFileGB} گیگابایت\n\n` +
    `🎁 **کاربر رایگان:**\n` +
    `• سهمیه روزانه: ${quotaGB} گیگابایت\n` +
    `• حداکثر حجم هر فایل: ${maxFileGB} گیگابایت\n\n` +
    `💎 **کاربر پرمیوم:**\n` +
    `• سهمیه نامحدود\n` +
    `• دانلود گروهی (پلی‌لیست)\n` +
    `• اولویت در صف دانلود\n\n` +
    `⬇️ لینک مورد نظرت رو بفرست! 👇`,

  help:
    `❓ **راهنمای استفاده**\n\n` +
    `**۱. دانلود ویدیو:**\n` +
    `لینک ویدیو (یوتیوب، اینستاگرام، تیک‌تاک و...) رو بفرست. بعد ازت می‌پرسم چه کیفیتی می‌خوای.\n\n` +
    `**۲. استخراج صدا:**\n` +
    `بعد از ارسال لینک، دکمه «فقط صدا (MP3)» رو بزن.\n\n` +
    `**۳. دستورات:**\n` +
    `• /start - شروع\n` +
    `• /help - راهنما\n` +
    `• /stats - آمار و سهمیه\n` +
    `• /settings - تنظیمات\n` +
    `• /history - تاریخچه دانلودها\n` +
    `• /cancel - لغو دانلود فعال\n` +
    `• /premium - خرید اشتراک\n\n` +
    `**۴. محدودیت کاربر رایگان:**\n` +
    `• ${quotaGB} گیگابایت در روز\n` +
    `• نهایتاً ${maxFileGB} گیگابایت هر فایل\n\n` +
    `برای استفاده نامحدود، /premium رو بزن.`,

  stats: (used: string, total: string, count: number, remaining: string, status: string) =>
    `📊 **آمار شما**\n\n` +
    `📊 وضعیت: ${status}\n\n` +
    `📥 کل دانلودها: ${count}\n\n` +
    `📅 **سهمیه امروز:**\n` +
    `💾 استفاده‌شده: ${used} / ${total}\n` +
    `✅ باقی‌مانده: ${remaining}`,

  premium:
    `💎 **اشتراک پرمیوم**\n\n` +
    `با خرید اشتراک پرمیوم از مزایای زیر بهره‌مند بشو:\n\n` +
    `✅ سهمیه روزانه نامحدود\n` +
    `✅ اولویت در صف دانلود\n` +
    `✅ پشتیبانی از پلی‌لیست\n` +
    `✅ دانلود گروهی\n\n` +
    `💰 **پلن‌ها:**\n` +
    `• ماهانه: ۵۰,۰۰۰ تومان\n` +
    `• سه‌ماهه: ۱۲۰,۰۰۰ تومان (۲۰٪ تخفیف)\n` +
    `• سالانه: ۴۰۰,۰۰۰ تومان (۳۳٪ تخفیف)\n\n` +
    `یکی از گزینه‌های زیر رو انتخاب کن:`,

  settings: (defaultQuality: string, preferAudio: boolean) =>
    `⚙️ **تنظیمات شما**\n\n` +
    `🎬 کیفیت پیش‌فرض: **${defaultQuality}**\n` +
    `🎵 فقط صدا: ${preferAudio ? '✅ فعال' : '❌ غیرفعال'}\n\n` +
    `تغییر مورد نظر رو انتخاب کن:`,

  settingsQualityChanged: (quality: string) =>
    `✅ کیفیت پیش‌فرض به **${quality}** تغییر کرد.`,

  settingsAudioToggled: (enabled: boolean) =>
    enabled
      ? '✅ حالت فقط صدا **فعال** شد. از این به بعد به صورت خودکار صدا استخراج می‌شه.'
      : '❌ حالت فقط صدا **غیرفعال** شد.',

  waitingForInfo: '⏳ در حال دریافت اطلاعات ویدیو...',

  chooseQuality: (title: string, uploader: string, duration: string, viewCount?: number, likeCount?: number, description?: string) => {
    let msg = `🎬 **${title}**\n`;
    if (uploader) msg += `👤 ${uploader}\n`;
    if (duration) msg += `⏱ مدت: ${duration}\n`;
    if (viewCount && viewCount > 0) msg += `👁 بازدید: ${viewCount.toLocaleString('fa-IR')}\n`;
    if (likeCount && likeCount > 0) msg += `❤️ لایک: ${likeCount.toLocaleString('fa-IR')}\n`;
    if (description) msg += `\n📝 ${description.slice(0, 150)}${description.length > 150 ? '...' : ''}\n`;
    msg += `\nکیفیت مورد نظر رو انتخاب کن:`;
    return msg;
  },

  downloadStarted: '⬇️ دانلود شروع شد...',

  downloadProgress: (percent: number, speed: string, eta: string, downloaded?: string) => {
    const filled = Math.round(percent / 10);
    const empty = 10 - filled;
    const bar = '▓'.repeat(filled) + '░'.repeat(empty);
    let msg = `⬇️ **دانلود در حال انجام...**\n\n`;
    msg += `📊 ${bar} ${percent.toFixed(0)}%\n`;
    msg += `⚡ سرعت: ${speed}\n`;
    msg += `⏱ زمان باقی‌مانده: ${eta}`;
    if (downloaded) msg += `\n💾 حجم دانلود شده: ${downloaded}`;
    return msg;
  },

  uploadStarted: '⬆️ در حال آپلود به تلگرام...',

  success: (title: string, size: string, uploader?: string, platform?: string, quality?: string) => {
    let msg = `✅ **دانلود کامل شد!**\n\n`;
    if (platform === 'SoundCloud' || platform === 'YouTube') {
      msg += `🎵 ${title}\n`;
    } else {
      msg += `🎬 ${title}\n`;
    }
    if (uploader) msg += `👤 ${uploader}\n`;
    if (quality) msg += `📐 کیفیت: ${quality}\n`;
    msg += `💾 حجم: ${size}`;
    return msg;
  },

  error: (msg: string) => `❌ **خطا:** ${msg}`,

  quotaExceeded: (used: string, limit: string) =>
    `⚠️ **سهمیه روزانه تمام شد!**\n\n` +
    `💾 استفاده‌شده: ${used} / ${limit}\n\n` +
    `برای استفاده نامحدود اشتراک پرمیوم بخر:\n/premium`,

  fileTooLarge: (size: string, limit: string) =>
    `⚠️ **حجم فایل بیشتر از حد مجاز است!**\n\n` +
    `📎 حجم فایل: ${size}\n` +
    `📏 حداکثر مجاز: ${limit}\n\n` +
    `برای دانلود فایل‌های بزرگ‌تر اشتراک پرمیوم بخر:\n/premium`,

  unsupportedUrl: '❌ این لینک پشتیبانی نمی‌شه. لطفاً لینک معتبر بفرست.',

  processing: '⏳ در حال پردازش...',

  cancelled: '❌ عملیات لغو شد.',

  banned: '🚫 شما از استفاده از این ربات مسدود شده‌اید.',

  alreadyDownloading: '⏳ شما یک دانلود در حال انجام دارید. لطفاً صبر کنید.',

  playlistNotSupported: '⚠️ دانلود پلی‌لیست فقط برای کاربران پرمیوم در دسترس است.',

  cobaltDetected: (platform: string) =>
    `🔗 لینک **${platform}** شناسایی شد.\n\nکیفیت مورد نظر رو انتخاب کن:`,

  history: (downloads: Array<{ title: string; platform: string; createdAt: string; fileSize: string; quality: string }>) => {
    if (downloads.length === 0) {
      return '📜 **تاریخچه دانلودها**\n\nهنوز هیچ دانلودی نداشتی!\n\nیه لینک بفرست تا شروع کنی 👇';
    }
    let msg = '📜 **تاریخچه ۱۰ دانلود اخیر**\n\n';
    downloads.forEach((dl, i) => {
      msg += `${i + 1}. 🎬 ${dl.title}\n`;
      msg += `   📱 ${dl.platform} | 📐 ${dl.quality} | 💾 ${dl.fileSize}\n`;
      msg += `   📅 ${dl.createdAt}\n\n`;
    });
    return msg;
  },

  cancelActive: '🛑 دانلود فعال لغو شد.',

  noActiveDownload: 'ℹ️ هیچ دانلود فعالی نداری.',

  adminDashboard: (totalUsers: number, totalDownloads: number, todayDownloads: number, todayTraffic: string) =>
    `🔧 **پنل ادمین**\n\n` +
    `👥 کل کاربران: ${totalUsers}\n` +
    `📥 کل دانلودها: ${totalDownloads}\n` +
    `📅 دانلودهای امروز: ${todayDownloads}\n` +
    `💾 ترافیک امروز: ${todayTraffic}\n\n` +
    `یکی از گزینه‌ها رو انتخاب کن:`,

  adminUserList: (users: Array<{ name: string; username: string; isPremium: boolean; downloads: number; lastActive: string }>) => {
    let msg = '👥 **آخرین کاربران فعال**\n\n';
    users.forEach((u, i) => {
      msg += `${i + 1}. ${u.isPremium ? '💎' : '🎁'} ${u.name}`;
      if (u.username) msg += ` (@${u.username})`;
      msg += `\n   📥 ${u.downloads} دانلود | 📅 ${u.lastActive}\n\n`;
    });
    return msg;
  },

  adminRecentDownloads: (downloads: Array<{ title: string; user: string; platform: string; status: string; date: string }>) => {
    let msg = '📜 **۲۰ دانلود اخیر سیستم**\n\n';
    downloads.forEach((dl, i) => {
      const statusIcon = dl.status === 'completed' ? '✅' : dl.status === 'failed' ? '❌' : '⏳';
      msg += `${i + 1}. ${statusIcon} ${dl.title}\n`;
      msg += `   👤 ${dl.user} | 📱 ${dl.platform} | 📅 ${dl.date}\n\n`;
    });
    return msg;
  },

  broadcastPrompt: '📝 پیام مورد نظر برای ارسال به همه کاربران رو بفرست:\n\n(برای لغو /cancel بزن)',

  broadcastSuccess: (count: number) => `✅ پیام به ${count} کاربر ارسال شد.`,

  broadcastCancelled: '❌ ارسال پیام لغو شد.',

  broadcastConfirm: (text: string, count: number) =>
    `📢 **تأیید ارسال پیام**\n\n` +
    `📝 متن پیام:\n${text}\n\n` +
    `👥 تعداد دریافت‌کنندangers: ${count}\n\n` +
    `آیا مطمئنی؟`,

  forceJoinRequired: (channelName: string) =>
    `📢 برای استفاده از ربات، ابتدا باید عضو کانال **${channelName}** بشی.\n\n` +
    `عضو شدی؟ دکمه زیر رو بزن:`,

  paymentSuccess: (plan: string, amount: string) =>
    `✅ **پرداخت موفق!**\n\n` +
    `💎 اشتراک ${plan} فعال شد.\n` +
    `💰 مبلغ پرداختی: ${amount} تومان\n\n` +
    `از این به بعد از مزایای پرمیوم بهره‌مند می‌شوی!`,

  paymentFailed: '❌ **پرداخت ناموفق!**\n\nلطفاً دوباره تلاش کن.',

  referral: (code: string, referralCount: number, bonusMB: number) =>
    `🎁 **سیستم دعوت**\n\n` +
    `لینک دعوت اختصاصی تو:\n` +
    `t.me/YOUR_BOT?start=${code}\n\n` +
    `👥 تعداد دعوت‌شده‌ها: ${referralCount}\n` +
    `💾 سهمیه دریافتی: ${bonusMB} مگابایت\n\n` +
    `به ازای هر نفر که با لینک تو عضو بشه، ۵۰۰ مگابایت سهمیه اضافی می‌گیری!`,

  referralWelcome: (referrerName: string) =>
    `🎉 با موفقیت عضو شدی!\n\n${referrerName} تو رو به ربات دعوت کرده.\n` +
    `🎁 **۵۰۰ مگابایت سهمیه اضافی** به عنوان هدیه دریافت کردی!`,

  userSettings: (quality: string, audio: boolean) =>
    `🎬 **${quality}** | 🎵 فقط صدا: ${audio ? '✅' : '❌'}`,

  cancelKeyboardLabel: '❌ لغو',
  backKeyboardLabel: '🔙 بازگشت',
};
