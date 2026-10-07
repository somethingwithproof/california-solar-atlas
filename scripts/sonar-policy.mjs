import { pathToFileURL } from 'node:url';

// No credentials are needed to decide whether analysis was requested.
export function sonarPolicy({ enabled, eventName, ref, actor, event, runSonar }) {
  if (enabled !== 'true') return { eligible: false, reason: 'ENABLE_SONAR is not true' };
  if (actor === 'dependabot[bot]') return { eligible: false, reason: 'Dependabot secrets are unavailable' };
  if (eventName === 'pull_request') {
    const pr = event.pull_request;
    if (!pr?.head?.repo?.full_name || pr.head.repo.full_name !== event.repository?.full_name) {
      return { eligible: false, reason: 'Fork or untrusted pull request' };
    }
    const branch = pr.head.ref || '';
    const eligible = branch.startsWith('sonar/') || branch.startsWith('release/');
    return { eligible, reason: eligible ? 'Requested PR branch' : 'Modernization branch: analysis not requested' };
  }
  if (eventName === 'push' && ref === 'refs/heads/main') {
    return { eligible: true, reason: 'Main push' };
  }
  if (eventName === 'workflow_dispatch') {
    return { eligible: runSonar === 'true', reason: runSonar === 'true' ? 'Manual request' : 'Manual analysis disabled' };
  }
  return { eligible: false, reason: 'Event is outside the analysis policy' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = sonarPolicy({
    enabled: process.env.ENABLE_SONAR,
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    actor: process.env.GITHUB_ACTOR,
    event: JSON.parse(process.env.GITHUB_EVENT_JSON),
    runSonar: process.env.RUN_SONAR,
  });
  // The workflow owns its file-command destinations; this CLI only emits data.
  console.log(`eligible=${result.eligible}`);
  console.log(`reason=${result.reason}`);
}
