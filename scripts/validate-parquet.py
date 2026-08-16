#!/usr/bin/env python3
"""Validate release assets, joins, provenance, and checksums without assertions."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

import pyarrow.parquet as pq


class ValidationError(RuntimeError):
    """Raised when a release asset violates its published contract."""


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
        check(len(parts) == 2 and len(parts[0]) == 64, f"SHA256SUMS line {line_number} is malformed")
        digest, filename = parts
        check(filename and Path(filename).name == filename and filename not in expected, f"SHA256SUMS line {line_number} has an unsafe or duplicate filename")
        expected[filename] = digest
    actual = {path.name for path in directory.iterdir() if path.is_file() and path.name != "SHA256SUMS"}
    check(set(expected) == actual, f"Checksum manifest mismatch: expected {sorted(expected)}, found {sorted(actual)}")
    for filename, digest in expected.items():
        observed = hashlib.sha256((directory / filename).read_bytes()).hexdigest()
        check(observed == digest, f"Checksum mismatch for {filename}: expected {digest}, found {observed}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path, nargs="?", default=Path("dist-data"))
    args = parser.parse_args()

    try:
        verify_checksums(args.directory)
        source_bytes = (args.directory / "california-solar-atlas.json").read_bytes()
        payload = json.loads(source_bytes)
        metadata = json.loads((args.directory / "metadata.json").read_text(encoding="utf-8"))
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
        check("load_deliveriesGwh" in cities.column_names, "City Parquet lost optional load columns")
        check("allUtilityBenchmark_capacityMwAc" in counties.column_names, "County Parquet lost the all-utility benchmark")

        expected_city_ids = {city["id"] for city in payload["cities"]}
        expected_county_ids = {county["slug"] for county in payload["counties"]}
        check(set(cities.column("id").to_pylist()) == expected_city_ids, "City Parquet IDs do not match release JSON")
        check(set(counties.column("slug").to_pylist()) == expected_county_ids, "County Parquet IDs do not match release JSON")
        city_counts = Counter(city_timeline.column("city_id").to_pylist())
        county_counts = Counter(county_timeline.column("county_id").to_pylist())
        check(city_counts == Counter({city["id"]: len(city["timeline"]) for city in payload["cities"]}), "City timeline joins or row counts are corrupted")
        check(county_counts == Counter({county["slug"]: len(county["timeline"]) for county in payload["counties"]}), "County timeline joins or row counts are corrupted")

        cec_json_total = round(sum(county["allUtilityBenchmark"]["capacityMwAc"] for county in payload["counties"]), 3)
        check(abs(cec_json_total - payload["meta"]["allUtilityBenchmark"]["statewideCapacityMwAc"]) <= 0.001, f"CEC county benchmark sum {cec_json_total} does not match statewide metadata")
    except (KeyError, OSError, ValueError, ValidationError) as error:
        raise SystemExit(f"Release validation failed: {error}") from error


if __name__ == "__main__":
    main()
