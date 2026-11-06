import { describeCoverage, renderTable } from '../format.js';
import { createSkillUseCounter, SKILL_USE_LINE_FILTER } from '../skill-use.js';
import { assertDirectoriesExist, findTranscriptFiles, isSubagentTranscript, readTranscript } from '../transcripts.js';

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
  const coverage = { sessions: 0, oldest: null };
  for (const dir of dirs) {
    for await (const file of findTranscriptFiles(dir)) {
      const { records, startedAt } = await readTranscript(file, SKILL_USE_LINE_FILTER);
      counter.addFile(records);
      if (isSubagentTranscript(file)) continue;
      coverage.sessions++;
      if (startedAt && (coverage.oldest == null || startedAt < coverage.oldest)) coverage.oldest = startedAt;
    }
  }
  const results = counter.results();

  if (json) return JSON.stringify(results, null, 2);
  const body = results.length === 0 ? `No skill use found in ${dirs.join(', ')}` : renderTable(results, COLUMNS);
  return `${body}\n\n${describeCoverage(coverage)}`;
}
