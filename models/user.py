from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING
from config import MONGODB_URI, MONGODB_DB_NAME, MONGODB_USERS_COLLECTION

_client: MongoClient | None = None
_db = None
_collection = None


def _get_collection():
    global _client, _db, _collection
    if _collection is None:
        try:
            _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            _client.admin.command("ping")
            _db = _client[MONGODB_DB_NAME]
            _collection = _db[MONGODB_USERS_COLLECTION]
            _collection.create_index([("telegram_id", ASCENDING)], unique=True)
        except Exception:
            _collection = type("FallbackCollection", (), {
                "find_one": lambda *a, **kw: None,
                "insert_one": lambda *a, **kw: None,
                "update_one": lambda *a, **kw: None,
                "find": lambda *a, **kw: [],
                "aggregate": lambda *a, **kw: [],
            })()
    return _collection


def get_user(telegram_id: int) -> dict | None:
    return _get_collection().find_one({"telegram_id": telegram_id})


def create_user(telegram_id: int, first_name: str = "", last_name: str = "", username: str = "") -> dict:
    now = datetime.now(timezone.utc)
    user = {
        "telegram_id": telegram_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "is_premium": False,
        "premium_until": None,
        "is_banned": False,
        "download_count": 0,
        "total_bytes_downloaded": 0,
        "quota": {"date": "", "bytes_used": 0},
        "settings": {"default_quality": "720p", "prefer_audio": False},
        "referral": {"code": "", "referred_by": 0, "referral_count": 0, "bonus_bytes": 0},
        "payment": {"invoice_id": "", "plan": "", "status": "", "paid_at": None, "amount": 0},
        "joined_at": now,
        "last_active_at": now,
    }
    _get_collection().insert_one(user)
    return user


def update_user_activity(telegram_id: int, first_name: str = "", last_name: str = "", username: str = ""):
    updates = {"last_active_at": datetime.now(timezone.utc)}
    if first_name:
        updates["first_name"] = first_name
    if last_name:
        updates["last_name"] = last_name
    if username:
        updates["username"] = username
    _get_collection().update_one(
        {"telegram_id": telegram_id},
        {"$set": updates},
    )


def reset_quota_if_needed(telegram_id: int, day_key: str):
    _get_collection().update_one(
        {"telegram_id": telegram_id, "quota.date": {"$ne": day_key}},
        {"$set": {"quota.date": day_key, "quota.bytes_used": 0}},
    )


def get_quota_used(telegram_id: int, day_key: str) -> int:
    user = get_user(telegram_id)
    if not user:
        return 0
    quota = user.get("quota", {})
    if quota.get("date") != day_key:
        return 0
    return quota.get("bytes_used", 0)


def add_quota_usage(telegram_id: int, day_key: str, bytes_used: int):
    _get_collection().update_one(
        {"telegram_id": telegram_id},
        {
            "$inc": {
                "quota.bytes_used": bytes_used,
                "download_count": 1,
                "total_bytes_downloaded": bytes_used,
            },
            "$set": {
                "quota.date": day_key,
                "last_active_at": datetime.now(timezone.utc),
            },
        },
    )


def increment_download_count(telegram_id: int) -> int:
    result = _get_collection().find_one_and_update(
        {"telegram_id": telegram_id},
        {"$inc": {"download_count": 1}},
        return_document=True,
    )
    return result.get("download_count", 0) if result else 0


def get_all_users():
    return list(_get_collection().find({}))


def get_users_with_usernames():
    return list(_get_collection().find({"username": {"$ne": None, "$ne": ""}}))


def get_usage_stats():
    pipeline = [
        {"$group": {"_id": None, "total_users": {"$sum": 1}, "total_downloads": {"$sum": "$download_count"}}}
    ]
    result = list(_get_collection().aggregate(pipeline))
    if result:
        return result[0]
    return {"total_users": 0, "total_downloads": 0}


def set_user_premium(telegram_id: int, is_premium: bool, premium_until: datetime | None = None):
    _get_collection().update_one(
        {"telegram_id": telegram_id},
        {"$set": {"is_premium": is_premium, "premium_until": premium_until}},
    )


def ban_user(telegram_id: int):
    _get_collection().update_one(
        {"telegram_id": telegram_id},
        {"$set": {"is_banned": True}},
    )


def unban_user(telegram_id: int):
    _get_collection().update_one(
        {"telegram_id": telegram_id},
        {"$set": {"is_banned": False}},
    )


def set_user_settings(telegram_id: int, default_quality: str | None = None, prefer_audio: bool | None = None):
    updates = {}
    if default_quality is not None:
        updates["settings.default_quality"] = default_quality
    if prefer_audio is not None:
        updates["settings.prefer_audio"] = prefer_audio
    if updates:
        _get_collection().update_one(
            {"telegram_id": telegram_id},
            {"$set": updates},
        )


def is_admin(telegram_id: int) -> bool:
    from config import ADMIN_IDS
    return telegram_id in ADMIN_IDS
