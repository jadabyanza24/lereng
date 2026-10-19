from pathlib import Path
import hashlib
import json
import geopandas as gpd
import rasterio
from rasterio.warp import reproject, Resampling
import numpy as np


def align_vector(frame: gpd.GeoDataFrame, crs: str):
    if frame.crs is None:
        raise ValueError("CRS sumber wajib diketahui; jangan menebak CRS")
    if frame.geometry.isna().any() or not frame.geometry.is_valid.all():
        raise ValueError("Geometri tidak valid")
    return frame.to_crs(crs)


def align_raster(source: Path, reference: Path, categorical: bool = False):
    with rasterio.open(source) as src, rasterio.open(reference) as ref:
        if not src.crs or not ref.crs:
            raise ValueError("CRS raster wajib diketahui")
        destination = np.full((ref.height, ref.width), np.nan, dtype="float32")
        reproject(source=rasterio.band(src, 1), destination=destination,
            src_transform=src.transform, src_crs=src.crs, src_nodata=src.nodata,
            dst_transform=ref.transform, dst_crs=ref.crs, dst_nodata=np.nan,
            resampling=Resampling.nearest if categorical else Resampling.bilinear)
        return destination, ref.profile


def dataset_manifest(paths: list[Path], provenance: dict, methodology: dict):
    files = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
    content = {"files": files, "provenance": provenance, "methodology": methodology}
    version = hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()
    return {**content, "version": version}
