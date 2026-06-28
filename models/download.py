from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING
from config import MONGODB_URI, MONGODB_DB_NAME, MONGODB_DOWNLOADS_COLLECTION

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
            _collection = _db[MONGODB_DOWNLOADS_COLLECTION]
            _collection.create_index([("telegram_id", ASCENDING)])
            _collection.create_index([("created_at", ASCENDING)])
        except Exception:
            _collection = type("FallbackCollection", (), {
                "insert_one": lambda *a, **kw: None,
                "update_one": lambda *a, **kw: None,
                "find": lambda *a, **kw: [],
            })()
    return _collection


def create_download(
    telegram_id: int,
    url: str,
    platform: str,
    title: str = "",
    quality: str = "video",
) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        "telegram_id": telegram_id,
        "url": url,
        "platform": platform,
        "title": title,
        "quality": quality,
        "file_size": 0,
        "format": "",
        "status": "pending",
        "error_message": "",
        "telegram_message_id": None,
        "started_at": None,
        "completed_at": None,
        "created_at": now,
    }
    result = _get_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def update_download_status(download_id, status: str, **kwargs):
    updates = {"status": status}
    updates.update(kwargs)
    _get_collection().update_one(
        {"_id": download_id},
        {"$set": updates},
    )


def get_user_downloads(telegram_id: int, limit: int = 10):
    return list(
        _get_collection()
        .find({"telegram_id": telegram_id, "status": "completed"})
        .sort("created_at", -1)
        .limit(limit)
    )


def get_recent_downloads(limit: int = 20):
    return list(
        _get_collection()
        .find({})
        .sort("created_at", -1)
        .limit(limit)
    )


def get_today_stats(day_key: str):
    pipeline = [
        {"$match": {"created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)}}},
        {"$group": {"_id": None, "count": {"$sum": 1}, "total_bytes": {"$sum": "$file_size"}}},
    ]
    result = list(_get_collection().aggregate(pipeline))
    if result:
        return result[0]
    return {"count": 0, "total_bytes": 0}
