# claude-stats

Usage statistics from your local Claude Code session transcripts.

Everything runs on your machine. It reads the transcript files Claude Code already keeps and sends nothing anywhere.

## Usage

Requires Node 18.18 or later. No install needed:

```sh
npx github:91dave/claude-stats skill-use
```

```
Skill                Total  Manual  Auto
-------------------  -----  ------  ----
qtx-logs                23      18     5
review-pr-comments      14      14     0
ship-it                  7       0     7

169 sessions from the last 41 days
```

The last line counts the sessions read, not counting subagent transcripts, and how many days ago the oldest of them started. `--json` output leaves it out.

| Option | Effect |
|---|---|
| `--json` | Print JSON instead of a table |
| `--dir <path>` | Read transcripts from this folder instead of the default. Repeat to combine several folders |
| `-h`, `--help` | Show help |

By default it reads `$CLAUDE_CONFIG_DIR/projects`, or `~/.claude/projects` when that variable isn't set.

### Claude Code in WSL, Node on Windows

Point `--dir` at the WSL home folder:

```powershell
npx github:91dave/claude-stats skill-use --dir \\wsl.localhost\Ubuntu-24.04\home\<user>\.claude\projects
```

Running it inside WSL instead is much faster.

## `skill-use` columns

| Column | Counts |
|---|---|
| Manual | You asked for the skill: typed `/skill` as a command, or named `/skill` in a prompt and Claude then called it |
| Auto | Claude used the skill without being asked: called it itself, or read its `SKILL.md` directly |

A skill counts each time it's loaded, so built-in commands like `/clear` never appear. A command that loads a skill under a different name is counted under the skill's name, so `/doctor` loading `claude-api` counts as `claude-api`.

Reads of a `SKILL.md` in a session where that skill is being maintained aren't counted: edited, or touched by `git`, `diff`, `grep` and similar commands.

Plain-text search of transcripts overcounts by several times. Transcripts also hold copies of messages in API request records, and tool output that quotes earlier transcripts. This tool reads the records themselves and drops duplicates.

## Limits

- Claude Code deletes transcripts after 30 days by default. Raise `cleanupPeriodDays` in `~/.claude/settings.json` to keep a longer history.
- A skill read during maintenance can still count as Auto when the edits happened in a different session.

## Development

```sh
npm test
```

Uses only Node built-ins, with no dependencies and no build step.
