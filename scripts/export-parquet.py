#!/usr/bin/env python3
"""Export the browser JSON as flat, reusable Parquet release assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import tempfile
from decimal import Decimal
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from parquet_schema import CITY_SCHEMA, CITY_TIMELINE_SCHEMA, COUNTY_SCHEMA, COUNTY_TIMELINE_SCHEMA

MAX_INPUT_BYTES = 25_000_000
INT64_MIN = -(2**63)
INT64_MAX = 2**63 - 1
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_INPUT = PROJECT_ROOT / "public" / "data" / "cities.json"
CANONICAL_OUTPUT = PROJECT_ROOT / "dist-data"
RELEASE_MARKER = "metadata.json"


def finite_number(value: object) -> bool:
    """Accept finite numeric data while rejecting booleans and nulls."""
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return INT64_MIN <= value <= INT64_MAX
    return isinstance(value, float) and math.isfinite(value)


def reject_nonfinite_json(constant: str) -> None:
    """Reject Python's non-standard NaN/Infinity JSON extensions."""
    raise ValueError(f"Non-finite JSON constant is not allowed: {constant}")


def parse_json_float(token: str) -> float:
    """Parse a JSON float without permitting float64 overflow or underflow."""
    number = float(token)
    if not math.isfinite(number) or (number == 0 and Decimal(token) != 0):
        raise ValueError(f"JSON number is outside the finite float64 range: {token}")
    return number


def validate_numeric_leaves(value: object, context: str = "payload") -> None:
    """Require every numeric JSON leaf to fit the published Arrow primitives."""
    if isinstance(value, dict):
        for key, child in value.items():
            validate_numeric_leaves(child, f"{context}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            validate_numeric_leaves(child, f"{context}[{index}]")
    elif isinstance(value, int) and not isinstance(value, bool):
        if not INT64_MIN <= value <= INT64_MAX:
            raise ValueError(f"{context}: integer is outside the int64 range")
    elif isinstance(value, float) and not math.isfinite(value):
        raise ValueError(f"{context}: number must be finite")


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


def validate_meta(meta: dict[str, Any]) -> None:
    """Validate release provenance fields before any assets are written."""
    require_keys(meta, {"schemaVersion", "dataThrough", "generatedAt", "capacityBasis", "sourceCapacityMw", "totalCapacityMw", "allUtilityBenchmark"}, "meta")
    if not isinstance(meta["schemaVersion"], int) or isinstance(meta["schemaVersion"], bool) or meta["schemaVersion"] <= 0:
        raise ValueError("meta.schemaVersion must be a positive integer")
    for field in ("dataThrough", "generatedAt", "capacityBasis"):
        if not isinstance(meta[field], str) or not meta[field].strip():
            raise ValueError(f"meta.{field} must be a non-empty string")
    if not finite_number(meta["sourceCapacityMw"]) or not finite_number(meta["totalCapacityMw"]):
        raise ValueError("meta capacity totals must be finite numeric values")
    benchmark = meta["allUtilityBenchmark"]
    if not isinstance(benchmark, dict):
        raise ValueError("meta.allUtilityBenchmark must be an object")
    require_keys(benchmark, {"year", "statewideCapacityMwAc", "basis", "sourceUrl"}, "meta.allUtilityBenchmark")
    if not isinstance(benchmark["year"], int) or isinstance(benchmark["year"], bool):
        raise ValueError("meta.allUtilityBenchmark.year must be an integer")
    if not finite_number(benchmark["statewideCapacityMwAc"]):
        raise ValueError("meta.allUtilityBenchmark.statewideCapacityMwAc must be finite")
    for field in ("basis", "sourceUrl"):
        if not isinstance(benchmark[field], str) or not benchmark[field].strip():
            raise ValueError(f"meta.allUtilityBenchmark.{field} must be a non-empty string")


def validate_payload(payload: object) -> dict[str, Any]:
    """Validate the structure required by the analytical export."""
    if not isinstance(payload, dict):
        raise ValueError("Input payload must be a JSON object")
    validate_numeric_leaves(payload)
    require_keys(payload, {"meta", "cities", "counties"}, "payload")
    if not isinstance(payload["meta"], dict) or not isinstance(payload["cities"], list) or not isinstance(payload["counties"], list):
        raise ValueError("payload meta/cities/counties have unexpected types")
    validate_meta(payload["meta"])
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
        benchmark = county["allUtilityBenchmark"]
        if not isinstance(benchmark, dict):
            raise ValueError(f"county[{index}].allUtilityBenchmark must be an object")
        require_keys(benchmark, {"year", "capacityMwAc", "basis", "sourceUrl"}, f"county[{index}].allUtilityBenchmark")
        if not finite_number(benchmark["capacityMwAc"]):
            raise ValueError(f"county[{index}].allUtilityBenchmark.capacityMwAc must be finite")
        if not isinstance(benchmark["year"], int) or isinstance(benchmark["year"], bool):
            raise ValueError(f"county[{index}].allUtilityBenchmark.year must be an integer")
        for field in ("basis", "sourceUrl"):
            if not isinstance(benchmark[field], str) or not benchmark[field].strip():
                raise ValueError(f"county[{index}].allUtilityBenchmark.{field} must be a non-empty string")
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
        missing = sorted(expected - columns)
        unexpected = sorted(columns - expected)
        details = []
        if missing:
            details.append(f"missing required columns={missing}")
        if unexpected:
            details.append(f"unexpected columns={unexpected}")
        raise ValueError(f"{destination.name}: schema columns differ: {'; '.join(details)}")
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
    (destination / "metadata.json").write_text(json.dumps(metadata, indent=2, allow_nan=False) + "\n", encoding="utf-8")  # NOSONAR

    checksum_lines = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}"
        for path in sorted(destination.iterdir())
        if path.name != "SHA256SUMS"
    ]
    (destination / "SHA256SUMS").write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    for asset in destination.iterdir():
        asset.chmod(0o644)


