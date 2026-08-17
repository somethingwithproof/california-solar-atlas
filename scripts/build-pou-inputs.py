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
# A repair that moves the area more than this changes the denominator of the merge gate.

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


def remote_length(url: str) -> int | None:
    """Ask the server how many bytes it would send, or None if it will not say."""
    request = Request(url, headers={"User-Agent": AGENT}, method="HEAD")
    try:
        with urlopen(request, timeout=60) as response:
            declared = response.headers.get("Content-Length")
    except OSError:
        return None
    return int(declared) if declared and declared.isdigit() else None


def fetch(url: str, destination: Path) -> bytes:
    """Download a source release once, reusing a cached copy only if it is intact."""
    if destination.is_symlink():
        raise SystemExit(f"Refusing to use a symlinked cache entry: {destination}")
    if destination.is_file():
        cached_size = destination.stat().st_size
        if not 0 < cached_size <= MAX_SOURCE_BYTES:
            raise SystemExit(f"Cached source is empty or oversize; delete it and retry: {destination}")
        cached = destination.read_bytes()
        # The caller publishes sha256(bytes) as upstream provenance, so a cached file is
        # only trustworthy if it still matches what the server is serving today. This
        # catches both a short earlier download and a stale prior-year release.
        upstream = remote_length(url)
        if upstream is not None and upstream != len(cached):
            raise SystemExit(
                f"Cached source is {len(cached)} bytes but upstream now serves {upstream}; "
                f"delete it and retry: {destination}")
        return cached

    with urlopen(Request(url, headers={"User-Agent": AGENT}), timeout=300) as response:
        declared = response.headers.get("Content-Length")
        # One byte over the cap distinguishes "at the limit" from "truncated by the cap".
        payload = response.read(MAX_SOURCE_BYTES + 1)
    if not payload:
        raise SystemExit(f"Source returned an empty body: {url}")
    if len(payload) > MAX_SOURCE_BYTES:
        raise SystemExit(f"Source exceeds the {MAX_SOURCE_BYTES} byte contract: {url}")
    # With Content-Length, read() can return short on a mid-transfer close without
    # raising, and the caller publishes sha256(payload) as provenance, so compare.
    # A chunked response has no length to compare, but the protocol itself raises
    # IncompleteRead on a short transfer, so reaching here means it completed.
    if declared is not None and declared.isdigit() and len(payload) != int(declared):
        raise SystemExit(f"Source truncated: got {len(payload)} of {declared} bytes from {url}")

    # Write through a private temp file so an interrupted run cannot cache a partial write.
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


def read_local_json(path: Path, label: str) -> dict:
    """Read a caller-supplied JSON file only after it passes the same checks as a download."""
    # Test the given path, not the resolved one: resolve() follows the link, so asking
    # the resolved path whether it is a symlink can never be true.
    if path.is_symlink():
        raise SystemExit(f"{label} must not be a symlink: {path}")
    resolved = path.resolve()
    if not resolved.is_file():
        raise SystemExit(f"{label} must be an existing regular file: {resolved}")
    size = resolved.stat().st_size
    if not 0 < size <= MAX_SOURCE_BYTES:
        raise SystemExit(f"{label} is empty or exceeds the {MAX_SOURCE_BYTES} byte contract: {resolved}")
    with resolved.open("rb") as handle:
        payload = json.loads(handle.read(MAX_SOURCE_BYTES))
    if not isinstance(payload, dict) or not isinstance(payload.get("features"), list):
        raise SystemExit(f"{label} must be a GeoJSON object with a features array: {resolved}")
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
    names = [row["utility"] for row in rows]
    if len(set(names)) != len(names):
        duplicates = sorted({name for name in names if names.count(name) > 1})
        raise SystemExit(f"EIA reports more than one row for: {duplicates}. Decide how to combine them before publishing.")
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


CALIFORNIA_BOUNDS = (-125.0, -113.0, 32.0, 43.0)


