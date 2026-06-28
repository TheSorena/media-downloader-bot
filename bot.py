import asyncio
import logging
from aiohttp import web as aio_web
from aiogram import Bot, Dispatcher
from aiogram.types import CallbackQuery, Message

from config import BOT_TOKEN, BOT_MODE, PORT, HOST, WEBHOOK_PATH
from models import user as user_model
from utils.cleanup import cleanup_temp_directory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_handlers(dp: Dispatcher):
    from handlers.start import router as start_router
    from handlers.help import router as help_router
    from handlers.stats import router as stats_router
    from handlers.settings import router as settings_router
    from handlers.premium import router as premium_router
    from handlers.admin import router as admin_router
    from handlers.cookies import router as cookies_router
    from handlers.url_handler import router as url_router, handle_url, handle_quality_selection
    from handlers.force_join import router as force_join_router, handle_force_join_check
    from handlers.settings import (
        handle_settings_quality, handle_settings_audio_toggle,
        handle_menu_back, handle_menu_stats, handle_menu_settings,
        handle_menu_premium, handle_menu_history, handle_menu_help,
    )
    from handlers.premium import handle_pay
    from handlers.admin import handle_admin_stats, handle_admin_users, handle_admin_recent, handle_admin_broadcast
    from handlers.cancel import handle_cancel, handle_download_cancel
    from handlers.cookies import handle_cookie_upload

    dp.include_router(start_router)
    dp.include_router(help_router)
    dp.include_router(stats_router)
    dp.include_router(settings_router)
    dp.include_router(premium_router)
    dp.include_router(admin_router)
    dp.include_router(cookies_router)
    dp.include_router(url_router)
    dp.include_router(force_join_router)

    @dp.callback_query(lambda c: c.data and c.data.startswith("dl:"))
    async def on_quality(callback: CallbackQuery):
        await handle_quality_selection(callback)

    @dp.callback_query(lambda c: c.data == "cancel")
    async def on_cancel(callback: CallbackQuery):
        await handle_cancel(callback)

    @dp.callback_query(lambda c: c.data == "download:cancel")
    async def on_download_cancel(callback: CallbackQuery):
        await handle_download_cancel(callback)

    @dp.callback_query(lambda c: c.data and c.data.startswith("set:quality:"))
    async def on_set_quality(callback: CallbackQuery):
        await handle_settings_quality(callback, callback.data.replace("set:quality:", ""))

    @dp.callback_query(lambda c: c.data == "set:audio:toggle")
    async def on_set_audio(callback: CallbackQuery):
        await handle_settings_audio_toggle(callback)

    @dp.callback_query(lambda c: c.data == "menu:back")
    async def on_menu_back(callback: CallbackQuery):
        await handle_menu_back(callback)

    @dp.callback_query(lambda c: c.data == "menu:stats")
    async def on_menu_stats(callback: CallbackQuery):
        await handle_menu_stats(callback)

    @dp.callback_query(lambda c: c.data == "menu:settings")
    async def on_menu_settings(callback: CallbackQuery):
        await handle_menu_settings(callback)

    @dp.callback_query(lambda c: c.data == "menu:premium")
    async def on_menu_premium(callback: CallbackQuery):
        await handle_menu_premium(callback)

    @dp.callback_query(lambda c: c.data == "menu:history")
    async def on_menu_history(callback: CallbackQuery):
        await handle_menu_history(callback)

    @dp.callback_query(lambda c: c.data == "menu:help")
    async def on_menu_help(callback: CallbackQuery):
        await handle_menu_help(callback)

    @dp.callback_query(lambda c: c.data and c.data.startswith("pay:"))
    async def on_pay(callback: CallbackQuery):
        await handle_pay(callback, callback.data.replace("pay:", ""))

    @dp.callback_query(lambda c: c.data == "admin:stats")
    async def on_admin_stats(callback: CallbackQuery):
        await handle_admin_stats(callback)

    @dp.callback_query(lambda c: c.data == "admin:users")
    async def on_admin_users(callback: CallbackQuery):
        await handle_admin_users(callback)

    @dp.callback_query(lambda c: c.data == "admin:recent")
    async def on_admin_recent(callback: CallbackQuery):
        await handle_admin_recent(callback)

    @dp.callback_query(lambda c: c.data == "admin:broadcast")
    async def on_admin_broadcast(callback: CallbackQuery):
        await handle_admin_broadcast(callback)

    @dp.callback_query(lambda c: c.data == "forcejoin:check")
    async def on_force_join(callback: CallbackQuery):
        await handle_force_join_check(callback)

    @dp.message(lambda m: m.document and m.document.file_name and (
        m.document.file_name.endswith(".txt") or m.document.file_name.endswith(".cookies")
    ))
    async def on_cookie_upload(message: Message):
        await handle_cookie_upload(message)

    @dp.message(lambda m: m.text and not m.text.startswith("/") and "https://" in m.text)
    async def on_url(message: Message):
        await handle_url(message)


async def _health_handler(request):
    return aio_web.json_response({"status": "ok", "bot": "MediaDownloader"})


async def _run_health_server():
    app = aio_web.Application()
    app.router.add_get("/health", _health_handler)
    app.router.add_get("/", _health_handler)
    runner = aio_web.AppRunner(app)
    await runner.setup()
    site = aio_web.TCPSite(runner, HOST, PORT)
    await site.start()
    logger.info(f"Health server on port {PORT}")


def main():
    cleanup_temp_directory()
    user_model.get_user(0)

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher()
    setup_handlers(dp)

    if BOT_MODE == "webhook":
        from handlers.premium import handle_payment_webhook

        async def webhook_handler(request):
            data = await request.json()
            asyncio.create_task(handle_payment_webhook(data))
            return aio_web.json_response({"received": True})

        async def run_webhook():
            await _run_health_server()
            wb_app = aio_web.Application()
            wb_app.router.add_get("/health", _health_handler)
            wb_app.router.add_get("/", _health_handler)
            wb_app.router.add_post(WEBHOOK_PATH, webhook_handler)
            runner = aio_web.AppRunner(wb_app)
            await runner.setup()
            site = aio_web.TCPSite(runner, HOST, PORT)
            await site.start()
            logger.info(f"Webhook server on {HOST}:{PORT}")
            await dp.start_polling(bot, drop_pending_updates=True)

        asyncio.run(run_webhook())
    else:
        async def run_polling():
            await _run_health_server()
            logger.info("Starting polling mode")
            await dp.start_polling(bot, drop_pending_updates=True)

        asyncio.run(run_polling())


if __name__ == "__main__":
    main()
