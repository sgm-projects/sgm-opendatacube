import datetime
import uuid
import datacube
from datacube.index.hl import Doc2Dataset
import app.core.config as config

def get_geo_ref_points(points):

    lons = (points[0], points[2])
    lats = (points[1], points[3])

    minlon = min(lons)
    minlat = min(lats)
    maxlon = max(lons)
    maxlat = max(lats)

    return {
        'ul': {'x': minlon, 'y': maxlat},
        'ur': {'x': maxlon, 'y': maxlat},
        'll': {'x': minlon, 'y': minlat},
        'lr': {'x': maxlon, 'y': minlat},
    }

def item_to_metadata(item):
    bands = [('1', 'coastal_aerosol'),
             ('2', 'blue'),
             ('3', 'green'),
             ('4', 'red'),
             ('5', 'nir'),
             ('6', 'swir1'),
             ('7', 'swir2'),
             ('8', 'panchromatic'),
             ('9', 'cirrus'),
             ('10', 'lwir1'),
             ('11', 'lwir2'),
             ('QA', 'quality')]
    coordinates = item['bbox']
    cs_code = item['properties'].get('eo:epsg', 3031)
    geo_ref_points = get_geo_ref_points(coordinates)
    doc = {
        'id': str(uuid.uuid5(uuid.NAMESPACE_URL, item['id'])),
        'processing_level': item['properties']['landsat:processing_level'],
        'product_type': item['properties']['landsat:processing_level'], #item['properties']['collection'], 
        'creation_dt': item['properties']['datetime'],
        'label': item['properties']['landsat:scene_id'],
        'platform': {'code': 'LANDSAT_8'},
        'instrument': {'name': 'OLI_TIRS'},
        'extent': {
            'from_dt': item['properties']['datetime'],
            'to_dt': item['properties']['datetime'],
            'center_dt': item['properties']['datetime'],
            'coord': geo_ref_points,
        },
        'format': {'name': 'GeoTiff'},
        'grid_spatial': {
            'projection': {
                'geo_ref_points': geo_ref_points,
                'spatial_reference': 'EPSG:%s' % cs_code,
            }
        },
        'image': {
            'bands': {
                band[1]: {
                    'path': item['assets'][f'B{band[0]}']['href'],
                    'layer': 1,
                } for band in bands
            }
        },
        'lineage': {'source_datasets': {}},
    }
    return doc

def add_dataset(doc):
    dc = datacube.Datacube(config=config.DATACUBE_CONF)
    index = dc.index
    resolver = Doc2Dataset(index)
    dataset, error = resolver(doc, 'file:///tmp/test-dataset.json')
    index.datasets.add(dataset)