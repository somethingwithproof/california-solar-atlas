from __future__ import annotations

import importlib.util
import hashlib
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "export-parquet.py"
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


if __name__ == "__main__":
    unittest.main()