def prepare_output(output: Path, *, replace: bool = False) -> None:
    """Require an absent or empty directory and prepare for an atomic rename."""
    output.parent.mkdir(parents=True, exist_ok=True)
    if not output.exists():
        return
    if not output.is_dir():
        raise RuntimeError(f"Output path exists and is not a directory: {output}")
    if any(output.iterdir()):
        if not replace:
            raise RuntimeError(f"Output directory is not empty: {output} (pass --replace to overwrite a previous release)")
        # Only a directory this exporter wrote may be removed; the marker keeps
        # --replace from deleting an unrelated path someone pointed the run at.
        if not (output / RELEASE_MARKER).is_file():
            raise RuntimeError(f"Refusing to replace {output}: no {RELEASE_MARKER} from a previous release")
        shutil.rmtree(output)
        return
    try:
        output.rmdir()
    except OSError as error:
        raise RuntimeError(f"Could not prepare output directory {output}: {error}") from error


def run(input_path: Path, output_path: Path, *, replace: bool = False) -> None:
    """Run a transactional export and present source errors without a traceback."""
    input_size = input_path.stat().st_size
    if input_size <= 0 or input_size > MAX_INPUT_BYTES:
        raise ValueError(f"Input size is outside the 1–{MAX_INPUT_BYTES} byte contract: {input_size}")
    source_bytes = input_path.read_bytes()
    payload = validate_payload(
        json.loads(source_bytes, parse_constant=reject_nonfinite_json, parse_float=parse_json_float)
    )
    prepare_output(output_path, replace=replace)

    # Keeping staging under the output parent makes the final rename atomic on one filesystem.
    with tempfile.TemporaryDirectory(prefix=".atlas-release-", dir=output_path.parent) as temporary:
        staging = Path(temporary)
        build_assets(payload, source_bytes, staging)
        staging.chmod(0o755)
        staging.replace(output_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--replace", action="store_true", help="overwrite a previous release in the output directory")
    options = parser.parse_args()
    try:
        run(CANONICAL_INPUT, CANONICAL_OUTPUT, replace=options.replace)
    except (OSError, OverflowError, RuntimeError, TypeError, ValueError) as error:
        raise SystemExit(f"Release export failed: {error}") from error


if __name__ == "__main__":
    main()
