#!/usr/bin/env python3
"""Validate release assets, joins, provenance, and checksums without assertions."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import string
from collections import Counter
from decimal import Decimal
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq

MAX_INPUT_BYTES = 25_000_000
SCHEMA_FINGERPRINTS = {
    "cities": "eeef828f843a8a8f5fd5a0c3ecaa549643891b0c053590d67578a2caba464d93",
    "counties": "092fb7de223913f9b3254e21f416c9a3aa65f0733bee7a50c957227912b51c5d",
    "city-timeline": "03e6cd91136514c8095f21aecde208cef7b4e25631d23ccd7a39b081288c5072",
    "county-timeline": "8963492a078505d552462ff66154c311459f5597810b62ea122fdfa037b9649e",
}
METADATA_KEYS = {
    "schemaVersion", "dataThrough", "generatedAt", "capacityBasis", "iouSourceCapacityMwDc",
    "matchedCityCapacityMwDc", "cecAllUtilityBenchmark", "cityRows", "countyRows",
    "cityTimelineRows", "countyTimelineRows", "sourceFile", "sourceSha256",
}


class ValidationError(RuntimeError):
    """Raised when a release asset violates its published contract."""


def reject_nonfinite_json(constant: str) -> None:
    """Reject Python's non-standard NaN/Infinity JSON extensions."""
    raise ValidationError(f"Non-finite JSON constant is not allowed: {constant}")


def parse_json_float(token: str) -> float:
    """Parse a JSON float without permitting float64 overflow or underflow."""
    number = float(token)
    if not math.isfinite(number) or (number == 0 and Decimal(token) != 0):
        raise ValidationError(f"JSON number is outside the finite float64 range: {token}")
    return number


def check(condition: bool, message: str) -> None:
    """Raise an explicit error even when Python optimization is enabled."""
    if not condition:
        raise ValidationError(message)


def verify_checksums(directory: Path) -> None:
    """Require a complete manifest and verify every release asset byte-for-byte."""
    manifest_path = directory / "SHA256SUMS"
    check(manifest_path.is_file(), "SHA256SUMS is missing")
    expected: dict[str, str] = {}
    for line_number, line in enumerate(manifest_path.read_text(encoding="utf-8").splitlines(), 1):
        parts = line.split("  ", 1)
        check(len(parts) == 2 and len(parts[0]) == 64 and all(character in string.hexdigits for character in parts[0]), f"SHA256SUMS line {line_number} is malformed")
        digest, filename = parts
        check(filename and Path(filename).name == filename and filename not in expected, f"SHA256SUMS line {line_number} has an unsafe or duplicate filename")
        expected[filename] = digest
    entries = list(os.scandir(directory))
    for entry in entries:
        check(entry.is_file(follow_symlinks=False), f"Release contains a non-regular file: {entry.name}")
    actual = {entry.name for entry in entries if entry.name != "SHA256SUMS"}
    check(set(expected) == actual, f"Checksum manifest mismatch: expected {sorted(expected)}, found {sorted(actual)}")
    for filename, digest in expected.items():
        observed = hashlib.sha256((directory / filename).read_bytes()).hexdigest()
        check(observed == digest, f"Checksum mismatch for {filename}: expected {digest}, found {observed}")


def verify_schema(name: str, schema: pa.Schema) -> None:
    """Pin the public wire types independently from the exporter schema module."""
    canonical = "\n".join(f"{field.name}:{field.type}:{'nullable' if field.nullable else 'required'}" for field in schema)
    observed = hashlib.sha256(canonical.encode()).hexdigest()
    check(observed == SCHEMA_FINGERPRINTS[name], f"{name} Parquet schema fingerprint drifted: {observed}")


def verify_required_columns(table: pa.Table, name: str) -> None:
    """Verify that every field published as required contains no null values."""
    for field in table.schema:
        if not field.nullable:
            check(table.column(field.name).null_count == 0, f"{name}.{field.name} is required but contains null values")


def flatten_expected(prefix: str, value: object, target: dict[str, object], skipped: frozenset[str]) -> None:
    """Independently reconstruct the documented flat row from canonical JSON."""
    if isinstance(value, dict):
        for key, child in value.items():
            flatten_expected(f"{prefix}_{key}" if prefix else key, child, target, skipped)
    elif isinstance(value, list):
        if prefix not in skipped:
            check(prefix not in target, f"Expected-row flattened key collision: {prefix}")
            target[prefix] = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    else:
        check(prefix and prefix not in target, f"Expected-row flattened key collision: {prefix}")
        target[prefix] = value