def _first_points(geometry: object) -> list[tuple[float, float]]:
    """Pull a leaf coordinate pair without walking an entire polygon."""
    if not isinstance(geometry, dict):
        return []
    node: object = geometry.get("coordinates")
    while isinstance(node, list) and node and isinstance(node[0], list):
        node = node[0]
    return [tuple(node[:2])] if isinstance(node, list) and len(node) >= 2 and all(isinstance(v, (int, float)) for v in node[:2]) else []


def _require_wgs84(payload: dict) -> None:
    """Reject a boundary file that is not already lon/lat inside California."""
    named = ((payload.get("crs") or {}).get("properties") or {}).get("name", "")
    if named and not any(marker in named.upper() for marker in ("4326", "CRS84")):
        raise SystemExit(f"City boundary source must be WGS84 lon/lat, found CRS {named}")
    west, east, south, north = CALIFORNIA_BOUNDS
    for feature in payload["features"][:50]:
        for longitude, latitude in _first_points(feature.get("geometry")):
            if not (west <= longitude <= east and south <= latitude <= north):
                raise SystemExit(f"City boundary coordinate {longitude}, {latitude} is outside California; check the CRS")


def _albers():
    """Return a projector into EPSG:3310, the equal-area basis for these ratios."""
    project = Transformer.from_crs("EPSG:4326", "EPSG:3310", always_xy=True).transform
    return lambda geometry: transform(project, geometry)


def _union_repaired(parts: list, label: str, repairs: dict[str, float]):
    """Union a label's features, then repair once and record what the repair moved.

    Repairing per feature would measure a delta against that feature rather than the
    union the merge gate actually divides by, so the union is formed first.
    """
    try:
        merged = unary_union(parts)
    except Exception:  # noqa: BLE001 - shapely raises varied topology errors here
        merged = unary_union([part.buffer(0) for part in parts])
        repairs[label] = 100.0
        return merged
    if merged.is_valid:
        return merged
    before = merged.area
    merged = merged.buffer(0)
    repairs[label] = round(abs(merged.area - before) / before * 100, 4) if before > 0 else 100.0
    return merged


def _territories(lse_bytes: bytes, to_albers, repairs: dict[str, float]) -> dict[str, object]:
    """Group every feature belonging to one utility, then union it into a territory."""
    parts: dict[str, list] = {}
    for feature in territory_features(lse_bytes):
        utility = feature["properties"]["Utility"]
        if not utility or any(marker in utility for marker in IOU_IN_SOURCE):
            continue
        # A utility split across features must union, or its area shrinks and
        # territoryInCityPct inflates past the merge gate.
        parts.setdefault(utility, []).append(to_albers(shape(feature["geometry"])))
    return {utility: _union_repaired(geoms, utility, repairs) for utility, geoms in parts.items()}


def _cities(boundaries: Path, to_albers, repairs: dict[str, float]) -> tuple[dict[str, object], dict[str, str]]:
    """Union multi-part city boundaries and keep each city's GEOID."""
    payload = read_local_json(boundaries, "City boundary source")
    _require_wgs84(payload)
    parts: dict[str, list] = {}
    geoids: dict[str, str] = {}
    for feature in payload["features"]:
        properties = feature["properties"]
        city = properties.get("CDTFA_CITY")
        if not city:
            continue
        parts.setdefault(city, []).append(to_albers(shape(feature["geometry"])))
        geoids.setdefault(city, properties.get("CENSUS_GEOID") or "")
    return {city: _union_repaired(geoms, city, repairs) for city, geoms in parts.items()}, geoids


def _pairs_for(utility: str, territory, cities: dict, geoids: dict, minimum_pct: float) -> list[dict[str, object]]:
    """Measure one territory against every city, keeping pairs above the floor."""
    window = prep(territory)
    rows = []
    for city, polygon in cities.items():
        if polygon.is_empty or polygon.area <= 0 or not window.intersects(polygon):
            continue
        shared = territory.intersection(polygon).area
        if shared <= 0:
            continue
        territory_in_city = shared / territory.area * 100
        city_covered = shared / polygon.area * 100
        if territory_in_city > 100.01 or city_covered > 100.01:
            raise SystemExit(f"{utility} / {city}: overlap exceeds 100%, indicating a CRS or geometry defect")
        if territory_in_city < minimum_pct and city_covered < minimum_pct:
            continue
        rows.append({
            "utility": utility,
            "city": city,
            "geoid": geoids.get(city) or None,
            "cityCoveredPct": round(city_covered, 1),
            "territoryInCityPct": round(territory_in_city, 1),
        })
    return rows


