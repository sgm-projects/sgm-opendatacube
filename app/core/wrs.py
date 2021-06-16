import io
import os
from osgeo import ogr
import shapely.wkt
import shapely.geometry
from shapely import speedups
import json
from pathlib import Path

class ConvertToWRS:
    def __init__(self, shapefile=Path("assets/wrs/WRS2_descending.shp")):
        speedups.disable()
        self.shapefile = ogr.Open(str(shapefile))
        self.layer = self.shapefile.GetLayer(0)

        self.polygons = []

        for i in range(self.layer.GetFeatureCount()):
            feature = self.layer.GetFeature(i)
            path = feature['PATH']
            row = feature['ROW']
            geom = feature.GetGeometryRef()
            shape = shapely.wkt.loads(geom.ExportToWkt())
            self.polygons.append((shape, path, row))

    def get_wrs(self, lat, lon):
        pt = shapely.geometry.Point(lon, lat)
        res = []
        for poly in self.polygons:
            if pt.within(poly[0]):
                res.append({'polygon': poly[0], 'path': poly[1], 'row': poly[2]})
        return res

    def get_wrs_list(self, lon1, lat1, lon2, lat2):
        points = [
            (lon1, lat1),
            (lon1, lat2),
            (lon2, lat2),
            (lon1, lat2)
        ]
        box = shapely.geometry.Polygon(points)
        print(box.bounds)
        res = []
        for poly in self.polygons:
            if box.intersects(poly[0]):
                res.append({'polygon': poly[0], 'path': poly[1], 'row': poly[2]})
        return res

def get_thumb(path, row):
    url = f"https://landsat-stac.s3.amazonaws.com/landsat-8-l1/{path:03d}/{row:03d}/catalog.json"
    response = requests.get(url)
    data = json.loads(response.text)
    link = data['links'][-1]['href']
    response = requests.get(url.replace('catalog.json', '') + link)
    data = json.loads(response.text)
    thumb_url = data['assets']['thumbnail']['href']
    bbox = data['bbox']
    bbox = [[bbox[1], bbox[0]], [bbox[3], bbox[2]]]
    datetime = data['properties']['datetime']
    return thumb_url, bbox, datetime

def checkPoint(feature, point, mode):
    geom = feature.GetGeometryRef() #Get geometry from feature
    shape = shapely.wkt.loads(geom.ExportToWkt()) #Import geometry into shapely to easily work with our point
    if point.within(shape) and feature['MODE']==mode:
        return True
    else:
        return False

def getpathrow(lon, lat):
    shapefile = Path('wrs/WRS2_descending.shp')
    wrs = ogr.Open(str(shapefile))
    layer = wrs.GetLayer(0)
    point = shapely.geometry.Point(lon, lat)
    mode = 'D'
    features = []
    for i in range(layer.GetFeatureCount()):
        if checkPoint(layer.GetFeature(i), point, mode):
            
            feature = layer.GetFeature(i)
            geom = feature.GetGeometryRef()
            bbox = geom.GetEnvelope()
            bbox = [[bbox[2], bbox[0]], [bbox[3], bbox[1]]]
            feature_json = feature.ExportToJson()
            feature_json = json.loads(feature_json)
            path = feature['PATH']
            row = feature['ROW']
            polygon = feature_json['geometry']['coordinates'][0]
            polygon = [[lat, lon] for lon, lat in polygon]
            thumb_url, _, datetime = get_thumb(path, row)
            features.append({'path': path, 'row': row, 'polygon': polygon, 'thumb': thumb_url, 'bbox': bbox, 'datetime': datetime})
    return features

