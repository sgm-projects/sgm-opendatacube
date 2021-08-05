from fastapi import FastAPI, HTTPException, status, Request
from fastapi.responses import HTMLResponse, FileResponse,  RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.catalog import get_items
from app.core.queue import get_queue, get_redis, get_jobs_in_registries, create_task
from app.core.wrs import ConvertToWRS
from app.core.odc import add_item
from pathlib import Path
import app.core.config as config
from pydantic import BaseModel
from datacube import Datacube
from app.core.process import rgb_task, get_band_task, calculate_index_task
from rq.job import Job

print("Loading WRS...", end='')
wrs = ConvertToWRS()
print("OK")

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", context={"request": request})

@app.get("/catalog/search")
async def search(lon1: float, lat1: float, lon2: float = None, lat2: float = None, date1: str = None, date2: str = None, limit: int = 10, days: int = 7):
    if not lon2 or not lat2:
        lon2 = lon1
        lat2 = lat1
    else:
        lon1, lon2 = min(lon1, lon2), max(lon1, lon2)
        lat1, lat2 = min(lat1, lat2), max(lat1, lat2)
    if not date1 or not date2:
        dates = None
    else:
        dates = (date1, date2)
    wrs_list = wrs.get_wrs_list(lon1,lat1, lon2, lat2)
    items = await get_items(wrs_list, dates=dates, limit=limit, days=days)
    for item in items["items"]:
        print(item)
        # add_item(item)
    return items

@app.get("/catalog/products")
async def get_products(lon1: float, lat1: float, lon2: float, lat2: float, date1: str = None, date2: str = None, limit: int = 10, days: int = 7):
    lon1, lon2 = min(lon1, lon2), max(lon1, lon2)
    lat1, lat2 = min(lat1, lat2), max(lat1, lat2)
    if not date1 or not date2:
        dates = None
    else:
        dates = (date1, date2)
    dc = Datacube(config=config.DATACUBE_CONF)
    product = dc.list_products(with_pandas=False)[0]
    print(product)
    datasets = dc.index.datasets.search(product=product["name"])
    print(list(datasets))
    for dataset in datasets:
        print(dataset)


@app.get(
    "/results/{job_id}",
    name='get_result',
    summary="Получение результата по задаче",
    description="Возвращает состояние задачи и результат, если есть."
)
def get_result(job_id):
    try:
        job = Job.fetch(job_id, connection=get_redis())
    except:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Task not found!')
    if job.is_finished:
        res = job.result
        if 'error' in res:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=res['error'])
        res["ready"] = True
        return res
    else:
        return {"ready": False}


@app.post(
    "/process/getband",
    status_code=status.HTTP_201_CREATED
)
def get_band(item: dict, request: Request, band: str = None):
    print('get_band')
    print(item)

    add_item(item)
    
    if band not in [f'B{i + 1}' for i in range(11)]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Неверные аргументы')
    
    params = {"item": item, "band": band}

    res = create_task(get_band_task, params)
    res['url'] = request.url_for('get_result', job_id=res['job_id'])
    return res

@app.post(
    "/process/calculateindex",
    status_code=status.HTTP_201_CREATED
)
def calculate_index(item: dict, request: Request, index: str = None):
    print('calculate_index')
    print(item)
    add_item(item)

    if index.lower() not in ['rgb', 'ndvi']:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail='Неверные аргументы')
    
    params = {"item": item, "index": index}
    res = create_task(calculate_index_task, params)
    
    res['url'] = request.url_for('get_result', job_id=res['job_id'])
    return res