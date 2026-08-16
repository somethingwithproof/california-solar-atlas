#!/usr/bin/env python3
"""Build the publicly owned utility inputs: net-metered capacity and territory overlap.

Two annual releases feed city-level POU attribution:

  * Form EIA-861 Net Metering, for cumulative net-metered PV capacity per utility.
  * The CEC Electric Load Serving Entities layer, for utility service-territory polygons.

Overlap is measured in EPSG:3310 (California Albers, equal area) against the same
city boundary source build-boundaries.mjs consumes. Both directions are reported:
only `territoryInCityPct` licenses merging a utility total into a city, because a
territory contained by a city puts all of its capacity inside that city.

Run manually when a new annual release lands; the output is checked in.
"""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path
from urllib.request import Request, urlopen

import pandas as pd
from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform, unary_union
from shapely.prepared import prep

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT_ROOT / "data" / "pou-inputs.json"

EIA_YEAR = 2024
EIA_URL = f"https://www.eia.gov/electricity/data/eia861/zip/f861{EIA_YEAR}.zip"
LSE_URL = (
    "https://services3.arcgis.com/bWPjFyq029ChCGur/ArcGIS/rest/services/"
    "ElectricLoadServingEntities_IOU_POU/FeatureServer/0/query"
    "?where=1%3D1&outFields=Utility,Acronym,Type&outSR=4326&f=geojson"
)
LSE_ABOUT = "https://cecgis-caenergy.opendata.arcgis.com/datasets/CAEnergy::electric-load-serving-entities-iou-pou/about"

# The three DG Stats utilities are already the city inventory; they are not POU inputs.
IOU_IN_SOURCE = ("Pacific Gas", "Southern California Edison", "San Diego Gas")

# Requests without a browser agent are refused by both hosts.
AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"


def fetch(url: str, destination: Path) -> Path:
    """Download a source release once, reusing any local copy."""
    if destination.is_file() and destination.stat().st_size > 0:
        return destination
    with urlopen(Request(url, headers={"User-Agent": AGENT}), timeout=300) as response:
        destination.write_bytes(response.read())
    return destination


def net_metering(zip_path: Path) -> list[dict[str, object]]:
    """Extract California net-metered photovoltaic capacity per utility."""
    with zipfile.ZipFile(zip_path) as archive:
        with archive.open(f"Net_Metering_{EIA_YEAR}.xlsx") as handle:
            frame = pd.read_excel(handle, header=[0, 1, 2])
    frame.columns = [" ".join(str(part) for part in column if "Unnamed" not in str(part)).strip() for column in frame.columns]
    state = next(column for column in frame.columns if column.endswith("State"))
    name = next(column for column in frame.columns if "Utility Name" in column)
    basis = next(column for column in frame.columns if column.endswith("Type"))
    capacity = "Photovoltaic Capacity MW Total"

    california = frame[frame[state] == "CA"]
    rows = []
    for _, record in california.iterrows():
        utility = str(record[name]).strip()
        megawatts = record[capacity]
        if any(marker in utility for marker in IOU_IN_SOURCE) or not megawatts or pd.isna(megawatts) or megawatts <= 0:
            continue
        rows.append({
            "utility": utility,
            "basis": str(record[basis]).strip() or "unknown",
            "capacityMw": round(float(megawatts), 3),
        })
    return sorted(rows, key=lambda row: -row["capacityMw"])


def overlaps(lse_path: Path, boundaries: Path, minimum_pct: float) -> list[dict[str, object]]:
    """Measure each utility territory against every city polygon in equal-area space."""
    project = Transformer.from_crs("EPSG:4326", "EPSG:3310", always_xy=True).transform

    def to_albers(geometry):
        geometry = geometry if geometry.is_valid else geometry.buffer(0)
        return transform(project, geometry)

    territories = {}
    for feature in json.loads(lse_path.read_text())["features"]:
        utility = feature["properties"]["Utility"]
        if not utility or any(marker in utility for marker in IOU_IN_SOURCE):
            continue
        territories[utility] = to_albers(shape(feature["geometry"]))

    cities: dict[str, object] = {}
    geoids: dict[str, str] = {}
    for feature in json.loads(boundaries.read_text())["features"]:
        properties = feature["properties"]
        city = properties.get("CDTFA_CITY")
        if not city:
            continue
        geometry = to_albers(shape(feature["geometry"]))
        cities[city] = unary_union([cities[city], geometry]) if city in cities else geometry
        geoids.setdefault(city, properties.get("CENSUS_GEOID") or "")

    rows = []
    for utility, territory in territories.items():
        if territory.is_empty or territory.area <= 0:
            continue
        window = prep(territory)
        for city, polygon in cities.items():
            if polygon.is_empty or polygon.area <= 0 or not window.intersects(polygon):
                continue
            shared = territory.intersection(polygon).area
            if shared <= 0:
                continue
            territory_in_city = shared / territory.area * 100
            city_covered = shared / polygon.area * 100
            if territory_in_city < minimum_pct and city_covered < minimum_pct:
                continue
            rows.append({
                "utility": utility,
                "city": city,
                "geoid": geoids.get(city) or None,
                "cityCoveredPct": round(city_covered, 1),
                "territoryInCityPct": round(territory_in_city, 1),
            })
    return sorted(rows, key=lambda row: (row["utility"], -row["territoryInCityPct"]))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boundaries", type=Path, default=Path("/tmp/ca-city-boundaries-wgs84.geojson"),
                        help="City boundary GeoJSON in WGS84 (same source family as build-boundaries.mjs)")
    parser.add_argument("--cache", type=Path, default=Path("/tmp"), help="Directory for downloaded source releases")
    parser.add_argument("--min-pct", type=float, default=1.0, help="Drop pairs below this percentage in both directions")
    options = parser.parse_args()

    if not options.boundaries.is_file():
        raise SystemExit(f"City boundary source not found: {options.boundaries}")

    eia = fetch(EIA_URL, options.cache / f"f861{EIA_YEAR}.zip")
    lse = fetch(LSE_URL, options.cache / "ca-lse-territories.geojson")

    payload = {
        "netMetering": {
            "year": EIA_YEAR,
            "basisNote": "Capacity basis is per utility; the Type column reports AC or DC.",
            "sourceName": "Form EIA-861 Net Metering",
            "sourceUrl": "https://www.eia.gov/electricity/data/eia861/",
            "utilities": net_metering(eia),
        },
        "territoryOverlap": {
            "crs": "EPSG:3310",
            "method": "Equal-area intersection of utility service territory with incorporated city polygons.",
            "boundaryNote": "CEC states these service territory boundaries are approximate.",
            "sourceName": "CEC Electric Load Serving Entities (IOU & POU)",
            "sourceUrl": LSE_ABOUT,
            "pairs": overlaps(lse, options.boundaries, options.min_pct),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    counts = (len(payload["netMetering"]["utilities"]), len(payload["territoryOverlap"]["pairs"]))
    sys.stdout.write(f"Wrote {counts[0]} utilities and {counts[1]} territory/city pairs to {OUTPUT}\n")


if __name__ == "__main__":
    main()
