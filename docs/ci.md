# CI, data integrity, and selective Sonar analysis

Scientific and data correctness take priority during the accuracy/modeling
modernization. Static analysis supplements the existing checks. A passing Sonar
gate does not establish source accuracy, geographic attribution, or model validity.

## Discovered project architecture

The application is a JavaScript ES-module static site built by Vite, using npm and
`package-lock.json`. `node:test` exercises metrics, rendering, source XML parsing,
and municipal-utility attribution. `npm test` also runs the canonical data validator.
Python/PyArrow provides Parquet export, schemas, validation and `unittest` tests.
A separate manual Python geospatial toolchain prepares POU inputs. GitHub Pages
hosts the site; GitHub Releases hosts analytical snapshots.

No repository-defined formatter, JavaScript linter, type checker, Dockerfile,
Makefile, or alternate language/build system was found. This change uses the
canonical npm/Python commands rather than inventing additional project gates.

## Workflow audit and ownership

Audit baseline: `main` at `4e90e9388eae45e7cde9dcc3006c1d1208d44370`.
The five existing workflows were inspected before changes. They remain separate
because validation, security review, publication, deployment, and source refresh
have different triggers and permission boundaries.

| Workflow | Triggers | Jobs and controls | Permissions | Cache/runtime | Concurrency and timeout |
| --- | --- | --- | --- | --- | --- |
| [ci.yml](../.github/workflows/ci.yml), **Validate application** | Every PR; manual | `validate`: Node tests, canonical-data validation, production build, `npm audit`; `validate-release-assets`: Python tests, Parquet export, SHA-256 checks, schema/provenance/source reconciliation | Read contents only | npm lockfile cache / Node 22; pip cache keyed by hashed release requirements / Python 3.12 | Cancel superseded PR/ref runs; jobs 15/20 min |
| [dependency-review.yml](../.github/workflows/dependency-review.yml), **Dependency review** | Every PR | `review`: dependency differences, fail on moderate or higher advisories | Read contents only | No dependency installation/cache needed | Cancel superseded PR runs; 10 min |
| [deploy-pages.yml](../.github/workflows/deploy-pages.yml), **Deploy California Solar Atlas** | Main push; manual | `build`: tests/data validation, Pages-specific production build; `deploy`: GitHub Pages environment | Build reads contents; deploy alone writes Pages and uses OIDC | npm cache / Node 22 | Serialize Pages runs without cancelling active deployment; 15/10 min |
| [release-data.yml](../.github/workflows/release-data.yml), **Publish analytical data release** | Main push changing canonical cities, Parquet exporter/validator/schema, release requirements, or CEC benchmark; manual | `release`: export, checksums, schema/source validation, build-provenance attestation, immutable snapshot publication; existing release cannot be overwritten | Release job alone writes contents/attestations and uses OIDC | pip cache / Python 3.12, hash-verified wheels only | Serialize requests for the same SHA, without cancelling an active publication; distinct snapshots remain independent; 30 min |
| [update-data.yml](../.github/workflows/update-data.yml), **Propose statewide data refresh** | Monthly at 10:23 UTC on the 15th; manual | `refresh`: isolated temporary downloads with HTTPS-only redirects, source aggregation, data/boundary validation, tests/build, reviewable PR | Refresh job alone writes contents/PRs; checkout credentials remain disabled until explicit authentication for push | npm cache / Node 22 | Serialize refreshes, without cancelling active downloads/PR creation; 90 min |
| [sonar.yml](../.github/workflows/sonar.yml), **Sonar analysis** | Main push; every PR (job selection below); manual | `eligibility`: explicit policy summary; `coverage`: native LCOV tests without secrets; `analysis`: official scanner and real quality gate on a fresh runner | Read contents only | npm cache / Node 22; no dependency installation in scanner job | Cancel superseded PR/ref runs; 5/15/20 min |

All Actions use full immutable commit SHAs with version comments, including the
official SonarSource scanner **v8.3.0**. Its scanner signature verification remains
enabled. Dependabot continues to monitor npm, Actions, and Python dependencies.
The existing security policy remains in [SECURITY.md](../SECURITY.md).

### Findings and decisions

- Existing npm and pip caches were already correctly scoped. No new global cache
  or cached build outputs are introduced. Sonar coverage uses the npm cache.
