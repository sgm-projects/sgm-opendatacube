from enum import Enum, IntEnum
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class FileFormatEnum(str, Enum):
    XLSX = 'XLSX'
    CSV = 'CSV'

class ImageFormatEnum(str, Enum):
    PNG = 'PNG'
    JPG = 'JPG'
    TIFF = 'TIFF'
    SVG = 'SVG'

class ImageDpiEnum(IntEnum):
    DPI_150 = 150
    DPI_300 = 300
    DPI_600 = 600
    DPI_1200 = 1200

class TaskPostResult(BaseModel):
    job_id: str
    url: str

class TaskResult(BaseModel):
    ready: bool = False
    results: List[str] = None

class MethodInfo(BaseModel):
    group: str
    name: str
    title: str
    description: str
    image: str

class Group(BaseModel):
    title: str
    description: str
    image: HttpUrl
    methods: List[str]