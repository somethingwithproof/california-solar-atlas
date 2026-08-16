from __future__ import annotations

import importlib.util
import hashlib
import json
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq


SCRIPT = Path(__file__).parents[1] / "scripts" / "export-parquet.py"
ROOT = SCRIPT.parents[1]
sys.path.insert(0, str(SCRIPT.parent))
SPEC = importlib.util.spec_from_file_location("export_parquet", SCRIPT)
export_parquet = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(export_parquet)
VALIDATOR_SCRIPT = Path(__file__).parents[1] / "scripts" / "validate-parquet.py"
VALIDATOR_SPEC = importlib.util.spec_from_file_location("validate_parquet", VALIDATOR_SCRIPT)
validate_parquet = importlib.util.module_from_spec(VALIDATOR_SPEC)
assert VALIDATOR_SPEC.loader is not None
VALIDATOR_SPEC.loader.exec_module(validate_parquet)


class ExportParquetTests(unittest.TestCase):
    @staticmethod
    def payload() -> dict[str, object]:
        meta = {"schemaVersion": 1, "dataThrough": "January 1, 2026", "generatedAt": "2026-01-01T00:00:00Z", "capacityBasis": "test", "sourceCapacityMw": 1, "totalCapacityMw": 1, "allUtilityBenchmark": {}}
        city = {"id": "city-1", "name": "City", "county": "County", "geoid": "0600001", "capacityMw": 1, "projects": 1, "timeline": [{"year": 2026, "mw": 1, "addedMw": 1, "projects": 1}], "utilities": []}
        county = {"slug": "county-1", "name": "County", "capacityMw": 1, "projects": 1, "timeline": [{"year": 2026, "mw": 1}], "allUtilityBenchmark": {}}
        return {"meta": meta, "cities": [city], "counties": [county]}

    @staticmethod
    def rewrite_manifest(directory: Path) -> None:
        manifest = [
            f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}"
            for path in sorted(directory.iterdir()) if path.name != "SHA256SUMS"
        ]
        (directory / "SHA256SUMS").write_text("\n".join(manifest) + "\n", encoding="utf-8")

    def assert_validation_fails(self, output: Path, source: Path, message: str) -> None:
        self.rewrite_manifest(output)
        failed = subprocess.run([sys.executable, str(VALIDATOR_SCRIPT), str(output), "--source", str(source)], cwd=ROOT, capture_output=True, text=True)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn(message, failed.stderr)

    def test_flatten_rejects_colliding_keys(self) -> None:
        target = {"load_deliveries_Gwh": 1}
        with self.assertRaisesRegex(ValueError, "collision"):
            export_parquet.flatten("load_deliveries_Gwh", 2, target)

    def test_flatten_serializes_nonrelational_lists(self) -> None:
        target: dict[str, object] = {}
        export_parquet.flatten("", {"yieldRange": [1400, 1500]}, target)
        self.assertEqual(json.loads(target["yieldRange"]), [1400, 1500])

    def test_flatten_only_skips_explicit_lists(self) -> None:
        target: dict[str, object] = {}
        export_parquet.flatten("", {"timeline": [1], "other": [2]}, target, skipped_lists=frozenset({"timeline"}))
        self.assertNotIn("timeline", target)
        self.assertEqual(json.loads(target["other"]), [2])

    def test_timeline_identity_cannot_be_overwritten(self) -> None:
        with self.assertRaisesRegex(ValueError, "join fields"):
            export_parquet.timeline_row({"year": 2026, "city_id": "wrong"}, {"city_id": "right"}, "test")
        self.assertEqual(export_parquet.timeline_row({"year": 2026}, {"city_id": "right"}, "test"), {"year": 2026, "city_id": "right"})

    def test_payload_validation_reports_missing_sections(self) -> None:
        with self.assertRaisesRegex(ValueError, "missing required fields"):
            export_parquet.validate_payload({"meta": {}})

    def test_payload_validation_rejects_duplicate_join_keys(self) -> None:
        payload = self.payload()
        payload["cities"].append(dict(payload["cities"][0]))
        with self.assertRaisesRegex(ValueError, "City IDs must be unique"):
            export_parquet.validate_payload(payload)

    def test_payload_validation_rejects_empty_or_malformed_timelines(self) -> None:
        payload = self.payload()
        payload["cities"][0]["timeline"] = []
        with self.assertRaisesRegex(ValueError, "1–200"):
            export_parquet.validate_payload(payload)
        payload = self.payload()
        payload["cities"][0]["timeline"][0]["addedMw"] = None
        with self.assertRaisesRegex(ValueError, "null"):
            export_parquet.validate_payload(payload)
        payload = self.payload()
        payload["counties"][0]["timeline"][0]["mw"] = "1"
        with self.assertRaisesRegex(ValueError, "nonnumeric"):
            export_parquet.validate_payload(payload)
        payload = self.payload()
        payload["cities"][0]["projects"] = True
        with self.assertRaisesRegex(ValueError, "unexpected types"):
            export_parquet.validate_payload(payload)

    def test_payload_validation_rejects_missing_core_field(self) -> None:
        payload = self.payload()
        del payload["cities"][0]["capacityMw"]
        with self.assertRaisesRegex(ValueError, "capacityMw"):
            export_parquet.validate_payload(payload)
        payload = self.payload()
        payload["counties"][0]["timeline"] = ["not an object"]
        with self.assertRaisesRegex(ValueError, "malformed"):
            export_parquet.validate_payload(payload)

    def test_write_table_rejects_empty_rows(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(ValueError, "empty Parquet"):
                export_parquet.write_table([], Path(temporary) / "empty.parquet", export_parquet.CITY_SCHEMA)

    def test_write_table_rejects_missing_and_extra_schema_fields(self) -> None:
        complete = {name: None for name in export_parquet.CITY_SCHEMA.names}
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "table.parquet"
            with self.assertRaisesRegex(ValueError, "required schema columns"):
                export_parquet.write_table([{key: value for key, value in complete.items() if key != "id"}], destination, export_parquet.CITY_SCHEMA)
            with self.assertRaisesRegex(ValueError, "Unexpected"):
                export_parquet.write_table([{**complete, "unexpected": 1}], destination, export_parquet.CITY_SCHEMA)

    def test_prepare_output_rejects_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "output"
            output.write_text("not a directory", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "not a directory"):
                export_parquet.prepare_output(output)

    def test_prepare_output_accepts_empty_directory_and_rejects_dotfiles(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "output"
            output.mkdir()
            export_parquet.prepare_output(output)
            self.assertFalse(output.exists())
            output.mkdir()
            (output / ".keep").write_text("", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "not empty"):
                export_parquet.prepare_output(output)

    def test_checksum_validation_rejects_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            asset = directory / "asset.parquet"
            asset.write_bytes(b"valid")
            digest = hashlib.sha256(asset.read_bytes()).hexdigest()
            (directory / "SHA256SUMS").write_text(f"{digest}  {asset.name}\n", encoding="utf-8")
            validate_parquet.verify_checksums(directory)
            asset.write_bytes(b"tampered")
            with self.assertRaisesRegex(validate_parquet.ValidationError, "Checksum mismatch"):
                validate_parquet.verify_checksums(directory)

    def test_checksum_validation_rejects_unsafe_and_malformed_entries(self) -> None:
        cases = [f"{'0' * 64}  ../escape", f"{'0' * 63}  asset", f"{'z' * 64}  asset", f"{'0' * 64} asset"]
        for manifest in cases:
            with self.subTest(manifest=manifest), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary)
                (directory / "SHA256SUMS").write_text(manifest + "\n", encoding="utf-8")
                with self.assertRaises(validate_parquet.ValidationError):
                    validate_parquet.verify_checksums(directory)

    def test_checksum_validation_rejects_duplicate_and_missing_entries(self) -> None:
        digest = "0" * 64
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "SHA256SUMS").write_text(f"{digest}  asset\n{digest}  asset\n", encoding="utf-8")
            with self.assertRaises(validate_parquet.ValidationError):
                validate_parquet.verify_checksums(directory)
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "SHA256SUMS").write_text(f"{digest}  missing\n", encoding="utf-8")
            (directory / "extra").write_bytes(b"extra")
            with self.assertRaisesRegex(validate_parquet.ValidationError, "manifest mismatch"):
                validate_parquet.verify_checksums(directory)

    def test_checksum_validation_rejects_directories_and_symlinks(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "SHA256SUMS").write_text("", encoding="utf-8")
            (directory / "nested").mkdir()
            with self.assertRaisesRegex(validate_parquet.ValidationError, "non-regular"):
                validate_parquet.verify_checksums(directory)
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            (directory / "SHA256SUMS").write_text("", encoding="utf-8")
            (directory / "outside-link").symlink_to(Path(temporary).parent / "outside")
            with self.assertRaisesRegex(validate_parquet.ValidationError, "non-regular"):
                validate_parquet.verify_checksums(directory)

    def test_schema_fingerprint_rejects_type_drift(self) -> None:
        fields = [pa.field(field.name, pa.float64() if field.name == "projects" else field.type) for field in export_parquet.CITY_SCHEMA]
        with self.assertRaisesRegex(validate_parquet.ValidationError, "fingerprint drifted"):
            validate_parquet.verify_schema("cities", pa.schema(fields))

    def test_schema_generator_matches_validator_pins(self) -> None:
        self.assertEqual(export_parquet.CITY_SCHEMA.names, sorted(export_parquet.CITY_SCHEMA.names))
        import parquet_schema
        self.assertEqual(parquet_schema.fingerprints(), validate_parquet.SCHEMA_FINGERPRINTS)

    def test_production_payload_round_trip_runs_both_entry_points(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "release"
            source = ROOT / "public" / "data" / "cities.json"
            subprocess.run([sys.executable, str(SCRIPT), "--input", str(source), "--output", str(output)], cwd=ROOT, check=True)
            subprocess.run([sys.executable, str(VALIDATOR_SCRIPT), str(output), "--source", str(source)], cwd=ROOT, check=True)
            self.assertEqual(stat.S_IMODE(output.stat().st_mode), 0o755)
            metadata_path = output / "metadata.json"
            original_metadata = metadata_path.read_text(encoding="utf-8")
            metadata = json.loads(original_metadata)
            metadata["matchedCityCapacityMwDc"] += 1
            metadata_path.write_text(json.dumps(metadata), encoding="utf-8")
            self.assert_validation_fails(output, source, "does not match canonical JSON")
            metadata_path.write_text(original_metadata, encoding="utf-8")
            self.rewrite_manifest(output)
            table_path = output / "cities.parquet"
            original_table = table_path.read_bytes()
            table = pq.read_table(table_path)
            capacities = table.column("capacityMw").to_pylist()
            capacities[0] += 1
            index = table.schema.get_field_index("capacityMw")
            table = table.set_column(index, table.schema.field(index), pa.array(capacities, type=pa.float64()))
            pq.write_table(table, table_path, compression="zstd", version="2.6")
            self.assert_validation_fails(output, source, "city Parquet values differ")
            table_path.write_bytes(original_table)

            county_path = output / "counties.parquet"
            original_county = county_path.read_bytes()
            table = pq.read_table(county_path)
            capacities = table.column("capacityMw").to_pylist()
            capacities[0] += 1
            index = table.schema.get_field_index("capacityMw")
            table = table.set_column(index, table.schema.field(index), pa.array(capacities, type=pa.float64()))
            pq.write_table(table, county_path, compression="zstd", version="2.6")
            self.assert_validation_fails(output, source, "county Parquet values differ")
            county_path.write_bytes(original_county)

            timeline_path = output / "city-timeline.parquet"
            original_timeline = timeline_path.read_bytes()
            table = pq.read_table(timeline_path)
            values = table.column("mw").to_pylist()
            values[0] += 1
            index = table.schema.get_field_index("mw")
            mutated = table.set_column(index, table.schema.field(index), pa.array(values, type=pa.float64()))
            pq.write_table(mutated, timeline_path, compression="zstd", version="2.6")
            self.assert_validation_fails(output, source, "City timeline values do not match")
            timeline_path.write_bytes(original_timeline)

            table = pq.read_table(timeline_path)
            identities = table.column("city_id").to_pylist()
            identities[0] = identities[26]
            index = table.schema.get_field_index("city_id")
            mutated = table.set_column(index, table.schema.field(index), pa.array(identities, type=pa.string()))
            pq.write_table(mutated, timeline_path, compression="zstd", version="2.6")
            self.assert_validation_fails(output, source, "City timeline joins or row counts are corrupted")
            timeline_path.write_bytes(original_timeline)

            table = pq.read_table(timeline_path).slice(1)
            pq.write_table(table, timeline_path, compression="zstd", version="2.6")
            self.assert_validation_fails(output, source, "City timeline rows disagree")


if __name__ == "__main__":
    unittest.main()
