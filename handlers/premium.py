from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from models import user as user_model
import locales.fa as fa
import keyboards.inline as kb

router = Router()

PLAN_PRICES = {
    "month": {"label": "ماهانه", "amount": 500000},
    "3months": {"label": "سه‌ماهه", "amount": 1200000},
    "year": {"label": "سالانه", "amount": 4000000},
}


@router.message(Command("premium"))
async def cmd_premium(message: Message):
    await message.reply(fa.premium, reply_markup=kb.premium_keyboard())


async def handle_pay(callback: CallbackQuery, plan: str):
    await callback.answer()
    user_id = callback.from_user.id

    if plan not in PLAN_PRICES:
        return

    plan_info = PLAN_PRICES[plan]
    from config import BLUEPAL_API_KEY, BLUEPAL_CALLBACK_URL

    if not BLUEPAL_API_KEY:
        await callback.message.edit_text("❌ سیستم پرداخت در دسترس نیست.")
        return

    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.bluepal.net/v1/invoice",
            headers={
                "Authorization": f"Bearer {BLUEPAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "amount": plan_info["amount"],
                "description": f"اشتراک پرمیوم {plan_info['label']}",
                "metadata": {"user_id": str(user_id), "plan": plan},
                "callback_url": BLUEPAL_CALLBACK_URL,
            },
            timeout=30,
        )

    if response.status_code != 200:
        await callback.message.edit_text("❌ خطا در ایجاد فاکتور پرداخت.")
        return

    invoice = response.json()
    invoice_id = invoice.get("invoice_id", "")
    payment_url = invoice.get("payment_url", "")

    user_model.get_user(user_id)
    from pymongo import MongoClient
    from config import MONGODB_URI, MONGODB_DB_NAME

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    db.users.update_one(
        {"telegram_id": user_id},
        {"$set": {"payment.invoice_id": invoice_id, "payment.plan": plan, "payment.status": "pending"}},
    )
    client.close()

    amount_toman = f"{plan_info['amount'] // 10:,}"
    await callback.message.edit_text(
        f"💰 **فاکتور پرداخت ایجاد شد**\n\n"
        f"📦 پلن: {plan_info['label']}\n"
        f"💵 مبلغ: {amount_toman} تومان\n\n"
        f"برای پرداخت روی لینک زیر کلیک کن:\n"
        f"{payment_url}",
        parse_mode="Markdown",
    )


async def handle_payment_webhook(payload: dict):
    if payload.get("event") != "payment.completed":
        return

    invoice_id = payload.get("invoice_id", "")
    amount = payload.get("amount", 0)
    final_amount = payload.get("final_amount", amount)

    from pymongo import MongoClient
    from config import MONGODB_URI, MONGODB_DB_NAME, BOT_TOKEN
    from datetime import datetime, timezone, timedelta

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    user = db.users.find_one({"payment.invoice_id": invoice_id})

    if not user:
        client.close()
        return

    if user.get("payment", {}).get("status") == "completed":
        client.close()
        return

    plan = user.get("payment", {}).get("plan", "")
    premium_days = 30
    if plan == "3months":
        premium_days = 90
    elif plan == "year":
        premium_days = 365

    premium_until = datetime.now(timezone.utc) + timedelta(days=premium_days)
    db.users.update_one(
        {"telegram_id": user["telegram_id"]},
        {"$set": {
            "is_premium": True,
            "premium_until": premium_until,
            "payment.status": "completed",
            "payment.paid_at": datetime.now(timezone.utc),
            "payment.amount": final_amount,
        }},
    )
    client.close()

    plan_names = {"month": "ماهانه", "3months": "سه‌ماهه", "year": "سالانه"}
    amount_str = f"{final_amount // 10:,}"

    import aiohttp
    async with aiohttp.ClientSession() as session:
        await session.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={
                "chat_id": user["telegram_id"],
                "text": fa.payment_success(plan_names.get(plan, plan), amount_str),
                "parse_mode": "Markdown",
            },
        )
