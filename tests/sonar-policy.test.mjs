import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { sonarPolicy } from '../scripts/sonar-policy.mjs';

const repository = 'somethingwithproof/california-solar-atlas';
const input = (branch, overrides = {}) => ({
  enabled: 'true', eventName: 'pull_request', ref: 'refs/pull/42/merge', actor: 'maintainer',
  event: { repository: { full_name: repository }, pull_request: { head: { ref: branch, repo: { full_name: repository } } } },
  ...overrides,
});

for (const branch of ['feature/accuracy', 'fix/schema', 'data/refresh', 'model/yield', 'refactor/pipeline', 'chore/deps', 'docs/guide', 'experiment/yield', 'main', 'release-candidate', 'sonarfix']) {
  test(`${branch} PR skips analysis even though its base is main`, () => {
    assert.equal(sonarPolicy(input(branch)).eligible, false);
  });
}
for (const branch of ['sonar/inspect', 'release/next']) {
  test(`${branch} same-repository PR requests analysis`, () => {
    assert.equal(sonarPolicy(input(branch)).eligible, true);
  });
  test(`${branch} fork cannot request secret-dependent analysis`, () => {
    const value = input(branch);
    value.event.pull_request.head.repo.full_name = 'contributor/fork';
    assert.equal(sonarPolicy(value).eligible, false);
  });
}
test('a deleted or missing head repository fails closed', () => {
  const value = input('sonar/check');
  value.event.pull_request.head.repo = null;
  assert.equal(sonarPolicy(value).eligible, false);
});
test('main push requests analysis; development branch pushes do not', () => {
  assert.equal(sonarPolicy(input('', { eventName: 'push', ref: 'refs/heads/main' })).eligible, true);
  assert.equal(sonarPolicy(input('', { eventName: 'push', ref: 'refs/heads/feature/accuracy' })).eligible, false);
});
for (const enabled of [undefined, '', 'false', 'TRUE']) {
  test(`disabled switch (${String(enabled)}) also prevents manual scans`, () => {
    assert.equal(sonarPolicy(input('sonar/check', { enabled })).eligible, false);
    assert.equal(sonarPolicy(input('', { enabled, eventName: 'workflow_dispatch', runSonar: 'true' })).eligible, false);
  });
}
test('manual dispatch can request any trusted repository branch', () => {
  assert.equal(sonarPolicy(input('', { eventName: 'workflow_dispatch', ref: 'refs/heads/refactor/pipeline', runSonar: 'true' })).eligible, true);
  assert.equal(sonarPolicy(input('', { eventName: 'workflow_dispatch', runSonar: 'false' })).eligible, false);
});
test('Dependabot requests skip rather than failing for unavailable secrets', () => {
  assert.equal(sonarPolicy(input('sonar/check', { actor: 'dependabot[bot]' })).eligible, false);
});
test('unsupported event is never promoted to secret-dependent analysis', () => {
  assert.equal(sonarPolicy(input('sonar/check', { eventName: 'pull_request_target' })).eligible, false);
});
test('CLI emits policy outputs without filesystem destinations', () => {
  const output = execFileSync(process.execPath, ['scripts/sonar-policy.mjs'], {
    encoding: 'utf8',
    env: {
      ENABLE_SONAR: 'true', GITHUB_EVENT_NAME: 'pull_request',
      GITHUB_REF: 'refs/pull/42/merge', GITHUB_ACTOR: 'maintainer',
      GITHUB_EVENT_JSON: JSON.stringify(input('feature/accuracy').event),
    },
  });
  assert.equal(output, 'eligible=false\nreason=Modernization branch: analysis not requested\n');
});
