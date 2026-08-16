#!/usr/bin/env python3
"""Export the browser JSON as flat, reusable Parquet release assets."""

from __future__ import annotations

import hashlib
import json
import math
import tempfile
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from parquet_schema import CITY_SCHEMA, CITY_TIMELINE_SCHEMA, COUNTY_SCHEMA, COUNTY_TIMELINE_SCHEMA

MAX_INPUT_BYTES = 25_000_000
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_INPUT = PROJECT_ROOT / "public" / "data" / "cities.json"
CANONICAL_OUTPUT = PROJECT_ROOT / "dist-data"


def finite_number(value: object) -> bool:
    """Accept finite numeric data while rejecting booleans and nulls."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


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
        require_keys(city, {"id", "name", "county", "geoid", "capacityMw", "projects", "timeline", "utilities"}, f"city[{index}]")
        if not isinstance(city["timeline"], list) or not isinstance(city["utilities"], list):
            raise ValueError(f"city[{index}] timeline/utilities must be arrays")
        if not isinstance(city["id"], str) or not city["id"] or not isinstance(city["name"], str) or not city["name"]:
            raise ValueError(f"city[{index}] id/name must be non-empty strings")
        if not isinstance(city["county"], str) or not city["county"] or (city["geoid"] is not None and (not isinstance(city["geoid"], str) or not city["geoid"])):
            raise ValueError(f"city[{index}] county must be a non-empty string and geoid must be null or a non-empty string")
        if not finite_number(city["capacityMw"]) or not isinstance(city["projects"], int) or isinstance(city["projects"], bool):
            raise ValueError(f"city[{index}] capacityMw/projects have unexpected types")
        if not all(isinstance(utility, str) for utility in city["utilities"]):
            raise ValueError(f"city[{index}] utilities must contain only strings")
        if not 0 < len(city["timeline"]) <= 200:
            raise ValueError(f"city[{index}] timeline must contain 1–200 points")
        for point_index, point in enumerate(city["timeline"]):
            if not isinstance(point, dict) or not {"year", "mw", "addedMw", "projects"} <= point.keys():
                raise ValueError(f"city[{index}].timeline[{point_index}] is malformed")
            if not isinstance(point["year"], int) or isinstance(point["year"], bool) or not isinstance(point["projects"], int) or isinstance(point["projects"], bool) or not finite_number(point["mw"]) or not finite_number(point["addedMw"]):
                raise ValueError(f"city[{index}].timeline[{point_index}] contains null, boolean, nonnumeric, or non-finite values")
    for index, county in enumerate(payload["counties"]):
        if not isinstance(county, dict):
            raise ValueError(f"county[{index}] must be an object")
        require_keys(county, {"slug", "name", "capacityMw", "projects", "timeline", "allUtilityBenchmark"}, f"county[{index}]")
        if not isinstance(county["timeline"], list):
            raise ValueError(f"county[{index}] timeline must be an array")
        if not isinstance(county["slug"], str) or not county["slug"] or not isinstance(county["name"], str) or not county["name"]:
            raise ValueError(f"county[{index}] slug/name must be non-empty strings")
        if not finite_number(county["capacityMw"]) or not isinstance(county["projects"], int) or isinstance(county["projects"], bool):
            raise ValueError(f"county[{index}] capacityMw/projects have unexpected types")
        if not 0 < len(county["timeline"]) <= 200:
            raise ValueError(f"county[{index}] timeline must contain 1–200 points")
        for point_index, point in enumerate(county["timeline"]):
            if not isinstance(point, dict) or not {"year", "mw"} <= point.keys():
                raise ValueError(f"county[{index}].timeline[{point_index}] is malformed")
            if not isinstance(point["year"], int) or isinstance(point["year"], bool) or not finite_number(point["mw"]):
                raise ValueError(f"county[{index}].timeline[{point_index}] contains null, boolean, nonnumeric, or non-finite values")
    if len(payload["cities"]) > 1_000 or len(payload["counties"]) > 100:
        raise ValueError("Entity count exceeds the bounded California dataset contract")
    city_ids = [city["id"] for city in payload["cities"]]
    county_ids = [county["slug"] for county in payload["counties"]]
    if len(set(city_ids)) != len(city_ids):
        raise ValueError("City IDs must be unique")
    if len(set(county_ids)) != len(county_ids):
        raise ValueError("County slugs must be unique")
    return payload


def timeline_row(point: object, identity: dict[str, str], context: str) -> dict[str, object]:
    """Build a child-table row while protecting its parent join columns."""
    if not isinstance(point, dict):
        raise ValueError(f"{context}: timeline point must be an object")
    collisions = sorted(point.keys() & identity.keys())
    if collisions:
        raise ValueError(f"{context}: timeline point overrides join fields: {', '.join(collisions)}")
    return {**point, **identity}


def write_table(rows: list[dict[str, object]], destination: Path, arrow_schema: pa.Schema) -> None:
    """Write a stable union-of-columns schema with Zstandard compression."""
    if not rows:
        raise ValueError(f"Cannot write empty Parquet table: {destination.name}")
    columns = {column for row in rows for column in row}
    expected = set(arrow_schema.names)
    if columns != expected:
        raise ValueError(f"{destination.name}: no row supplies required schema columns {sorted(expected - columns)}; restore the source field or intentionally revise the schema. Unexpected columns={sorted(columns - expected)}")
    normalized = [{column: row.get(column) for column in arrow_schema.names} for row in rows]
    pq.write_table(pa.Table.from_pylist(normalized, schema=arrow_schema), destination, compression="zstd", version="2.6")


def build_assets(payload: dict[str, Any], source_bytes: bytes, destination: Path) -> None:
    """Build every release asset inside an isolated staging directory."""
    city_rows: list[dict[str, object]] = []
    city_timeline: list[dict[str, object]] = []
    for city in payload["cities"]:
        row: dict[str, object] = {}
        flatten("", city, row, skipped_lists=frozenset({"timeline"}))
        city_rows.append(row)
        city_timeline.extend(timeline_row(point, {"city_id": city["id"], "city": city["name"]}, city["name"]) for point in city["timeline"])

    county_rows: list[dict[str, object]] = []
    county_timeline: list[dict[str, object]] = []
    for county in payload["counties"]:
        row = {}
        flatten("", county, row, skipped_lists=frozenset({"timeline"}))
        county_rows.append(row)
        county_timeline.extend(timeline_row(point, {"county_id": county["slug"], "county": county["name"]}, county["name"]) for point in county["timeline"])

    for filename, rows, arrow_schema in [
        ("cities.parquet", city_rows, CITY_SCHEMA),
        ("city-timeline.parquet", city_timeline, CITY_TIMELINE_SCHEMA),
        ("counties.parquet", county_rows, COUNTY_SCHEMA),
        ("county-timeline.parquet", county_timeline, COUNTY_TIMELINE_SCHEMA),
    ]:
        write_table(rows, destination / filename, arrow_schema)

    # The destination is a fixed staging directory and the filename is a literal;
    # validated source bytes cannot influence either path.
    (destination / "california-solar-atlas.json").write_bytes(source_bytes)  # NOSONAR
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
    # Metadata values affect file contents only; the release path is fixed above.
    (destination / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")  # NOSONAR

    checksum_lines = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}"
        for path in sorted(destination.iterdir())
        if path.name != "SHA256SUMS"
    ]
    (destination / "SHA256SUMS").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")


def prepare_output(output: Path) -> None:
    """Require an absent or empty directory and prepare for an atomic rename."""
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.exists():
        return
    if not output.is_dir():
        raise RuntimeError(f"Output path exists and is not a directory: {output}")
    if any(output.iterdir()):
        raise RuntimeError(f"Output directory is not empty: {output}")
    try:
        output.rmdir()
    except OSError as error:
        raise RuntimeError(f"Could not prepare output directory {output}: {error}") from error


def run(input_path: Path, output_path: Path) -> None:
    """Run a transactional export and present source errors without a traceback."""
    input_size = input_path.stat().st_size
    if input_size <= 0 or input_size > MAX_INPUT_BYTES:
        raise ValueError(f"Input size is outside the 1–{MAX_INPUT_BYTES} byte contract: {input_size}")
    source_bytes = input_path.read_bytes()
    payload = validate_payload(json.loads(source_bytes))
    prepare_output(output_path)

    # Keeping staging under the output parent makes the final rename atomic on one filesystem.
    with tempfile.TemporaryDirectory(prefix=".atlas-release-", dir=output_path.parent) as temporary:
        staging = Path(temporary)
        build_assets(payload, source_bytes, staging)
        staging.chmod(0o755)
        staging.replace(output_path)


def main() -> None:
    try:
        run(CANONICAL_INPUT, CANONICAL_OUTPUT)
    except (OSError, RuntimeError, TypeError, ValueError) as error:
        raise SystemExit(f"Release export failed: {error}") from error


if __name__ == "__main__":
    main()