def overlaps(lse_bytes: bytes, boundaries: Path, minimum_pct: float) -> tuple[list[dict[str, object]], dict[str, float], dict[str, float]]:
    """Measure each utility territory against every city polygon in equal-area space."""
    territory_repairs: dict[str, float] = {}
    city_repairs: dict[str, float] = {}
    to_albers = _albers()
    territories = _territories(lse_bytes, to_albers, territory_repairs)
    cities, geoids = _cities(boundaries, to_albers, city_repairs)

    rows = [
        row
        for utility, territory in territories.items()
        if not (territory.is_empty or territory.area <= 0)
        for row in _pairs_for(utility, territory, cities, geoids, minimum_pct)
    ]
    return sorted(rows, key=lambda row: (row["utility"], -row["territoryInCityPct"])), territory_repairs, city_repairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--boundaries", type=Path, default=DEFAULT_CACHE / "ca-city-boundaries-wgs84.geojson",
                        help="City boundary GeoJSON in WGS84 (same source family as build-boundaries.mjs)")
    parser.add_argument("--cache", type=Path, default=DEFAULT_CACHE, help="Directory for downloaded source releases")
    parser.add_argument("--min-pct", type=float, default=1.0, help="Drop pairs below this percentage in both directions")
    options = parser.parse_args()

    if not 0 < options.min_pct <= 100:
        raise SystemExit(f"--min-pct must be greater than 0 and at most 100, got {options.min_pct}")
    if not options.boundaries.is_file():
        raise SystemExit(f"City boundary source not found: {options.boundaries}. Pass --boundaries with an explicit path.")

    eia = fetch(EIA_URL, options.cache / f"f861{EIA_YEAR}.zip")
    lse = fetch(LSE_URL, options.cache / "ca-lse-territories.geojson")

    net_metering_rows = net_metering(eia)
    overlap_pairs, repaired_territories, repaired_cities = overlaps(lse, options.boundaries, options.min_pct)

    payload = {
        "netMetering": {
            "year": EIA_YEAR,
            "basisNote": "Capacity basis is per utility; the Type column reports AC or DC.",
            "sourceName": "Form EIA-861 Net Metering",
            "sourceUrl": "https://www.eia.gov/electricity/data/eia861/",
            "sourceSha256": hashlib.sha256(eia).hexdigest(),
            "utilities": net_metering_rows,
        },
        "territoryOverlap": {
            "crs": "EPSG:3310",
            "method": "Equal-area intersection of utility service territory with incorporated city polygons.",
            "boundaryNote": "CEC states these service territory boundaries are approximate.",
            "sourceName": "CEC Electric Load Serving Entities (IOU & POU)",
            "sourceUrl": LSE_ABOUT,
            "sourceSha256": hashlib.sha256(lse).hexdigest(),
            "pairs": overlap_pairs,
            # Percent of area a buffer(0) repair moved. The territory is the ratio's
            # denominator and the city is its numerator, so either can inflate the
            # overlap; build-data.mjs weighs both against the merge margin. Kept apart
            # because a city can share a name with a territoryName.
            "repairedTerritoryAreaPct": repaired_territories,
            "repairedCityAreaPct": repaired_cities,
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    counts = (len(payload["netMetering"]["utilities"]), len(payload["territoryOverlap"]["pairs"]))
    sys.stdout.write(f"Wrote {counts[0]} utilities and {counts[1]} territory/city pairs to {OUTPUT}\n")
    # The EIA-to-CEC name join lives in data/pou-attribution.json, and build-data.mjs
    # fails closed on a utility with no decision or an unresolvable territory name.


if __name__ == "__main__":
    main()