def expected_rows(items: list[dict[str, object]], schema_names: list[str], skipped: frozenset[str]) -> list[dict[str, object]]:
    """Create schema-normalized expected rows without invoking exporter code."""
    rows = []
    for item in items:
        row: dict[str, object] = {}
        flatten_expected("", item, row, skipped)
        rows.append({name: row.get(name) for name in schema_names})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path, nargs="?", default=Path("dist-data"))
    parser.add_argument("--source", type=Path, default=Path("public/data/cities.json"))
    args = parser.parse_args()

    try:
        verify_checksums(args.directory)
        source_size = args.source.stat().st_size
        check(0 < source_size <= MAX_INPUT_BYTES, f"Canonical source size is outside the 1–{MAX_INPUT_BYTES} byte contract: {source_size}")
        source_bytes = args.source.read_bytes()
        release_bytes = (args.directory / "california-solar-atlas.json").read_bytes()
        check(release_bytes == source_bytes, "Release JSON does not exactly match the canonical source")
        payload = json.loads(
            source_bytes,
            parse_constant=reject_nonfinite_json,
            parse_float=parse_json_float,
        )
        check(isinstance(payload, dict), "Canonical source root must be an object")
        check(isinstance(payload.get("meta"), dict), "Canonical source meta must be an object")
        check(isinstance(payload.get("cities"), list), "Canonical source cities must be an array")
        check(isinstance(payload.get("counties"), list), "Canonical source counties must be an array")
        metadata = json.loads(
            (args.directory / "metadata.json").read_text(encoding="utf-8"),
            parse_constant=reject_nonfinite_json,
            parse_float=parse_json_float,
        )
        check(isinstance(metadata, dict) and set(metadata) == METADATA_KEYS, f"Metadata fields drifted: {sorted(metadata) if isinstance(metadata, dict) else type(metadata).__name__}")
        cities = pq.read_table(args.directory / "cities.parquet")
        counties = pq.read_table(args.directory / "counties.parquet")
        city_timeline = pq.read_table(args.directory / "city-timeline.parquet")
        county_timeline = pq.read_table(args.directory / "county-timeline.parquet")

        expected_city_rows = len(payload["cities"])
        expected_county_rows = len(payload["counties"])
        expected_city_timeline_rows = sum(len(city["timeline"]) for city in payload["cities"])
        expected_county_timeline_rows = sum(len(county["timeline"]) for county in payload["counties"])
        check(cities.num_rows == metadata["cityRows"] == expected_city_rows, f"City rows disagree: parquet={cities.num_rows}, metadata={metadata['cityRows']}, JSON={expected_city_rows}")
        check(counties.num_rows == metadata["countyRows"] == expected_county_rows, f"County rows disagree: parquet={counties.num_rows}, metadata={metadata['countyRows']}, JSON={expected_county_rows}")
        check(city_timeline.num_rows == metadata["cityTimelineRows"] == expected_city_timeline_rows, f"City timeline rows disagree: parquet={city_timeline.num_rows}, metadata={metadata['cityTimelineRows']}, JSON={expected_city_timeline_rows}")
        check(county_timeline.num_rows == metadata["countyTimelineRows"] == expected_county_timeline_rows, f"County timeline rows disagree: parquet={county_timeline.num_rows}, metadata={metadata['countyTimelineRows']}, JSON={expected_county_timeline_rows}")

        check(metadata["sourceFile"] == "california-solar-atlas.json", "Metadata source filename drifted")
        check(metadata["sourceSha256"] == hashlib.sha256(source_bytes).hexdigest(), "Metadata source digest does not match release JSON")
        check(metadata["schemaVersion"] == payload["meta"]["schemaVersion"], "Metadata schema version does not match release JSON")
        check(metadata["cecAllUtilityBenchmark"] == payload["meta"]["allUtilityBenchmark"], "Metadata CEC benchmark does not match release JSON")
        for metadata_key, source_key in {
            "dataThrough": "dataThrough",
            "generatedAt": "generatedAt",
            "capacityBasis": "capacityBasis",
            "iouSourceCapacityMwDc": "sourceCapacityMw",
            "matchedCityCapacityMwDc": "totalCapacityMw",
        }.items():
            check(metadata[metadata_key] == payload["meta"][source_key], f"Metadata {metadata_key} does not match canonical JSON")
        check("load_deliveriesGwh" in cities.column_names, "City Parquet lost optional load columns")
        check("allUtilityBenchmark_capacityMwAc" in counties.column_names, "County Parquet lost the all-utility benchmark")
        verify_schema("cities", cities.schema)
        verify_schema("counties", counties.schema)
        verify_schema("city-timeline", city_timeline.schema)
        verify_schema("county-timeline", county_timeline.schema)
        verify_required_columns(cities, "cities")
        verify_required_columns(counties, "counties")
        verify_required_columns(city_timeline, "city-timeline")
        verify_required_columns(county_timeline, "county-timeline")

        expected_city_ids = Counter(city["id"] for city in payload["cities"])
        expected_county_ids = Counter(county["slug"] for county in payload["counties"])
        check(all(isinstance(key, str) and key and count == 1 for key, count in expected_city_ids.items()), "Canonical city IDs must be unique non-empty strings")
        check(all(isinstance(key, str) and key and count == 1 for key, count in expected_county_ids.items()), "Canonical county slugs must be unique non-empty strings")
        check(Counter(cities.column("id").to_pylist()) == expected_city_ids, "City Parquet IDs do not match canonical JSON")
        check(Counter(counties.column("slug").to_pylist()) == expected_county_ids, "County Parquet IDs do not match canonical JSON")
        check(cities.to_pylist() == expected_rows(payload["cities"], cities.schema.names, frozenset({"timeline"})), "One or more city Parquet values differ from canonical JSON")
        check(counties.to_pylist() == expected_rows(payload["counties"], counties.schema.names, frozenset({"timeline"})), "One or more county Parquet values differ from canonical JSON")
        city_counts = Counter(city_timeline.column("city_id").to_pylist())
        county_counts = Counter(county_timeline.column("county_id").to_pylist())
        expected_city_timeline_counts = Counter()
        expected_county_timeline_counts = Counter()
        for city in payload["cities"]:
            expected_city_timeline_counts[city["id"]] += len(city["timeline"])
        for county in payload["counties"]:
            expected_county_timeline_counts[county["slug"]] += len(county["timeline"])
        check(city_counts == expected_city_timeline_counts, "City timeline joins or row counts are corrupted")
        check(county_counts == expected_county_timeline_counts, "County timeline joins or row counts are corrupted")
        expected_city_timeline = Counter(
            (city["id"], city["name"], point["year"], point["mw"], point["addedMw"], point["projects"])
            for city in payload["cities"] for point in city["timeline"]
        )
        observed_city_timeline = Counter(
            (row["city_id"], row["city"], row["year"], row["mw"], row["addedMw"], row["projects"])
            for row in city_timeline.to_pylist()
        )
        expected_county_timeline = Counter(
            (county["slug"], county["name"], point["year"], point["mw"])
            for county in payload["counties"] for point in county["timeline"]
        )
        observed_county_timeline = Counter(
            (row["county_id"], row["county"], row["year"], row["mw"])
            for row in county_timeline.to_pylist()
        )
        check(observed_city_timeline == expected_city_timeline, "City timeline values do not match canonical JSON")
        check(observed_county_timeline == expected_county_timeline, "County timeline values do not match canonical JSON")

        cec_json_total = round(sum(county["allUtilityBenchmark"]["capacityMwAc"] for county in payload["counties"]), 3)
        check(abs(cec_json_total - payload["meta"]["allUtilityBenchmark"]["statewideCapacityMwAc"]) <= 0.001, f"CEC county benchmark sum {cec_json_total} does not match statewide metadata")
        cec_parquet_total = round(sum(counties.column("allUtilityBenchmark_capacityMwAc").to_pylist()), 3)
        check(abs(cec_parquet_total - payload["meta"]["allUtilityBenchmark"]["statewideCapacityMwAc"]) <= 0.001, f"CEC Parquet benchmark sum {cec_parquet_total} does not match statewide metadata")
    except (KeyError, OSError, OverflowError, TypeError, ValueError, ValidationError) as error:
        raise SystemExit(f"Release validation failed: {error}") from error


if __name__ == "__main__":
    main()
