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
import hashlib
import io
import json
import os
import sys
import tempfile
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
DEFAULT_CACHE = PROJECT_ROOT / ".pou-cache"
MAX_SOURCE_BYTES = 200_000_000
MIN_TERRITORY_FEATURES = 40

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


def fetch(url: str, destination: Path) -> bytes:
    """Download a source release once, reusing a cached copy only if it is intact."""
    if destination.is_symlink():
        raise SystemExit(f"Refusing to use a symlinked cache entry: {destination}")
    if destination.is_file():
        cached = destination.read_bytes()
        if 0 < len(cached) <= MAX_SOURCE_BYTES:
            return cached
        raise SystemExit(f"Cached source is empty or oversize; delete it and retry: {destination}")

    with urlopen(Request(url, headers={"User-Agent": AGENT}), timeout=300) as response:
        # One byte over the cap distinguishes "at the limit" from "truncated by the cap".
        payload = response.read(MAX_SOURCE_BYTES + 1)
    if not payload:
        raise SystemExit(f"Source returned an empty body: {url}")
    if len(payload) > MAX_SOURCE_BYTES:
        raise SystemExit(f"Source exceeds the {MAX_SOURCE_BYTES} byte contract: {url}")

    # Write through a private temp file so an interrupted run cannot cache a truncation.
    destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    handle, staging = tempfile.mkstemp(dir=destination.parent, prefix=".download-")
    try:
        with os.fdopen(handle, "wb") as writer:
            writer.write(payload)
        os.replace(staging, destination)
    except BaseException:
        Path(staging).unlink(missing_ok=True)
        raise
    return payload


def only_column(columns: list[str], predicate, label: str) -> str:
    """Resolve exactly one column, so a renamed or added column fails loudly."""
    matches = [column for column in columns if predicate(column)]
    if len(matches) != 1:
        raise SystemExit(f"Expected exactly one {label} column, found {matches}")
    return matches[0]


def net_metering(archive_bytes: bytes) -> list[dict[str, object]]:
    """Extract California net-metered photovoltaic capacity per utility."""
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        with archive.open(f"Net_Metering_{EIA_YEAR}.xlsx") as handle:
            frame = pd.read_excel(handle, header=[0, 1, 2])
    frame.columns = [" ".join(str(part) for part in column if "Unnamed" not in str(part)).strip() for column in frame.columns]
    columns = list(frame.columns)
    state = only_column(columns, lambda column: column.endswith("State"), "state")
    name = only_column(columns, lambda column: "Utility Name" in column, "utility name")
    # basis drives an 8-25% DC conversion, so an added "... Type" column must not win silently.
    basis = only_column(columns, lambda column: column == "Utility Characteristics Type" or column.endswith(" Type") or column == "Type", "capacity basis")
    capacity = "Photovoltaic Capacity MW Total"
    if capacity not in columns:
        raise SystemExit(f"Expected column '{capacity}' is absent; EIA layout changed")

    california = frame[frame[state] == "CA"]
    rows = []
    for _, record in california.iterrows():
        utility = str(record[name]).strip()
        megawatts = record[capacity]
        if any(marker in utility for marker in IOU_IN_SOURCE) or not megawatts or pd.isna(megawatts) or megawatts <= 0:
            continue
        rating = str(record[basis]).strip().upper()
        if rating not in ("AC", "DC"):
            raise SystemExit(f"{utility}: capacity basis must be AC or DC, found {rating!r}")
        rows.append({
            "utility": utility,
            "basis": rating,
            "capacityMw": round(float(megawatts), 3),
        })
    return sorted(rows, key=lambda row: -row["capacityMw"])


def territory_features(lse_bytes: bytes) -> list[dict[str, object]]:
    """Read the territory layer, refusing error and truncated FeatureServer payloads."""
    payload = json.loads(lse_bytes)
    # FeatureServer signals both failure and truncation on HTTP 200.
    if payload.get("error"):
        raise SystemExit(f"Territory layer returned an error payload: {payload['error']}")
    if payload.get("exceededTransferLimit") or payload.get("properties", {}).get("exceededTransferLimit"):
        raise SystemExit("Territory layer response was truncated; page the query before regenerating")
    features = payload.get("features")
    if not isinstance(features, list) or len(features) < MIN_TERRITORY_FEATURES:
        raise SystemExit(f"Territory layer returned {len(features) if isinstance(features, list) else 'no'} features, expected at least {MIN_TERRITORY_FEATURES}")
    return features


def overlaps(lse_bytes: bytes, boundaries: Path, minimum_pct: float) -> list[dict[str, object]]:
    """Measure each utility territory against every city polygon in equal-area space."""
    project = Transformer.from_crs("EPSG:4326", "EPSG:3310", always_xy=True).transform

    def to_albers(geometry):
        geometry = geometry if geometry.is_valid else geometry.buffer(0)
        return transform(project, geometry)

    territories: dict[str, object] = {}
    for feature in territory_features(lse_bytes):
        utility = feature["properties"]["Utility"]
        if not utility or any(marker in utility for marker in IOU_IN_SOURCE):
            continue
        geometry = to_albers(shape(feature["geometry"]))
        # A utility split across features must union, or its area shrinks and
        # territoryInCityPct inflates past the merge gate.
        territories[utility] = unary_union([territories[utility], geometry]) if utility in territories else geometry

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
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE, help="Directory for downloaded source releases")
    parser.add_argument("--min-pct", type=float, default=1.0, help="Drop pairs below this percentage in both directions")
    options = parser.parse_args()

    if not 0 < options.min_pct <= 100:
        raise SystemExit(f"--min-pct must be greater than 0 and at most 100, got {options.min_pct}")
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
            "sourceSha256": hashlib.sha256(eia).hexdigest(),
            "utilities": net_metering(eia),
        },
        "territoryOverlap": {
            "crs": "EPSG:3310",
            "method": "Equal-area intersection of utility service territory with incorporated city polygons.",
            "boundaryNote": "CEC states these service territory boundaries are approximate.",
            "sourceName": "CEC Electric Load Serving Entities (IOU & POU)",
            "sourceUrl": LSE_ABOUT,
            "sourceSha256": hashlib.sha256(lse).hexdigest(),
            "pairs": overlaps(lse, options.boundaries, options.min_pct),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    counts = (len(payload["netMetering"]["utilities"]), len(payload["territoryOverlap"]["pairs"]))
    sys.stdout.write(f"Wrote {counts[0]} utilities and {counts[1]} territory/city pairs to {OUTPUT}\n")


if __name__ == "__main__":
    main()
