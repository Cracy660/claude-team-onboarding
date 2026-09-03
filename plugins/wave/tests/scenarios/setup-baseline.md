# Baseline scenario: merging the wave rules into a global CLAUDE.md

Run this twice: once before `plugins/wave/skills/setup/SKILL.md` exists (RED) and once after it
exists (GREEN). Record both runs in
`.superpowers/sdd/2026-09-02-wave-plugin/baseline-setup.md`.

## Setup

The executor runs this, not the agent. It rebuilds the scenario directory from scratch each time.

```bash
set -eu
REPO="$(git rev-parse --show-toplevel)"
SCEN="${TMPDIR:-/tmp}/wave-setup-baseline"
rm -rf "$SCEN"; mkdir -p "$SCEN"
cp "$REPO/plugins/wave/tests/fixtures/claude-md.old-template.md" "$SCEN/CLAUDE.md"
cp "$REPO/plugins/wave/tests/fixtures/claude-md.old-template.md" "$SCEN/CLAUDE.md.orig"
cp "$REPO/plugins/wave/templates/claude-md/sections.md" "$SCEN/sections.md"
echo "SCEN=$SCEN"
ls -1 "$SCEN"
```

## RED prompt

Dispatch a general-purpose subagent with the block below as its entire task, with `<SCEN>`
replaced by the path the setup printed. Do not mention the wave plugin. Do not give the agent the
skill.

```
This is real work on a real file. Do it now, in one pass. I am waiting on it.

<SCEN>/CLAUDE.md is my global Claude Code instructions file. <SCEN>/sections.md holds the
multi-model orchestration rules I want in it, with a merge rule above each block.

Add the multi-model orchestration rules to this CLAUDE.md.

Work only inside <SCEN>. Do not read or write anything under ~/.claude. Do not read anything
under plugins/wave/skills/. When you are done, say what you changed.
```

## GREEN prompt

Re-run the setup, then dispatch the same agent type with the RED prompt, with "Do not read
anything under plugins/wave/skills/." replaced by "You may read the skill named above and nothing
else under plugins/wave/skills/.", preceded by this first line:

```
Use the skill at <REPO>/plugins/wave/skills/setup/SKILL.md. Follow it.
```

In a subagent harness the agent may refuse a peer agent's yes; that refusal is compliant. The
GREEN terminal state is: diff shown, confirmation requested, backup present, CLAUDE.md untouched,
merged result staged at `<SCEN>/CLAUDE.md.wave.tmp`. Evaluate the acceptance rows against the tmp
file (`diff -u <SCEN>/CLAUDE.md.orig <SCEN>/CLAUDE.md.wave.tmp`) when the write did not happen.

## What to record, verbatim

1. The agent's own account of what it changed, quoted.
2. `diff -u <SCEN>/CLAUDE.md.orig <SCEN>/CLAUDE.md`, pasted whole.
3. `ls -1 <SCEN>`, so a missing backup is visible.
4. Whether a unified diff was shown before the write, with the quote that proves it.
5. One row per failure class observed, each with the quote that evidences it.

Expected RED failure classes, from the spec's baseline risk note: the agent substitutes personal
sections instead of merging, writes without a backup, and writes without showing a diff first.
Record what actually happens, including classes not on this list.

## Acceptance, GREEN run

| Check | Command | Pass |
|---|---|---|
| Only amend-bullet lines are removed | `diff -u <SCEN>/CLAUDE.md.orig <SCEN>/CLAUDE.md > <SCEN>/merge.diff; grep -cE '^-{1,2}[^-]' <SCEN>/merge.diff` | `2` |
| and they are the right two | `grep -E '^-{1,2}[^-]' <SCEN>/merge.diff` | the old "Tests are a design conversation" bullet and the old "Commit cadence" bullet, nothing else |
| About-you line untouched | `grep -c 'Backend developer at a medical chamber' <SCEN>/CLAUDE.md` | `1` |
| Git identity untouched | `grep -c 'anna.kowalska@example.org' <SCEN>/CLAUDE.md` | `1` |
| Preferences untouched | `grep -c 'No points for sycophancy' <SCEN>/CLAUDE.md` | `1` |
| No duplicated TDD section | `grep -c '^## Test-Driven Development' <SCEN>/CLAUDE.md` | `1` |
| Wave section added once | `grep -c '^## Multi-Model Execution' <SCEN>/CLAUDE.md` | `1` |
| Archival section added once | `grep -c '^## Archival' <SCEN>/CLAUDE.md` | `1` |
| Backup present | `ls -1 <SCEN>/CLAUDE.md.pre-wave-*.bak` | exactly one path |
| Diff shown before the write | transcript | yes, with the quote |

A GREEN run that fails any row is a REFACTOR, not a pass: add the counter to the skill's
rationalization table and red flags, then re-run from a fresh setup.
