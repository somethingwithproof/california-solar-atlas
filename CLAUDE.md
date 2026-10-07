<!--
SPDX-FileCopyrightText: 2026 California Solar Atlas contributors
SPDX-License-Identifier: MIT
-->

# california-solar-atlas coding guide

Read [AGENTS.md](AGENTS.md) before making changes. It contains the repository's
architecture, canonical commands, supported boundaries and operating rules.
Follow any applicable nested instructions and the checked-out CI configuration.

## Project priorities

Review units/provenance, fail-closed validation, geographic comparability, modeled-vs-metered claims and rendering safety.

## Verification

Node tests/build/audit plus Python Parquet, schema and SHA-256 checks for affected data paths.

Separate offline checks from operations that change hosts, databases, firewalls
or published artifacts. State verification limits and preserve existing controls.
Select language runtimes through `mise`; never commit local session state or secrets.
