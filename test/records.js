let nextId = 0;
const newId = (prefix) => `${prefix}-${++nextId}`;

export function typedCommand(name, { uuid = newId('cmd') } = {}) {
  return {
    type: 'user',
    uuid,
    message: {
      role: 'user',
      content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>`,
    },
  };
}

export function skillLoad(skillDir, { uuid = newId('load'), parentUuid = null, sourceToolUseID = null } = {}) {
  return {
    type: 'user',
    isMeta: true,
    uuid,
    parentUuid,
    sourceToolUseID,
    message: {
      role: 'user',
      content: [{ type: 'text', text: `Base directory for this skill: ${skillDir}\n\n# Skill body` }],
    },
  };
}

export function toolUse(name, input, { id = newId('toolu') } = {}) {
  return {
    type: 'assistant',
    uuid: newId('asst'),
    message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
  };
}

export function skillMention(skillName) {
  return { type: 'attachment', uuid: newId('att'), attachment: { type: 'skill_mention', skillName } };
}

export function toolResult(text) {
  return {
    type: 'user',
    uuid: newId('result'),
    message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: newId('toolu'), content: text }] },
  };
}

export function typedSkill(name, skillDir) {
  const command = typedCommand(name);
  return [command, skillLoad(skillDir, { parentUuid: command.uuid })];
}

export function calledSkill(name, skillDir) {
  const call = toolUse('Skill', { skill: name });
  const callId = call.message.content[0].id;
  return [call, skillLoad(skillDir, { sourceToolUseID: callId })];
}
