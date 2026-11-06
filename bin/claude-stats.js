#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as skillUse from '../src/commands/skill-use.js';
import { defaultProjectsDir } from '../src/transcripts.js';

const commands = { 'skill-use': skillUse };

function usage() {
  const commandList = Object.entries(commands)
    .map(([name, command]) => `  ${name.padEnd(12)}${command.summary}`)
    .join('\n');
  return `Usage: claude-stats <command> [options]

Commands:
${commandList}

Options:
  --dir <path>  Transcript folder to read; repeat for several (default: ${defaultProjectsDir()})
  --json        Print JSON instead of a table
  -h, --help    Show this help`;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      dir: { type: 'string', multiple: true },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.help) {
    console.log(usage());
    return 0;
  }

  const [name] = positionals;
  const command = commands[name];
  if (!command) {
    console.error(`${name ? `Unknown command: ${name}` : 'No command given'}\n\n${usage()}`);
    return 1;
  }

  console.log(await command.run({ dirs: values.dir ?? [defaultProjectsDir()], json: values.json }));
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (error) => {
    console.error(error.message);
    process.exitCode = 1;
  },
);
