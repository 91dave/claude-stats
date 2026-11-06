const INSTALLED_SKILL_FILE = /\.claude[\\/]+skills[\\/]+(?:synced[\\/]+[^\\/]+[\\/]+)?([A-Za-z0-9._:-]+)[\\/]+SKILL\.md/g;
const MAINTENANCE_COMMAND = /\b(git|diff|for|rg|grep|fdfind|find)\b/;
const TYPED_COMMAND = /<command-name>\/?([^<]+)<\/command-name>/;
const SKILL_LOAD = /^Base directory for this skill: ([^\r\n]+)/;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

export const SKILL_USE_LINE_FILTER = /Base directory for this skill|<command-name>|skill_mention|"name":"Skill"|SKILL\.md/;

function contentBlocks(record) {
  const content = record.message?.content;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return Array.isArray(content) ? content : [];
}

function installedSkillNames(text) {
  return [...new Set([...String(text ?? '').matchAll(INSTALLED_SKILL_FILE)].map((match) => match[1]))];
}

function folderName(skillDir) {
  return skillDir.trim().split(/[\\/]+/).filter(Boolean).pop();
}

function resolveSkillName(invokedAs, skillDir) {
  const folder = folderName(skillDir);
  if (invokedAs && (invokedAs === folder || invokedAs.endsWith(`:${folder}`))) return invokedAs;
  return folder;
}

export function createSkillUseCounter() {
  const usage = new Map();
  const counted = new Set();

  function addUse(skill, source) {
    if (!usage.has(skill)) usage.set(skill, { skill, manual: 0, auto: 0 });
    usage.get(skill)[source]++;
  }

  function addFile(records) {
    const typedCommandsByUuid = new Map();
    const skillCallsById = new Map();
    const pendingMentions = [];
    const directReads = [];
    const maintainedSkills = new Set();

    function onToolUse(block) {
      const input = block.input ?? {};
      if (block.name === 'Skill') {
        const mention = pendingMentions.indexOf(input.skill);
        if (mention >= 0) pendingMentions.splice(mention, 1);
        skillCallsById.set(block.id, { skill: input.skill, source: mention >= 0 ? 'manual' : 'auto' });
      } else if (block.name === 'Read') {
        const names = installedSkillNames(input.file_path);
        if (names.length === 1) directReads.push({ id: block.id, skill: names[0] });
      } else if (block.name === 'Bash') {
        const names = installedSkillNames(input.command);
        if (MAINTENANCE_COMMAND.test(String(input.command))) names.forEach((name) => maintainedSkills.add(name));
        else if (names.length === 1) directReads.push({ id: block.id, skill: names[0] });
      } else if (EDIT_TOOLS.has(block.name)) {
        installedSkillNames(input.file_path).forEach((name) => maintainedSkills.add(name));
      }
    }

    function onSkillLoad(record, skillDir) {
      if (counted.has(`load:${record.uuid}`)) return;
      counted.add(`load:${record.uuid}`);

      const call = record.sourceToolUseID && skillCallsById.get(record.sourceToolUseID);
      const typedCommand = record.parentUuid && typedCommandsByUuid.get(record.parentUuid);
      if (call) addUse(resolveSkillName(call.skill, skillDir), call.source);
      else if (typedCommand) addUse(resolveSkillName(typedCommand, skillDir), 'manual');
      else addUse(resolveSkillName('', skillDir), 'auto');
    }

    function onUserText(record, text) {
      const typed = !record.isMeta && text.match(TYPED_COMMAND);
      const load = text.match(SKILL_LOAD);
      if (typed) typedCommandsByUuid.set(record.uuid, typed[1]);
      else if (load) onSkillLoad(record, load[1]);
    }

    for (const record of records) {
      if (record.type === 'attachment' && record.attachment?.type === 'skill_mention') {
        pendingMentions.push(record.attachment.skillName);
      } else if (record.type === 'assistant') {
        contentBlocks(record).filter((block) => block.type === 'tool_use').forEach(onToolUse);
      } else if (record.type === 'user') {
        contentBlocks(record).filter((block) => block.type === 'text').forEach((block) => onUserText(record, block.text));
      }
    }

    for (const read of directReads) {
      if (maintainedSkills.has(read.skill) || counted.has(`read:${read.id}`)) continue;
      counted.add(`read:${read.id}`);
      addUse(read.skill, 'auto');
    }
  }

  function results() {
    return [...usage.values()]
      .map(({ skill, manual, auto }) => ({ skill, total: manual + auto, manual, auto }))
      .sort((a, b) => b.total - a.total || a.skill.localeCompare(b.skill));
  }

  return { addFile, results };
}
