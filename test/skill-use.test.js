import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSkillUseCounter } from '../src/skill-use.js';
import {
  calledSkill,
  skillLoad,
  skillMention,
  toolResult,
  toolUse,
  typedCommand,
  typedSkill,
} from './records.js';

const SKILLS = '/home/me/.claude/skills';

function count(...files) {
  const counter = createSkillUseCounter();
  for (const records of files) counter.addFile(records);
  return counter.results();
}

function usageOf(results, skill) {
  return results.find((row) => row.skill === skill);
}

test('a typed slash command that loads a skill counts as manual', () => {
  const results = count(typedSkill('qtx-logs', `${SKILLS}/qtx-logs`));
  assert.deepEqual(results, [{ skill: 'qtx-logs', total: 1, manual: 1, auto: 0 }]);
});

test('a Skill tool call with no prior mention counts as auto', () => {
  const results = count(calledSkill('ship-it', `${SKILLS}/ship-it`));
  assert.deepEqual(results, [{ skill: 'ship-it', total: 1, manual: 0, auto: 1 }]);
});

test('a Skill tool call after the user mentions the skill in a prompt counts as manual', () => {
  const results = count([skillMention('handover'), ...calledSkill('handover', `${SKILLS}/handover`)]);
  assert.deepEqual(results, [{ skill: 'handover', total: 1, manual: 1, auto: 0 }]);
});

test('a single mention only makes one later Skill call manual', () => {
  const results = count([
    skillMention('handover'),
    ...calledSkill('handover', `${SKILLS}/handover`),
    ...calledSkill('handover', `${SKILLS}/handover`),
  ]);
  assert.deepEqual(results, [{ skill: 'handover', total: 2, manual: 1, auto: 1 }]);
});

test('built-in commands that load no skill are not counted', () => {
  assert.deepEqual(count([typedCommand('clear'), typedCommand('model')]), []);
});

test('a skill load with no known trigger counts as auto under its folder name', () => {
  const results = count([skillLoad(`${SKILLS}/wip`)]);
  assert.deepEqual(results, [{ skill: 'wip', total: 1, manual: 0, auto: 1 }]);
});

test('a command that loads a differently named skill is counted under the skill folder name', () => {
  const results = count(typedSkill('doctor', '/tmp/bundled-skills/2.1.299/abc123/claude-api'));
  assert.deepEqual(results, [{ skill: 'claude-api', total: 1, manual: 1, auto: 0 }]);
});

test('a plugin-namespaced skill keeps its namespaced name', () => {
  const results = count(calledSkill('anthropic-skills:docs', `${SKILLS}/synced/0a1b_2c3d/docs`));
  assert.deepEqual(results, [{ skill: 'anthropic-skills:docs', total: 1, manual: 0, auto: 1 }]);
});

test('reading an installed SKILL.md directly counts as auto', () => {
  const results = count([toolUse('Read', { file_path: `${SKILLS}/handover/SKILL.md` })]);
  assert.deepEqual(results, [{ skill: 'handover', total: 1, manual: 0, auto: 1 }]);
});

test('reading a SKILL.md through a Windows path counts as auto', () => {
  const results = count([toolUse('Read', { file_path: 'C:\\Users\\me\\.claude\\skills\\handover\\SKILL.md' })]);
  assert.deepEqual(results, [{ skill: 'handover', total: 1, manual: 0, auto: 1 }]);
});

test('reading a project-level SKILL.md counts as auto', () => {
  const results = count([toolUse('Read', { file_path: '/code/app/.claude/skills/local-dev-setup/SKILL.md' })]);
  assert.deepEqual(results, [{ skill: 'local-dev-setup', total: 1, manual: 0, auto: 1 }]);
});

test('reading a SKILL.md outside a .claude/skills folder is not counted', () => {
  const results = count([toolUse('Read', { file_path: '/code/dotfiles/agents/skills/wip/SKILL.md' })]);
  assert.deepEqual(results, []);
});

test('printing one installed SKILL.md from the shell counts as auto', () => {
  const results = count([toolUse('Bash', { command: 'cat ~/.claude/skills/handover/SKILL.md; ls ~/.claude/skills/handover' })]);
  assert.deepEqual(results, [{ skill: 'handover', total: 1, manual: 0, auto: 1 }]);
});

test('a shell command touching several SKILL.md files is not counted', () => {
  const command = 'cat ~/.claude/skills/wip/SKILL.md ~/.claude/skills/handover/SKILL.md';
  assert.deepEqual(count([toolUse('Bash', { command })]), []);
});

test('a skill maintained in a session is not counted as read in that session', () => {
  const results = count([
    toolUse('Bash', { command: 'cat -n ~/.claude/skills/qtx-storage-migration/SKILL.md' }),
    toolUse('Bash', { command: 'diff ~/.claude/skills/qtx-storage-migration/SKILL.md /code/skills/qtx-storage-migration/SKILL.md' }),
  ]);
  assert.deepEqual(results, []);
});

test('a skill edited in a session is not counted as read in that session, even when the edit comes later', () => {
  const results = count([
    toolUse('Read', { file_path: `${SKILLS}/visual-plan/SKILL.md` }),
    toolUse('Edit', { file_path: `${SKILLS}/visual-plan/SKILL.md`, old_string: 'a', new_string: 'b' }),
  ]);
  assert.deepEqual(results, []);
});

test('editing a skill in one session does not hide reads of it in another session', () => {
  const results = count(
    [toolUse('Write', { file_path: `${SKILLS}/visual-plan/SKILL.md`, content: 'x' })],
    [toolUse('Read', { file_path: `${SKILLS}/visual-plan/SKILL.md` })],
  );
  assert.deepEqual(results, [{ skill: 'visual-plan', total: 1, manual: 0, auto: 1 }]);
});

test('skill load text saved inside an API request record is ignored', () => {
  const blob = {
    type: 'api-request-blob',
    message: { role: 'user', content: [{ type: 'text', text: `Base directory for this skill: ${SKILLS}/qtx-logs` }] },
  };
  assert.deepEqual(count([blob]), []);
});

test('skill load and command text inside tool output is ignored', () => {
  const results = count([
    toolResult(`Base directory for this skill: ${SKILLS}/qtx-logs`),
    toolResult('<command-name>/qtx-logs</command-name>'),
  ]);
  assert.deepEqual(results, []);
});

test('the same skill load copied into two transcripts is counted once', () => {
  const records = typedSkill('qtx-logs', `${SKILLS}/qtx-logs`);
  const results = count(records, records);
  assert.deepEqual(results, [{ skill: 'qtx-logs', total: 1, manual: 1, auto: 0 }]);
});

test('the same SKILL.md read copied into two transcripts is counted once', () => {
  const read = toolUse('Read', { file_path: `${SKILLS}/handover/SKILL.md` });
  const results = count([read], [read]);
  assert.deepEqual(results, [{ skill: 'handover', total: 1, manual: 0, auto: 1 }]);
});

test('results are ordered by total, then by skill name', () => {
  const results = count([
    ...calledSkill('zeta', `${SKILLS}/zeta`),
    ...calledSkill('beta', `${SKILLS}/beta`),
    ...calledSkill('alpha', `${SKILLS}/alpha`),
    ...typedSkill('beta', `${SKILLS}/beta`),
  ]);
  assert.deepEqual(results.map((row) => row.skill), ['beta', 'alpha', 'zeta']);
  assert.equal(usageOf(results, 'beta').total, 2);
});
