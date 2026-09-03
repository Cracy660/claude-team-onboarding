# Baseline scenario: scaffolding wave tooling into a repository

Run this twice: once before `plugins/wave/skills/init/SKILL.md` exists (RED) and once after
(GREEN). Record both runs in `.superpowers/sdd/2026-09-02-wave-plugin/baseline-init.md`.

## Setup

The executor runs this, not the agent. It builds a throwaway pnpm repository from scratch. The
pre-existing `.claude/settings.json` is what makes the missing-backup failure visible, and the
`.gitignore` deliberately omits `node_modules/` so the dependency-directory check has something
to find.

```bash
set -eu
REPO="$(git rev-parse --show-toplevel)"
SCEN="${TMPDIR:-/tmp}/wave-init-baseline"
rm -rf "$SCEN"; mkdir -p "$SCEN"
cd "$SCEN"
git init -q -b main
cat > package.json <<'JSON'
{
  "name": "demo",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "test": "vitest run",
    "build": "vite build",
    "lint": "eslint ."
  }
}
JSON
: > pnpm-lock.yaml
printf 'DATABASE_URL=postgres://localhost:5432/demo\n' > .env.local
printf '.env.local\n' > .gitignore
mkdir -p .claude
cat > .claude/settings.json <<'JSON'
{
  "permissions": { "allow": ["Bash(pnpm test:*)"] },
  "statusLine": { "type": "command", "command": "ccstatusline" }
}
JSON
git add -A
git -c user.email=demo@example.org -c user.name=demo commit -q -m "chore: demo repo"
echo "SCEN=$SCEN"
echo "PLUGIN_ROOT=$REPO/plugins/wave"
git -C "$SCEN" log --oneline
```

## RED prompt

Dispatch a general-purpose subagent with the block below as its entire task, with `<SCEN>` and
`<PLUGIN_ROOT>` replaced by the paths the setup printed. Do not give the agent the skill.

```
This is real work on a real repository. Do it now.

<SCEN> is a git repository. The wave plugin's project templates are in
<PLUGIN_ROOT>/templates/project/ and its scripts in <PLUGIN_ROOT>/scripts/.

Set up Codex dispatch tooling in this repo from the templates in <PLUGIN_ROOT>.

Work only inside <SCEN>. Do not read anything under <PLUGIN_ROOT>/skills/. When you are done,
list the files you wrote.
```

## GREEN prompt

Re-run the setup, then dispatch the same agent type with the identical prompt plus this first
line:

```
Use the skill at <REPO>/plugins/wave/skills/init/SKILL.md. Follow it.
```

Answer its knobs question with `defaults`, but for house conventions give three lines including
"Call the shared HTTP client wrapper, never fetch directly," so the TODO-block deletion is
exercised. Accept its offer to ignore `node_modules/`.

## What to record, verbatim

1. The agent's own list of files it wrote, quoted.
2. `grep -rn '{{' <SCEN>/.claude <SCEN>/AGENTS.md <SCEN>/CLAUDE.md`, pasted whole.
3. `cat <SCEN>/.claude/settings.json`, pasted whole.
4. `ls -1 <SCEN>/.claude`, so a missing backup is visible.
5. `cat <SCEN>/.gitignore`.
6. One row per failure class observed, each with its evidence.

Expected RED failure classes, from the spec's baseline risk note: placeholders left in the
written files, the permission deny rules missing, and no backup of the existing
`.claude/settings.json`. Record what actually happens, including classes not on this list.

## Acceptance, GREEN run

| Check | Command | Pass |
|---|---|---|
| No placeholder survives | `grep -rn '{{' <SCEN>/.claude <SCEN>/AGENTS.md <SCEN>/CLAUDE.md` | no output |
| Deny rules present | `node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log((j.permissions&&j.permissions.deny||[]).join("\n"))' <SCEN>/.claude/settings.json` | both `Bash(codex exec:*)` and `Bash(codex resume:*)` |
| Existing settings preserved | `node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(JSON.stringify(j.statusLine),(j.permissions.allow||[]).includes("Bash(pnpm test:*)"))' <SCEN>/.claude/settings.json` | the ccstatusline object and `true` |
| Backup present | `ls -1 <SCEN>/.claude/settings.json.pre-wave-*.bak` | exactly one path |
| Scripts executable | `test -x <SCEN>/.claude/skills/dispatch/scripts/dispatch.sh && test -x <SCEN>/.claude/hooks/code-only-branch.sh && echo ok` | `ok` |
| wave.env complete | `grep -c '^WAVE_' <SCEN>/.claude/wave.env` | `10` |
| Detection landed, env file | `grep '^WAVE_ENV_FILE=' <SCEN>/.claude/wave.env` | `WAVE_ENV_FILE=.env.local` |
| Detection landed, install | `grep '^WAVE_INSTALL_CMD=' <SCEN>/.claude/wave.env` | the pnpm install command |
| House conventions applied | `grep -c 'Call the shared HTTP client' <SCEN>/AGENTS.md` | `1` |
| House conventions replaced the TODO | `grep -c 'wave:todo-house-conventions' <SCEN>/AGENTS.md` | `0` |
| Log dir ignored | `grep -c '^\.superpowers/dispatch-logs/$' <SCEN>/.gitignore` | `1` |
| Dependency dir ignored | `grep -c '^node_modules/$' <SCEN>/.gitignore` | `1`, and the setup did not put it there |

In RED, no house conventions are given, so evaluate the "House conventions replaced the TODO" row
differently: both marker lines are present (`grep -c 'wave:todo-house-conventions'
<SCEN>/AGENTS.md` returns `2`) and the TODO comment body between them is not orphaned without its
markers.

A GREEN run that fails any row is a REFACTOR, not a pass.
