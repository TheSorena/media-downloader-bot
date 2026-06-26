# 🎬 ربات مدیا دانلودر تلگرام

رباتی حرفه‌ای برای دانلود ویدیو و صدا از یوتیوب، اینستاگرام، تیک‌تاک، X و هزاران سایت دیگر با Node.js و grammY.

## ✨ قابلیت‌ها

- 📥 دانلود از یوتیوب، اینستاگرام، تیک‌تاک، X (توییتر) و...
- 🎵 استخراج صدا به صورت MP3
- 🎬 انتخاب کیفیت (360p تا 2160p)
- 📊 نوار پیشرفت زنده دانلود
- 💾 پشتیبانی از فایل‌های تا ۲ گیگابایت (با Local Bot API)
- 🎁 سهمیه روزانه ۵ گیگابایت برای کاربر رایگان
- 💎 اشتراک پرمیوم با سهمیه نامحدود
- 🗑️ حذف خودکار فایل پس از آپلود به تلگرام

## 🛠️ پیش‌نیازها

1. **ربات تلگرام**: از [@BotFather](https://t.me/BotFather) توکن دریافت کنید
2. **api_id و api_hash**: از [my.telegram.org](https://my.telegram.org) برای Local Bot API
3. **Docker و Docker Compose**

## 🚀 راه‌اندازی

### ۱. کپی فایل تنظیمات
```bash
cp .env.example .env
```

### ۲. پر کردن فایل `.env`
```env
BOT_TOKEN=your_bot_token_here
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
ADMIN_IDS=your_telegram_id
```

### ۳. اجرا با Docker
```bash
docker compose up -d --build
```

### ۴. مشاهده لاگ‌ها
```bash
docker compose logs -f bot
```

## 📋 دستورات ربات

| دستور | توضیح |
|-------|--------|
| `/start` | شروع و معرفی |
| `/help` | راهنمای استفاده |
| `/stats` | آمار و سهمیه روزانه |
| `/premium` | خرید اشتراک پرمیوم |

## 🏗️ ساختار پروژه

```
src/
├── index.ts              # نقطه ورود
├── config/               # پیکربندی
├── bot/
│   ├── bot.ts            # ساخت ربات grammY
│   ├── middlewares/      # احراز هویت، سهمیه، بن
│   ├── commands/         # start, help, stats
│   ├── handlers/         # هندلر URL و دانلود
│   └── keyboards.ts      # کیبوردهای شیشه‌ای
├── downloader/
│   └── engine.ts         # موتور yt-dlp + حذف فایل
├── models/               # مدل‌های MongoDB
├── utils/                # ابزارها
└── locales/              # متن‌های فارسی
```

## 🔧 توسعه محلی (بدون Docker)

```bash
# نصب وابستگی‌ها
npm install

# اجرا در حالت توسعه
npm run dev

# بیلد
npm run build && npm start
```

### پیش‌نیازهای محلی
- Node.js 22+
- Python 3 + yt-dlp (`pip install yt-dlp`)
- ffmpeg
- MongoDB (لوکال یا ابری)

## 📐 معماری

```
Telegram ←→ Local Bot API (2GB upload) ←→ Node.js App
                                              ↓
                                    ┌─────────┴─────────┐
                                    │                   │
                                MongoDB            yt-dlp + ffmpeg
```

## 📝 لایسنس

MIT
