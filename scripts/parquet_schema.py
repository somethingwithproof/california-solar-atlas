"""Versioned Arrow schemas for California Solar Atlas release tables."""

from __future__ import annotations

import pyarrow as pa


def schema(strings: list[str], integers: list[str], floats: list[str], required: frozenset[str] = frozenset()) -> pa.Schema:
    """Build a deterministic nullable schema in alphabetical field order."""
    types = {**{name: pa.string() for name in strings}, **{name: pa.int64() for name in integers}, **{name: pa.float64() for name in floats}}
    return pa.schema([pa.field(name, types[name], nullable=name not in required) for name in sorted(types)])


CITY_SCHEMA = schema(
    strings=[
        "climateZoneMethod", "coordinates", "county", "coverage_note", "coverage_status",
        "geographyRisk", "geoid", "id", "load_kind", "load_note", "load_sourceName",
        "load_sourceUrl", "name", "storageCapacityStatus", "timelineQuality", "utilities", "yieldRange",
    ],
    integers=[
        "climateZone", "housingUnits", "housingYear", "load_year", "population", "populationYear",
        "projects", "sectors_agricultural_projects", "sectors_commercial_projects", "sectors_other_projects",
        "sectors_public_projects", "sectors_residential_projects", "storageInvalidValues", "storageProjects",
        "undatedProjects",
    ],
    floats=[
        "averageSystemKw", "capacityMw", "degradationRatePct", "effectiveCapacityMw",
        "effectiveCapacityRangeMw_high", "effectiveCapacityRangeMw_low", "generationGwh_high",
        "generationGwh_low", "growth5yPct", "load_deliveriesGwh", "load_highDeliveriesGwh",
        "load_lowDeliveriesGwh", "residentialSiteHousingPct", "sectors_agricultural_mw",
        "sectors_commercial_mw", "sectors_other_mw", "sectors_public_mw", "sectors_residential_mw",
        "undatedCapacityMw",
    ],
    required=frozenset({"id", "name", "county", "capacityMw", "projects"}),
)

COUNTY_SCHEMA = schema(
    strings=["allUtilityBenchmark_basis", "allUtilityBenchmark_sourceUrl", "name", "slug"],
    integers=[
        "allUtilityBenchmark_year", "cityCount", "geographyRiskCities", "partialCities", "projects",
        "sectors_agricultural_projects", "sectors_commercial_projects", "sectors_other_projects",
        "sectors_public_projects", "sectors_residential_projects", "storageProjects", "undatedProjects",
    ],
    floats=[
        "allUtilityBenchmark_capacityMwAc", "capacityMw", "generationGwh_high", "generationGwh_low",
        "matchedCityCapacityMw", "outsideMatchedCitiesMw", "sectors_agricultural_mw",
        "sectors_commercial_mw", "sectors_other_mw", "sectors_public_mw", "sectors_residential_mw",
        "undatedCapacityMw",
    ],
    required=frozenset({"slug", "name", "capacityMw", "projects"}),
)

CITY_TIMELINE_SCHEMA = schema(
    strings=["city", "city_id"],
    integers=["projects", "year"],
    floats=["addedMw", "mw"],
    required=frozenset({"city", "city_id", "projects", "year", "addedMw", "mw"}),
)

COUNTY_TIMELINE_SCHEMA = schema(
    strings=["county", "county_id"],
    integers=["year"],
    floats=["mw"],
    required=frozenset({"county", "county_id", "year", "mw"}),
)
