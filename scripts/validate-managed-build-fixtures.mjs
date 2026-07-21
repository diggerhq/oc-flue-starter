import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(root, 'test', 'fixtures', 'managed-build');
const failureRoot = join(fixtureRoot, 'npm-ci-lock-mismatch');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const packageJson = readJson(join(root, 'package.json'));
const packageLock = readJson(join(root, 'package-lock.json'));
const projection = readJson(join(fixtureRoot, 'success.projection.json'));
const artifactGolden = readJson(join(fixtureRoot, 'success.artifact.json'));
const manifest = readFileSync(join(root, 'agent.toml'), 'utf8');
const agentSource = readFileSync(join(root, 'src', 'agents', 'support-triage.ts'), 'utf8');

const manifestValue = (source, key) => {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
  assert.ok(match, `agent.toml must define ${key}`);
  return match[1];
};

const entrypoint = manifestValue(manifest, 'name');
const model = manifestValue(manifest, 'model');

assert.equal(packageJson.engines.node, '>=22.19');
assert.equal(packageJson.packageManager, 'npm@10.9.3');
assert.equal(packageJson.devDependencies['@flue/cli'], '1.0.0-beta.9');
assert.equal(packageJson.devDependencies['@flue/runtime'], '1.0.0-beta.9');
assert.equal(packageJson.devDependencies['@opencomputer/flue'], '0.3.1');
assert.equal(packageLock.lockfileVersion, 3);
assert.deepEqual(packageLock.packages[''].engines, packageJson.engines);
assert.deepEqual(packageLock.packages[''].devDependencies, packageJson.devDependencies);
assert.deepEqual(packageLock.packages[''].dependencies, packageJson.dependencies);
assert.match(agentSource, /sandbox:\s*ocSandbox\(ctx\.env\)/);
assert.match(agentSource, /tools:\s*\[lookupOrder,\s*\.\.\.ocRepoTools\(ctx\)\]/);
for (const instruction of [
  'list_working_repos',
  "never assume the app's deployment repository",
  'add_source',
  'returned source path',
  'github_publish_pull_request',
  'pull-request URL',
]) {
  assert.ok(agentSource.includes(instruction), `agent instructions must include ${instruction}`);
}

for (const [packagePath, metadata] of Object.entries(packageLock.packages)) {
  if (metadata.resolved === undefined) continue;
  assert.match(
    metadata.resolved,
    /^https:\/\//,
    `${packagePath || '<root>'} must resolve from a portable HTTPS URL, got ${metadata.resolved}`,
  );
}

assert.deepEqual(projection, {
  schema_version: 1,
  flue: { entrypoint },
  model,
  vars: {},
  runtime: { family: 'flue', type: 'default' },
});
assert.deepEqual(
  {
    schema_version: artifactGolden.schema_version,
    flue: { entrypoint: artifactGolden.flue.entrypoint },
    model: artifactGolden.model,
    vars: artifactGolden.vars,
    runtime: artifactGolden.runtime,
  },
  projection,
);
assert.match(artifactGolden.bundle.digest, /^sha256:[0-9a-f]{64}$/);
assert.ok(artifactGolden.bundle.size_bytes > 0);

const failurePackage = readJson(join(failureRoot, 'package.json'));
const failureLock = readJson(join(failureRoot, 'package-lock.json'));
const failureManifest = readFileSync(join(failureRoot, 'agent.toml'), 'utf8');
assert.equal(manifestValue(failureManifest, 'name'), 'install-failure');
assert.equal(manifestValue(failureManifest, 'model'), model);
assert.equal(manifestValue(failureManifest, 'family'), 'flue');
assert.equal(failurePackage.devDependencies['@flue/cli'], '1.0.0-beta.9');
assert.equal(failureLock.lockfileVersion, 3);
assert.equal(failureLock.packages[''].devDependencies['@flue/cli'], '1.0.0-beta.9');
assert.equal(failureLock.packages['node_modules/@flue/cli'], undefined);

const npmCache = mkdtempSync(join(tmpdir(), 'oc-flue-starter-npm-cache-'));
try {
  const install = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['ci', '--no-audit', '--no-fund'],
    {
      cwd: failureRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_config_cache: npmCache },
    },
  );
  const output = `${install.stdout ?? ''}\n${install.stderr ?? ''}`;
  assert.notEqual(install.status, 0, 'failure fixture unexpectedly installed successfully');
  assert.match(output, /Missing: @flue\/cli@1\.0\.0-beta\.9 from lock file/);
} finally {
  rmSync(npmCache, { recursive: true, force: true });
}

if (process.env.OC_BIN) {
  const runOcBuild = (args) => {
    const result = spawnSync(process.env.OC_BIN, ['agent', 'build', ...args, '--json'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    assert.equal(
      result.status,
      0,
      `oc agent build failed (${result.error?.message || result.stderr || 'no diagnostic'})`,
    );
    let deployment;
    assert.doesNotThrow(() => {
      deployment = JSON.parse(result.stdout);
    }, 'oc agent build must print JSON to stdout');
    return deployment;
  };
  const withoutBuilder = ({ builder: _builder, ...deployment }) => deployment;
  const assertBuilder = (deployment) => {
    assert.match(deployment.builder?.version ?? '', /^oc@.+/);
  };

  const checkOnly = runOcBuild(['--dir', root, '--check-only']);
  assertBuilder(checkOnly);
  assert.deepEqual(withoutBuilder(checkOnly), projection);

  const outputRoot = mkdtempSync(join(tmpdir(), 'oc-flue-starter-artifact-'));
  try {
    const full = runOcBuild([
      '--dir',
      root,
      '--target',
      'cloudflare',
      '--output',
      outputRoot,
    ]);
    const persisted = readJson(join(outputRoot, 'deployment.json'));
    assertBuilder(full);
    assert.equal(full.builder.version, checkOnly.builder.version);
    assert.deepEqual(persisted, full);
    assert.deepEqual(withoutBuilder(full), artifactGolden);

    const bundlePath = join(outputRoot, 'bundle.tgz');
    assert.equal(statSync(bundlePath).size, artifactGolden.bundle.size_bytes);
    const digest = `sha256:${createHash('sha256').update(readFileSync(bundlePath)).digest('hex')}`;
    assert.equal(digest, artifactGolden.bundle.digest);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}
