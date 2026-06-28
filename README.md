# Media Downloader Bot

ربات تلگرام مدیا دانلودر حرفه‌ای - دانلود از یوتیوب، اینستاگرام، تیک‌تاک، X و...

## قابلیت‌ها

- دانلود ویدیو با کیفیت‌های مختلف (1080p, 720p, 480p, 360p)
- استخراج صدا به صورت MP3
- پشتیبانی از ۸+ پلتفرم
- سیستم اشتراک پرمیوم با درگاه پرداخت BluePal
- پنل مدیریت وب
- سهمیه‌بندی روزانه برای کاربران رایگان
- سیستم دعوت با پاداش
- عضویت اجباری کانال
- مدیریت کوکی یوتیوب

## پلتفرم‌های پشتیبانی شده

- YouTube
- Instagram
- TikTok
- X/Twitter
- Facebook
- Pinterest
- Reddit
- Vimeo
- SoundCloud

## نصب و راه‌اندازی

### پیش‌نیازها

- Python 3.11+
- Docker و Docker Compose
- MongoDB (Atlas یا محلی)
- ffmpeg

### تنظیم محیط

1. فایل `.env.example` رو کپی کنید و به `.env` تغییر نام دهید:

```bash
cp .env.example .env
```

2. متغیرهای محیطی رو پر کنید:

```env
BOT_TOKEN=توکن_بات_تلگرام
MONGODB_URI=mongodb+srv://...
ADMIN_IDS=7696465274
BLUEPAL_API_KEY=کلید_پرداخت
```

### اجرا با Docker

```bash
docker compose up -d --build
```

### اجرا بدون Docker

```bash
pip install -r requirements.txt
python bot.py
```

## پنل مدیریت

پنل مدیریت وب روی پورت 8000 در دسترس است:

```
http://localhost:8000
```

رمز عبور پیش‌فرض: `admin`

## دستورات ربات

| دستور | توضیح |
|-------|-------|
| `/start` | شروع |
| `/help` | راهنما |
| `/stats` | آمار و سهمیه |
| `/settings` | تنظیمات |
| `/history` | تاریخچه دانلودها |
| `/cancel` | لغو دانلود فعال |
| `/premium` | خرید اشتراک |
| `/referral` | سیستم دعوت |
| `/admin` | پنل ادمین |
| `/setcookies` | تنظیم کوکی یوتیوب |

## ساختار پروژه

```
python-bot/
├── bot.py              # نقطه شروع اصلی
├── config.py           # تنظیمات
├── requirements.txt    # وابستگی‌ها
├── Dockerfile          # بیلد Docker
├── docker-compose.yml  # ربات + cobalt
├── handlers/           # هندلرهای ربات
├── core/               # هسته دانلود
├── models/             # مدل‌های دیتابیس
├── utils/              # ابزارها
├── locales/            # متن‌های فارسی
├── keyboards/          # کیبوردها
├── web/                # پنل مدیریت وب
└── data/               # ذخیره تنظیمات
```

## لایسنس

MIT
