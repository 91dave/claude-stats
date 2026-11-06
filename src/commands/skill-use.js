import { renderTable } from '../format.js';
import { createSkillUseCounter, SKILL_USE_LINE_FILTER } from '../skill-use.js';
import { assertDirectoriesExist, findTranscriptFiles, readRecords } from '../transcripts.js';

export const summary = 'Count how often each skill is used, split into manual and auto';

const COLUMNS = [
  { header: 'Skill', value: (row) => row.skill },
  { header: 'Total', value: (row) => row.total, align: 'right' },
  { header: 'Manual', value: (row) => row.manual, align: 'right' },
  { header: 'Auto', value: (row) => row.auto, align: 'right' },
];

export async function run({ dirs, json }) {
  await assertDirectoriesExist(dirs);

  const counter = createSkillUseCounter();
  for (const dir of dirs) {
    for await (const file of findTranscriptFiles(dir)) {
      counter.addFile(await readRecords(file, SKILL_USE_LINE_FILTER));
    }
  }
  const results = counter.results();

  if (json) return JSON.stringify(results, null, 2);
  if (results.length === 0) return `No skill use found in ${dirs.join(', ')}`;
  return renderTable(results, COLUMNS);
}