- All existing jobs lacked timeouts. The limits above bound hangs while allowing
  the refresh to download its large upstream files. Refresh/release jobs also
  lacked concurrency controls; these are now present.
- Pages already had concurrency, but cancelled active runs. It now keeps active
  deployments intact. GitHub's concurrency groups retain only the latest pending
  run, so intermediate pending Pages/refresh runs can coalesce; active runs finish.
- Existing permissions were already narrow: no global write grant to remove.
  Release attestations, dependency review, audit severity, hashed wheel installs,
  source reconciliation, and checkout credential restrictions are preserved.
- Validation and Pages intentionally repeat short Node tests: PR validation
  protects review, while Pages tests the actual deployed main/manual revision.
  Pages also builds with its repository-specific base path. These are not replaced
  by an artifact from another revision or an untrusted privileged `workflow_run`.
- Eligible Sonar runs repeat the short Node suite to obtain matching-revision LCOV.
  Ordinary development PRs do not incur this work. The extra isolated coverage job
  avoids executing PR tests beside a secret. It does not repeat Parquet export,
  source downloads, production builds, or vulnerability scans.
- Node and Python validation already run independently, exposing failures early.
  Publication/Pages deployment remains dependent on successful validation within
  its own workflow. Existing safety checks were not rearranged or reduced.
- A reusable workflow is not currently justified: application builds, Pages builds,
  token-free coverage, and publishing have different outputs/security contexts.
- `requirements-data-release.txt` remains hash-locked. The manually regenerated
  POU input toolchain in `requirements-pou-inputs.txt` is version-pinned but not
  hash-locked and is not installed by these workflows. Hash-locking that separate
  scientific regeneration environment remains a follow-up, not an implied control.
- Automated refresh PR runs may need maintainer approval under GitHub's current
  `GITHUB_TOKEN` event rules. Do not treat the refresh's own tests as a replacement
  for PR validation/security checks before merging.

## Which checks protect a merge?

The GitHub API audit found **no classic main branch protection** and **no required
status checks** in the active rulesets. Existing rules require PRs, prohibit
deletion/non-fast-forward updates, and request automated review. The workflows
provide first-class correctness checks, but a workflow file cannot make them
mandatory in GitHub. Repository settings were not changed.

Recommended current main rules: require the existing checks **`validate`**,
**`validate-release-assets`**, and **`review`** (select their GitHub Actions source).
`validate` includes npm tests, data validation, build, and audit;
`validate-release-assets` includes Parquet tests, SHA-256 verification, schema
fingerprints, and canonical-source integrity. Keep these exact job IDs/check names;
the workflow title “Validate application” is not a single aggregate check.
Release publication must continue to validate/attest its outputs before upload.
Do **not** require **`Sonar Quality Gate`** during modernization.

## When Sonar runs

`ENABLE_SONAR` must equal the string **`true`**. Absent, false, or other values
disable scanning, including manual scanning. Once enabled:

| Event | Eligible? |
| --- | --- |
| Push to `main` | Yes |
| Same-repository PR from `sonar/*` or `release/*` | Yes |
| PR from `feature/*`, `fix/*`, `data/*`, `model/*`, `refactor/*`, or other names | No |
| Manual dispatch with `run_sonar: true` | Yes, on the selected trusted repository branch |
| Manual dispatch with `run_sonar: false` | No |
| Fork PR, deleted/missing head repository, or Dependabot event | No secret-dependent scan |
| Other branch pushes | No workflow trigger |

PR selection uses the **source** `pull_request.head.ref`, not the base branch and
not `refs/pull/<number>/merge`. The workflow triggers on all PRs so it can report
its policy decision. Coverage and scanning use job-level conditions; an intentional
skip is a completed skipped check, not a workflow left permanently pending by
branch/path filters. The **Sonar eligibility** summary gives the reason.

Policy lives in [scripts/sonar-policy.mjs](../scripts/sonar-policy.mjs), with
[regression tests](../tests/sonar-policy.test.mjs). The scanner job independently
checks enablement, actor, and repository identity before accessing its secret.

## Configure the existing SonarCloud project

The public SonarCloud API confirmed this project (not an invented placeholder):

