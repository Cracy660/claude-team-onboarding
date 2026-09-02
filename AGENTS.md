# AGENTS.md: implementer contract (claude-team-onboarding)

You are dispatched as an implementer inside a **dedicated git worktree**. The controller
session plans, reviews, commits, and runs everything your sandbox blocks. Your task brief
carries the requirements and any BAN rules; this file carries the standing rules that apply
to every dispatch.

## Environment

- Your sandbox confines writes to this worktree and blocks the network. Do not attempt
  workarounds; list the checks you could not run (see the verification contract).
- The shared git dir is outside your sandbox, so `git commit`, `push` and `rebase` fail.
  Do not try; the controller commits with the prescribed message.
- If the task seems to require touching anything outside this worktree, that is a BLOCKED
  report, not a workaround.
- Tools available offline: `node` (v20+), `npm`, `bash` 3.2 (macOS `/bin/bash`), `git`,
  `jq`, `sqlite3`, `python3` with the standard library. There are no dependencies to install.

## Scope discipline

- Implement exactly the task brief. No opportunistic refactors, no drive-by fixes; report
  adjacent problems as findings instead.
- An honest BLOCKED report beats a guess. If the brief is contradictory, references
  something that does not exist, or requires an out-of-scope change: STOP and report
  BLOCKED with the specific reason.
- Brief snippets can be wrong or incomplete. If a snippet contradicts a rule in this file,
  flag the conflict; do not silently follow it and do not silently deviate from it.

## House conventions

- This repository is a Claude Code plugin marketplace. `plugins/claude-team/` is frozen at
  0.1.0 and is never edited. New work lives under `plugins/wave/`.
- Files under `plugins/wave/templates/project/` are copied verbatim into other repositories
  unless they end in `.hbs`; a verbatim file never contains `{{`.
- Shell scripts and hooks stay within bash 3.2 syntax. Python tools use the standard library
  only. Node scripts use Node 20 APIs only, no dependencies.
- Prose is English, no em-dashes. Reference and template prose never names a specific
  organisation, person, framework, package manager or model provider.

## Tests

- Runner: `node --test` from `plugins/wave/tests/`, always with explicit file names
  (`node --test dispatch.test.mjs`) or `npm test`; `node --test <directory>` fails on this
  Node. Tests spawn the real scripts through `tests/helpers.mjs`; never re-implement a
  script's logic inside a test.
- Red before Green: the test file exists and is shown failing before the implementation
  lands. Never assert on git's own output; it is localized on this machine.

## Verification contract

- Report test results per test with **pasted runner output**; never summarize a suite as
  "fails as intended" or "passes" without the actual output.
- Say explicitly which checks you could NOT run. A green claim that silently covers an
  un-run check is treated as a fake Green.
- Write your report to the path the brief names, inside this worktree. End with a status
  line: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`, and keep your final
  message to at most eight lines: status, files changed, test summary, concerns.
