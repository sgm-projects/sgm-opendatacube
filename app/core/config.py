import os
from pathlib import Path

ROOT =  Path()
STATIC_DIR = ROOT / 'static'
UPLOAD_DIR = STATIC_DIR / 'upload'
DOWNLOAD_DIR = STATIC_DIR / 'download'
STAC_CACHE_DIR = ROOT / 'stac_cache'
RESULT_TTL = 600
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
DATACUBE_CONF = os.getenv('DATACUBE_CONF', 'datacube.conf')
STAC_LANDSAT = "https://landsat-stac.s3.amazonaws.com/landsat-8-l1"
DEBUG = True