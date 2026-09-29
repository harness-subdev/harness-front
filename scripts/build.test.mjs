import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('build rejects malformed versions and mismatched tags before packaging', () => {
  const dir = mkdtempSync(join(tmpdir(), 'harness-build-check-'));
  const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...env } });
  try {
    copyFileSync(new URL('./build.sh', import.meta.url), join(dir, 'build.sh'));
    writeFileSync(join(dir, 'VERSION'), '0.1.0\n');
    assert.equal(run('git', ['init']).status, 0);
    assert.equal(run('git', ['add', '.']).status, 0);
    assert.equal(run('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'fixture']).status, 0);
    const mismatch = run('bash', ['build.sh'], { GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v9.9.9' });
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /Tag\/version mismatch/);
    writeFileSync(join(dir, 'VERSION'), '01.2.3\n');
    const malformed = run('bash', ['build.sh']);
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /VERSION must be/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
