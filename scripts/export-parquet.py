#!/usr/bin/env python3
"""Export the browser JSON as flat, reusable Parquet release assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq


def put(target: dict[str, object], key: str, value: object) -> None:
    """Assign a flattened value without allowing ambiguous key collisions."""
    if not key or key in target:
        raise ValueError(f"Flattened key collision or empty key: {key!r}")
    target[key] = value


def flatten(
    prefix: str,
    value: object,
    target: dict[str, object],
    *,
    skipped_lists: frozenset[str] = frozenset(),
) -> None:
    """Flatten nested dictionaries and serialize non-relational list values."""
    if isinstance(value, dict):
        for key, child in value.items():
            flatten(f"{prefix}_{key}" if prefix else key, child, target, skipped_lists=skipped_lists)
    elif isinstance(value, list):
        if prefix not in skipped_lists:
            put(target, prefix, json.dumps(value, separators=(",", ":"), ensure_ascii=False))
    else:
        put(target, prefix, value)


def require_keys(mapping: dict[str, Any], keys: set[str], context: str) -> None:
    """Fail with a useful message when a required JSON field is absent."""
    missing = sorted(keys - mapping.keys())
    if missing:
        raise ValueError(f"{context}: missing required fields: {', '.join(missing)}")


def validate_payload(payload: object) -> dict[str, Any]:
    """Validate the structure required by the analytical export."""
    if not isinstance(payload, dict):
        raise ValueError("Input payload must be a JSON object")
    require_keys(payload, {"meta", "cities", "counties"}, "payload")
    if not isinstance(payload["meta"], dict) or not isinstance(payload["cities"], list) or not isinstance(payload["counties"], list):
        raise ValueError("payload meta/cities/counties have unexpected types")
    require_keys(payload["meta"], {"schemaVersion", "dataThrough", "generatedAt", "capacityBasis", "sourceCapacityMw", "totalCapacityMw", "allUtilityBenchmark"}, "meta")
    for index, city in enumerate(payload["cities"]):
        if not isinstance(city, dict):
            raise ValueError(f"city[{index}] must be an object")
        require_keys(city, {"id", "name", "timeline", "utilities"}, f"city[{index}]")
        if not isinstance(city["timeline"], list) or not isinstance(city["utilities"], list):
            raise ValueError(f"city[{index}] timeline/utilities must be arrays")
    for index, county in enumerate(payload["counties"]):
        if not isinstance(county, dict):
            raise ValueError(f"county[{index}] must be an object")
        require_keys(county, {"slug", "name", "timeline", "allUtilityBenchmark"}, f"county[{index}]")
        if not isinstance(county["timeline"], list):
            raise ValueError(f"county[{index}] timeline must be an array")
    return payload


def timeline_row(point: object, identity: dict[str, str], context: str) -> dict[str, object]:
    """Build a child-table row while protecting its parent join columns."""
    if not isinstance(point, dict):
        raise ValueError(f"{context}: timeline point must be an object")
    collisions = sorted(point.keys() & identity.keys())
    if collisions:
        raise ValueError(f"{context}: timeline point overrides join fields: {', '.join(collisions)}")
    return {**point, **identity}


def write_table(rows: list[dict[str, object]], destination: Path) -> None:
    """Write a stable union-of-columns schema with Zstandard compression."""
    if not rows:
        raise ValueError(f"Cannot write empty Parquet table: {destination.name}")
    columns = sorted({column for row in rows for column in row})
    normalized = [{column: row.get(column) for column in columns} for row in rows]
    pq.write_table(pa.Table.from_pylist(normalized), destination, compression="zstd", version="2.6")


def build_assets(payload: dict[str, Any], source_bytes: bytes, destination: Path) -> None:
    """Build every release asset inside an isolated staging directory."""
    city_rows: list[dict[str, object]] = []
    city_timeline: list[dict[str, object]] = []
    for city in payload["cities"]:
        row: dict[str, object] = {}
        flatten("", city, row, skipped_lists=frozenset({"timeline", "utilities"}))
        put(row, "utilities", ", ".join(str(utility) for utility in city["utilities"]))
        city_rows.append(row)
        city_timeline.extend(timeline_row(point, {"city_id": city["id"], "city": city["name"]}, city["name"]) for point in city["timeline"])

    county_rows: list[dict[str, object]] = []
    county_timeline: list[dict[str, object]] = []
    for county in payload["counties"]:
        row = {}
        flatten("", county, row, skipped_lists=frozenset({"timeline"}))
        county_rows.append(row)
        county_timeline.extend(timeline_row(point, {"county_id": county["slug"], "county": county["name"]}, county["name"]) for point in county["timeline"])

    for filename, rows in {
        "cities.parquet": city_rows,
        "city-timeline.parquet": city_timeline,
        "counties.parquet": county_rows,
        "county-timeline.parquet": county_timeline,
    }.items():
        write_table(rows, destination / filename)

    (destination / "california-solar-atlas.json").write_bytes(source_bytes)
    metadata = {
        "schemaVersion": payload["meta"]["schemaVersion"],
        "dataThrough": payload["meta"]["dataThrough"],
        "generatedAt": payload["meta"]["generatedAt"],
        "capacityBasis": payload["meta"]["capacityBasis"],
        "iouSourceCapacityMwDc": payload["meta"]["sourceCapacityMw"],
        "matchedCityCapacityMwDc": payload["meta"]["totalCapacityMw"],
        "cecAllUtilityBenchmark": payload["meta"]["allUtilityBenchmark"],
        "cityRows": len(city_rows),
        "countyRows": len(county_rows),
        "cityTimelineRows": len(city_timeline),
        "countyTimelineRows": len(county_timeline),
        "sourceFile": "california-solar-atlas.json",
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
    }
    (destination / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    checksum_lines = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}"
        for path in sorted(destination.iterdir())
        if path.name != "SHA256SUMS"
    ]
    (destination / "SHA256SUMS").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("public/data/cities.json"))
    parser.add_argument("--output", type=Path, default=Path("dist-data"))
    args = parser.parse_args()

    source_bytes = args.input.read_bytes()
    payload = validate_payload(json.loads(source_bytes))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.exists() and any(args.output.iterdir()):
        raise RuntimeError(f"Output directory is not empty: {args.output}")
    if args.output.exists():
        args.output.rmdir()

    with tempfile.TemporaryDirectory(prefix=".atlas-release-", dir=args.output.parent) as temporary:
        staging = Path(temporary)
        build_assets(payload, source_bytes, staging)
        staging.replace(args.output)


if __name__ == "__main__":
    main()
