from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import HTMLResponse, FileResponse,  RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.catalog import get_items
from app.core.wrs import ConvertToWRS
from pathlib import Path
import app.core.config as config
from pydantic import BaseModel

print("Loading WRS...", end='')
wrs = ConvertToWRS()
print("OK")

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", context={"request": request})

@app.get("/catalog/getforpoint")
async def getforpoint(lon: float, lat: float, date1: str = None, date2: str = None, limit = None):
    wrs_list = wrs.get_wrs(lat, lon)
    if not date1 or not date2:
        dates = None
    else:
        dates = (date1, date2)
    return await get_items(wrs_list, dates=dates, limit=10)
    
@app.get("/catalog/getforregion")
async def getforregion(lon1: float, lat1: float, lon2: float, lat2: float, date1: str = None, date2: str = None, limit: int = 10, days: int = 7):
    lon1, lon2 = min(lon1, lon2), max(lon1, lon2)
    lat1, lat2 = min(lat1, lat2), max(lat1, lat2)
    if not date1 or not date2:
        dates = None
    else:
        dates = (date1, date2)
    wrs_list = wrs.get_wrs_list(lon1,lat1, lon2, lat2)

    return await get_items(wrs_list, dates=dates, limit=limit, days=days)