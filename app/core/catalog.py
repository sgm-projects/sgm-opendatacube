import json
import httpx
import asyncio
import datetime
import app.core.config as config


async def get_item(url):
    async with httpx.AsyncClient() as client:
        print(f"Getting item from {url}")
        response = await client.get(url)
        print(f"Got item from {url} Code: {response.status_code}")
        data = None
        if response.status_code == 200:
            data = json.loads(response.text)
        return data
   
def is_date_between(href, dates):
    href = href.split('/')[0]
    href_date = datetime.datetime.strptime(href, "%Y-%m-%d").date()
    date1 = datetime.datetime.strptime(dates[0], "%Y-%m-%d").date()
    date2 = datetime.datetime.strptime(dates[1], "%Y-%m-%d").date()
    return date1 <= href_date <= date2

async def get_items(wrs_list, dates=None, limit=1, days=7):
    if not dates:
        delta = datetime.timedelta(days=days)
        today = datetime.datetime.now()
        dates = [(today - delta).date(), today.date()]
    
    base_url = config.STAC_LANDSAT
    links = [f"{base_url}/{wrs['path']:03d}/{wrs['row']:03d}/catalog.json" for wrs in wrs_list]
    tasks = [get_item(link) for link in links[:limit]]
    catalogs = await asyncio.gather(*tasks)
    catalogs = [catalog for catalog in catalogs if catalog]

    links = []
    for catalog in catalogs:
        base_url = [link['href'] for link in catalog['links'] if link['rel'] == 'self'][0]
        base_url = base_url.replace('catalog.json', '')
        links += [f"{base_url}{link['href']}" for link in catalog['links'] if link['rel'] == 'item' and is_date_between(link['href'], dates)]

    tasks = [get_item(link) for link in links[:limit]]
    result = await asyncio.gather(*tasks)
    result = [item for item in result if int(item['properties']['eo:cloud_cover']) < 80 ]
    result = {"items": result, "count": len(result)}
    return result
