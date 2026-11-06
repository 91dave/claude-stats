import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/claude-stats.js', import.meta.url));
const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url));
const configA = join(fixtures, 'config-a');
const configB = join(fixtures, 'config-b');

function run(args, env = {}) {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: '', ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function tableRows(stdout) {
  return stdout.trim().split(/\r?\n/).slice(2).map((line) => line.trim().split(/\s+/));
}

test('skill-use prints a table of skills with total first, then manual and auto', () => {
  const { code, stdout } = run(['skill-use'], { CLAUDE_CONFIG_DIR: configA });

  assert.equal(code, 0);
  const [header, divider] = stdout.split(/\r?\n/);
  assert.deepEqual(header.trim().split(/\s+/), ['Skill', 'Total', 'Manual', 'Auto']);
  assert.match(divider, /^-+(\s+-+){3}$/);
  assert.deepEqual(tableRows(stdout), [
    ['handover', '2', '1', '1'],
    ['qtx-logs', '1', '1', '0'],
    ['ship-it', '1', '0', '1'],
  ]);
});

test('skill-use --json prints the same counts as JSON', () => {
  const { code, stdout } = run(['skill-use', '--json'], { CLAUDE_CONFIG_DIR: configA });

  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout), [
    { skill: 'handover', total: 2, manual: 1, auto: 1 },
    { skill: 'qtx-logs', total: 1, manual: 1, auto: 0 },
    { skill: 'ship-it', total: 1, manual: 0, auto: 1 },
  ]);
});

test('skill-use --dir can be repeated to combine several transcript folders', () => {
  const { code, stdout } = run([
    'skill-use', '--json',
    '--dir', join(configA, 'projects'),
    '--dir', join(configB, 'projects'),
  ]);

  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout).map((row) => [row.skill, row.total]), [
    ['handover', 2],
    ['qtx-logs', 2],
    ['ship-it', 1],
  ]);
});

test('skill-use reads ~/.claude/projects when CLAUDE_CONFIG_DIR is not set', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'claude-stats-home-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  cpSync(configB, join(home, '.claude'), { recursive: true });

  const { code, stdout } = run(['skill-use', '--json'], { HOME: home, USERPROFILE: home });

  assert.equal(code, 0);
  assert.deepEqual(JSON.parse(stdout), [{ skill: 'qtx-logs', total: 1, manual: 1, auto: 0 }]);
});

test('skill-use reports a missing transcript folder as an error', () => {
  const missing = join(fixtures, 'does-not-exist');
  const { code, stderr } = run(['skill-use', '--dir', missing]);

  assert.equal(code, 1);
  assert.match(stderr, /does-not-exist/);
});

test('skill-use says so when no skill use is found', (t) => {
  const empty = mkdtempSync(join(tmpdir(), 'claude-stats-empty-'));
  t.after(() => rmSync(empty, { recursive: true, force: true }));

  const { code, stdout } = run(['skill-use', '--dir', empty]);

  assert.equal(code, 0);
  assert.match(stdout, /No skill use found/);
});

test('an unknown command fails with usage help', () => {
  const { code, stderr } = run(['nonsense']);

  assert.equal(code, 1);
  assert.match(stderr, /Unknown command: nonsense/);
  assert.match(stderr, /skill-use/);
});

test('--help prints usage and succeeds', () => {
  const { code, stdout } = run(['--help']);

  assert.equal(code, 0);
  assert.match(stdout, /Usage: claude-stats <command>/);
  assert.match(stdout, /skill-use/);
});