- Project key: `somethingwithproof_california-solar-atlas`
- Organization: `somethingwithproof`
- [Dashboard](https://sonarcloud.io/dashboard?id=somethingwithproof_california-solar-atlas)

The API also reported **Automatic Analysis enabled**. Disable it in SonarCloud
**Administration → Analysis Method** when adopting CI analysis; otherwise external
automatic scans can bypass this branch policy, and CI analysis may be rejected.
No Sonar settings or GitHub variables/secrets were changed by this implementation.

In GitHub **Settings → Secrets and variables → Actions**, configure:

| Kind | Name | Value/meaning |
| --- | --- | --- |
| Repository secret | `SONAR_TOKEN` | Token authorized to analyze the existing project; never commit or echo it |
| Repository variable | `ENABLE_SONAR` | `true` to enable the branch/manual rules; absent/false skips |
| Optional variable | `SONAR_PLATFORM` | `cloud` (default) or `server` |
| Optional variable | `SONAR_HOST_URL` | HTTPS server URL; default cloud destination is `https://sonarcloud.io` |
| Optional variable | `SONAR_PROJECT_KEY` | Override the verified existing project key; required for `server` |
| Optional variable | `SONAR_ORGANIZATION` | Override the verified cloud organization; omitted for `server` |

For self-hosted SonarQube, set `SONAR_PLATFORM=server`, the real
`SONAR_HOST_URL`, and the real `SONAR_PROJECT_KEY`; do not reuse the cloud key by
accident. The runner must reach the server, trust its HTTPS certificate, and have
an edition/license that supports the requested PR/branch analysis. Organization
is removed from server configuration. No self-hosted instance was discovered.

No token is currently configured in this repository. If an eligible scan is
requested without it, **Sonar Quality Gate fails with a clear configuration error**.
Authentication, scanner, server-processing and quality-gate failures remain visible.
An eligible run with failed coverage also fails the gate job explicitly, rather
than leaving it skipped because its dependency failed.
There is no blanket `continue-on-error` and no score-driven source exclusions.
The scanner waits up to five minutes for the gate (`sonar.qualitygate.wait=true`);
its job is optional for merging, not artificially successful.

### Manual run

After the workflow has reached the default branch, select **Actions → Sonar
analysis → Run workflow**, choose a reviewed repository branch, and leave
`run_sonar` checked. Or:

```bash
gh workflow run sonar.yml --ref sonar/inspect --field run_sonar=true
```

Dispatch is for a trusted repository branch, not arbitrary fork code. It analyzes
that branch and does not impersonate a PR-required check. Do not dispatch publishing,
Pages, or source-refresh workflows just to obtain analysis.

## Scope, coverage, and untrusted PRs

[sonar-project.properties](../sonar-project.properties) analyzes all first-party
code in `src/`, `scripts/`, and `vite.config.js`, classifying JavaScript/Python files in `tests/` as
tests. Generated data, vendor/dependency directories, build outputs and Python
bytecode are excluded. Canonical JSON and multi-megabyte data payloads stay under
the dedicated data-integrity validators rather than being scored as source code.

```bash
npm ci --ignore-scripts
npm test
npm run test:coverage  # coverage/lcov.info, using the existing node:test suite
npm run build
npm audit
```

Native Node 22 LCOV coverage includes executable `src/**` and `scripts/**` files
loaded by the tests, not test code or dependencies. There is no synthetic minimum
percentage. Files not exercised by Node tests (including browser startup and the
full source-download builders) remain in Sonar's source scope; the loaded-files
coverage summary is not whole-repository coverage. Python is statically analyzed;
Python coverage is not currently generated or claimed. The existing Python tests
continue in correctness CI, independent of Sonar.

Normal tests, Parquet checks and dependency review still run for fork PRs. Forks
and Dependabot cannot access Sonar credentials. There is no `pull_request_target`
or privileged `workflow_run`. Token-free coverage runs on a different runner from
analysis. The latter downloads only LCOV from its own workflow run and invokes the
SHA-pinned official scanner; it never installs packages or executes repository
tests with the token. `SONAR_TOKEN` is scoped to the scanner step only. Same-repo
analysis branches must be maintained by trusted repository writers; a branch name
does not by itself authorize executing someone else's code with a secret.

Optional Sonar Software Composition Analysis (SCA) is disabled because it can
invoke project build tools during scanning. Dependency review and the existing
strict `npm audit` remain the dependency/security controls, outside the Sonar-secret
job. No existing SCA control is removed: the prior Automatic Analysis integration
does not support Sonar SCA. Static source/security rules and the quality gate stay
enabled; this setting is about credential isolation, not hiding findings.

## Troubleshooting

- **Unexpected skip:** inspect the Sonar eligibility summary, the exact
  `ENABLE_SONAR=true` value, PR source branch, actor, and fork status. For ordinary
  modernization branches, use manual dispatch on a reviewed repository branch.
- **Missing token:** configure `SONAR_TOKEN` before enabling an eligible run.
  Missing credentials fail explicitly; a disabled switch skips without reading them.
- **CI analysis rejected:** disable SonarCloud Automatic Analysis in the existing
  project's Analysis Method settings. Verify the project key/organization/token.
- **Scanner or gate failure:** inspect the failing scanner step and Sonar dashboard.
  Authentication/configuration errors, a processing timeout, and a real failed
  gate require different fixes. Do not suppress them or exclude valid source.
- **Missing LCOV:** the coverage job must succeed and upload `sonar-lcov` from the
  same workflow run. Run `npm run test:coverage` locally and inspect its `SF:` paths.
  Empty/missing uploads are errors; Python coverage is not expected in this setup.
- **Manual workflow unavailable:** first land the workflow on the default branch.
  Manual scans cannot replace eligible PR-required status checks.

## Promote the gate after architecture stabilizes

1. Keep correctness/security checks required; settle source/model validation first.
2. Broaden the same-repository PR predicate in `sonarPolicy` to include all trusted
   PR source branches, retaining fork/Dependabot guards. Update the policy tests.
   Remove the modernization-only branch restriction, not source files from analysis.
3. Set `ENABLE_SONAR=true`, confirm Automatic Analysis is disabled, and verify
   actual successful and failing scans on main and ordinary trusted PRs.
4. Add the exact GitHub Actions check **`Sonar Quality Gate`** to main's required
   status checks. Keep **`validate`**, **`validate-release-assets`**, and **`review`**.
   Do not require the entire optional workflow or a manual-dispatch result.
5. Document the intentional fork/Dependabot exemption: GitHub treats skipped jobs
   as successful for required-check purposes. For changes requiring a secret-backed
   scan, have a maintainer review and promote them to a trusted repository branch
   and PR before merging. Never expose secrets to fork code to enforce a gate.

Adding the required check alone would still accept intentionally skipped branch
jobs. Broadening policy and keeping enablement active are essential to making the
gate meaningful. If later policy must reject **every** skipped scan, add an explicit
fail-closed aggregate check with a reviewed fork process before requiring it; do
not weaken the current trust boundary.

## Validation and operational limits

Local verification uses Node 22 and Python 3.12 via `mise`, matching CI. The Python
environment installs the unchanged hash-locked wheel requirements. Run the same
Parquet sequence as CI:

```bash
python -m pip install --only-binary=:all: --require-hashes -r requirements-data-release.txt
python -m unittest discover --start-directory tests --pattern 'test_*.py'
python scripts/export-parquet.py
(cd dist-data && sha256sum --check SHA256SUMS)
python scripts/validate-parquet.py
```

On macOS, `shasum -a 256 --check SHA256SUMS` is the equivalent checksum command.
For repeat local exports use a fresh output directory or the exporter's reviewed
`--replace` path; CI starts with a clean checkout. Actions syntax/security can be
checked with `actionlint` and `zizmor .github/workflows`.

No live scanner, GitHub dispatch, data refresh, release publication, or deployment
is used to validate this change. Completing Sonar setup and observing the first
eligible CI scan remain maintainer steps; local policy tests cannot prove remote
authentication, server edition support, quality-gate configuration, or LCOV import.

Official references:
[GitHub PR/dispatch event semantics](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[SonarSource scan action](https://github.com/SonarSource/sonarqube-scan-action),
[CI/Automatic Analysis conflict](https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/overview-of-integrated-cis),
[Sonar SCA build-tool behavior](https://docs.sonarsource.com/sonarqube-cloud/advanced-security/analyzing-projects-for-dependencies-sca),
[native Node test coverage](https://r2.nodejs.org/docs/latest-jod/api/test.html#collecting-code-coverage).
