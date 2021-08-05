from os import write
from datacube import Datacube
from datacube.utils.cog import write_cog
from pathlib import Path

import rasterio
from PIL import Image
from pyproj import Transformer

import numpy as np
import app.core.config as config

def clear_files_for_job(job_id):
    path = config.UPLOAD_DIR / job_id
    if path.exists():
        for f in path.iterdir():
            f.unlink()
        path.rmdir()
    path = config.DOWNLOAD_DIR / job_id
    if path.exists():
        for f in path.iterdir():
            f.unlink()
        path.rmdir()

def get_or_create_dir(root, job_id):
    path = root / job_id
    if not path.exists():
        path.mkdir()
    return path

def generate_filename(path, prefix, name):
    return path / f'{prefix}_{name}'

def error(message):
    return {'success': False, 'error': message}

def ready(results):
    return {'ready': True, 'results': results}



def scale_array(arr):
    mx = 2**16 - 1
    res = mx / arr.max() * arr
    res = res.astype(arr.dtype)
    # png = np.stack((res,)*4, axis=-1)
    # png[:, :, 3] = np.where(png[:, :, 3] > 0, 1, 0)
    return res

def transform_coords(points, crs1, crs2=4326):
    transformer = Transformer.from_crs(crs1, crs2, always_xy=True)
    result = [transformer.transform(x, y) for x, y in points]
    return result

def save_png(arr, filename='temp.png'):
    img = Image.fromarray(arr)
    img.save(filename)

def get_overview(url, factor=3):
    with rasterio.open(url) as src:
        overviews = src.overviews(1)
        factor = factor if factor <= len(overviews) else len(overviews)
        scale = overviews[-factor]
        arr = src.read(1, out_shape=(src.height // scale, src.width // scale))        
        metadata = {'profile': src.profile, 'bounds': src.bounds}
        bounds = metadata['bounds']
        points = [
            (bounds.left, bounds.bottom),
            (bounds.left, bounds.top),
            (bounds.right, bounds.top),
            (bounds.right, bounds.bottom)
        ]
        points = transform_coords(points, metadata['profile']['crs'])

        points = [(p1, p0) for p0, p1 in points] 

        metadata['points'] = points
    return arr, metadata

def get_thumbnail(item, band='B8', factor=1):
    url = item['assets'][band]['href']
    arr, metadata = get_overview(url, factor=factor)
    filename = config.STATIC_DIR / f'{item["id"]}_{band}.png'
    save_png(scale_array(arr), filename=filename)
    metadata['href'] = filename.as_posix()
    metadata['success'] = True
    return metadata

def get_band_task(params: dict):
    item = params.get('item')
    band = params.get('band', 'B8')
    factor = params.get('factor', 3)
    result = get_thumbnail(item, band, factor)
    return result

def rgb_task(item):
    result = get_thumbnail(item, factor=4)
    return result

def rgb_task2(item):
    dc = Datacube(config="datacube.conf")
    product = "ls8_level1_usgs"
    time = item["properties"]["datetime"].split("T")[0]
    x = (item["bbox"][0], item["bbox"][2])
    y = (item["bbox"][1], item["bbox"][3])
    measurements = ["B2"]
    ds = dc.load(product=product, measurements=measurements, time=time, x=x, y=y, output_crs='EPSG:4326', resolution=(-0.001, 0.001))
    suffix = '_'.join(measurements)
    filename = f'{item["id"]}_{suffix}.tif'
    
    path = write_cog(ds.to_array(), Path('/static') / filename, )
    return {"success": True, "url": str(path)}


def calculate_index_task(params):
    item = params.get('item')
    index = params.get('index', 'rgb')
    dc = Datacube(config="datacube.conf")
    product = "ls8_level1_usgs"
    x = (item["bbox"][0], item["bbox"][2])
    y = (item["bbox"][1], item["bbox"][3])
    time = item["properties"]["datetime"].split("T")[0]
    measurements = ["band_2", "band_3", "band_4"]

    query = {
        'x': x,
        'y': y,
        'time': time,
        'measurements': ['nbart_red', 'nbart_green', 'nbart_blue'],
        'output_crs': 'EPSG:4326',
        'resolution': (-0.001, 0.001),
    }

    ds = dc.load(product=product, **query)
    print(ds)
    rgb_da = ds.to_array()
    suffix = 'rgb'
    filename = f'{item["id"]}_{suffix}.tif'
    path = config.STATIC_DIR / filename
    write_cog(geo_im=rgb_da, fname='rgb.tif', overwrite=True)
    return {"success": True, "url": str(path)}

