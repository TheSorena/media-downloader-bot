from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import os

from config import WEB_ADMIN_PASSWORD, MONGODB_URI, MONGODB_DB_NAME
from pymongo import MongoClient

app = FastAPI(title="Media Downloader Admin")

templates = Jinja2Templates(directory="web/templates")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _db = _client[MONGODB_DB_NAME]
    return _db


def check_auth(request: Request) -> bool:
    password = request.cookies.get("admin_password")
    return password == WEB_ADMIN_PASSWORD


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    if not check_auth(request):
        return RedirectResponse(url="/login")
    db = get_db()
    total_users = db.users.count_documents({})
    total_downloads = db.downloads.count_documents({})
    today_downloads = db.downloads.count_documents({})
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "total_users": total_users,
        "total_downloads": total_downloads,
        "today_downloads": today_downloads,
    })


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login")
async def login(request: Request):
    form = await request.form()
    password = form.get("password", "")
    if password == WEB_ADMIN_PASSWORD:
        response = RedirectResponse(url="/", status_code=302)
        response.set_cookie("admin_password", password)
        return response
    return templates.TemplateResponse("login.html", {
        "request": request,
        "error": "رمز عبور اشتباه است.",
    })


@app.get("/logout")
async def logout():
    response = RedirectResponse(url="/login")
    response.delete_cookie("admin_password")
    return response


@app.get("/users", response_class=HTMLResponse)
async def users_page(request: Request):
    if not check_auth(request):
        return RedirectResponse(url="/login")
    db = get_db()
    users = list(db.users.find().sort("last_active_at", -1).limit(50))
    return templates.TemplateResponse("users.html", {
        "request": request,
        "users": users,
    })


@app.get("/downloads", response_class=HTMLResponse)
async def downloads_page(request: Request):
    if not check_auth(request):
        return RedirectResponse(url="/login")
    db = get_db()
    downloads = list(db.downloads.find().sort("created_at", -1).limit(50))
    return templates.TemplateResponse("downloads.html", {
        "request": request,
        "downloads": downloads,
    })


@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    if not check_auth(request):
        return RedirectResponse(url="/login")
    return templates.TemplateResponse("settings.html", {"request": request})


@app.post("/settings")
async def update_settings(request: Request):
    if not check_auth(request):
        return RedirectResponse(url="/login")
    return RedirectResponse(url="/settings")


@app.get("/api/stats")
async def api_stats(request: Request):
    if not check_auth(request):
        raise HTTPException(status_code=401)
    db = get_db()
    return {
        "total_users": db.users.count_documents({}),
        "total_downloads": db.downloads.count_documents({}),
    }
