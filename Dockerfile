# base image
FROM python:3

# set working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN apt update
RUN apt-get install -y build-essential python3-dev python3-pip python3-venv libyaml-dev libpq-dev
RUN apt-get install -y libproj-dev proj-bin libgdal-dev libgeos-dev libgeos++-dev libudunits2-dev libnetcdf-dev libhdf4-alt-dev libhdf5-serial-dev gfortran
RUN python3 -m pip install -U pip setuptools
RUN python3 -m pip install -U wheel 'setuptools_scm[toml]' cython
RUN python3 -m pip install -U 'pyproj==2.*' 'datacube[all]' --no-binary=rasterio,pyproj,shapely,fiona,psycopg2,netCDF4,h5py
RUN python -m pip install GDAL==$(gdal-config --version)

RUN pip install fastapi, httpx, redis, rq, aiofiles, jinja2, uvicorn

# add requirements (to leverage Docker cache)
#ADD ./requirements.txt /usr/src/app/requirements.txt

# install requirements
RUN pip install datacube

# copy project
COPY . /usr/src/app