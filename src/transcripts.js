import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export function defaultProjectsDir(env = process.env) {
  const configDir = env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  return join(configDir, 'projects');
}

export async function assertDirectoriesExist(dirs) {
  for (const dir of dirs) {
    const info = await stat(dir).catch(() => null);
    if (!info?.isDirectory()) throw new Error(`Transcript folder not found: ${dir}`);
  }
}

export async function* findTranscriptFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* findTranscriptFiles(path);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) yield path;
  }
}

const RECORD_TIMESTAMP = /"timestamp":"([^"]+)"/;

export function isSubagentTranscript(file) {
  return file.split(/[\\/]+/).includes('subagents');
}

export async function readTranscript(file, lineFilter) {
  const records = [];
  let startedAt = null;
  const lines = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of lines) {
    startedAt ??= Date.parse(line.match(RECORD_TIMESTAMP)?.[1]) || null;
    if (!lineFilter.test(line)) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return { records, startedAt };
}
