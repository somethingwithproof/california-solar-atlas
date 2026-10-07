<!--
SPDX-FileCopyrightText: 2026 California Solar Atlas contributors
SPDX-License-Identifier: MIT
-->

# California Solar Atlas agent instructions

## Architecture and accuracy boundary

This is a static JavaScript data visualization built with Vite, plus Node and
Python data tooling. `src/` implements the browser application; `scripts/`
builds/validates source data, boundaries and Parquet exports; `tests/` holds
Node and Python regression suites. `public/data/` and `dist-data/` are generated
payloads, not source code to hand-edit. Read `.github/copilot-instructions.md`
for the existing scientific/modeling review rules and `docs/data-audit.md` for
accuracy limitations.

## Offline checks

Use Node 22 and Python 3.12 through `mise`, matching `.github/workflows/ci.yml`.
Prefer the commands in `package.json` and the workflow over invented targets.

```sh
mise exec node@22 -- npm ci --ignore-scripts
mise exec node@22 -- npm test
mise exec node@22 -- npm run build
mise exec node@22 -- npm audit
mise exec node@22 -- npm run test:coverage
```

For Parquet/data-release changes, install the hashed Python dependencies in an
isolated environment and reproduce CI's checks:

```sh
mise exec python@3.12 -- python -m pip install --only-binary=:all: --require-hashes -r requirements-data-release.txt
mise exec python@3.12 -- python -m unittest discover --start-directory tests --pattern 'test_*.py'
mise exec python@3.12 -- python scripts/export-parquet.py
(cd dist-data && shasum -a 256 --check SHA256SUMS)
mise exec python@3.12 -- python scripts/validate-parquet.py
```

Exports write local artifacts; data refreshes may download sources and publishing
workflows may deploy/release them. Do not dispatch those workflows for a local
check. Use `docs/ci.md` for selective Sonar and required-check guidance.

## Data and model contracts

Keep DC capacity, modeled generation, storage power/energy and grid deliveries
separate. Preserve provenance, units, missing-value/finiteness checks, positive
capacity filtering, arithmetic reconciliation and geography/utility limitations.
Do not label modeled generation as metered or merge incompatible geographic
numerators/denominators. Preserve yield uncertainty and the current degradation
assumption unless a scoped modeling change includes evidence and regression tests.

Treat JSON/rendered data as untrusted: retain escaping, HTTPS URL restrictions
and SVG validation. Preserve Parquet schema tests and SHA-256 verification;
Sonar supplements data correctness rather than replacing it. Never suppress real
source code or scanner failures to make analysis green. See `docs/ci.md` before
changing Sonar switches, workflow triggers, security checks or release permissions.

## Working rules

Select required language runtimes through `mise`. Read the checked-out manifests,
lockfiles and GitHub Actions before choosing versions or commands; do not infer
support from an old README example. Keep changes focused and preserve public
interfaces, licenses and existing correctness/security checks.

Keep credentials, customer data, `.omc/`, `.worktrees/` and generated output out
of commits. Never disable checks or suppress findings just to obtain a passing
result. Report the commands run, results and untested environments. Publishing,
deploying, modifying live systems and merging require task authorization.
