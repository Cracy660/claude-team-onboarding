# Troubleshooting

The traps this loop hits, each with the symptom you will actually see, the cause, and the
fix.

Most of these are already prevented by the dispatch script. They appear here because the
symptom is a hang or a false green rather than an error message, so recognizing the symptom
is the whole skill. When something below happens anyway, the script was worked around.

## The dispatch produces no output and never exits

**Symptom:** the log file exists, holds the banner and nothing else, and the process sits
there.

**Cause:** the implementer command inherited the parent's standard input and is waiting on
it.

**Fix:** the command must end with `< /dev/null`. The dispatch script does this. If you
are looking at this symptom, something invoked the command without the script.

## A resumed run attaches to the wrong task

**Symptom:** the resumed run talks about another task's files, or edits a worktree that is
not this task's.

**Cause:** the session was selected with `--last`. It picks the most recent session, which
is only this task's session when nothing else has run in between, and something always
runs in between.

**Fix:** find the session by the worktree path. Grep the sessions directory under
`${CODEX_HOME:-$HOME/.codex}/sessions` for the worktree path, take the session id, and
`resume` that id. Never `--last`.

## A resumed run edits the main checkout

**Symptom:** `resume` completes and the diff shows up in the primary checkout instead of
the task worktree.

**Cause:** `resume` does not restore the working directory the original run was given. It
runs wherever the shell is.

**Fix:** change into the worktree before resuming. The dispatch script does this, and it
also refuses to run against the primary checkout.

## Every command in the sandbox hangs

**Symptom:** the run stalls on the first test or install command with no output at all.

**Cause:** the package manager launcher tries to reach the network, which the sandbox
blocks, and it waits instead of failing.

**Fix:** call the installed binaries directly, for example
`./node_modules/.bin/<runner> run <file>`. The conventions file records the path and the
brief repeats it for the task at hand. Install dependencies as a controller chore before
dispatch, and say so in the brief so the implementer does not try.

## The run stops on a trust or approval prompt

**Symptom:** the log ends with a question and the process waits, or exits immediately
after asking.

**Cause:** a fresh worktree is an unknown directory, and the standard input is closed, so
an interactive prompt can never be answered.

**Fix:** the sandbox mode the script passes must not require an approval for ordinary
writes inside the worktree. Never widen it to a full-access mode to get past a prompt.
Investigate what asked, and fix that instead.

## Green with an empty test count

**Symptom:** the report says the suite passed, and the count is far below the usual one.

**Cause:** the environment file was not copied into the worktree, so every test that needs
a database or a service skipped silently. Skipping is not failing, so the run is green.

**Fix:** configure the environment file in `.claude/wave.env` so the dispatch script copies
it. Compare the reported test count with the count in the main checkout; a smaller number
is the finding. The controller re-runs those suites regardless.

## A failed run reads as green

**Symptom:** the log ends with an error, the exit status is 0.

**Cause:** the command was piped into a log writer, and the shell reported the writer's
status.

**Fix:** the script sets `pipefail` for exactly this. Do not add your own pipeline around
it.

## The worktree already exists

**Symptom:** the dispatch refuses with an existing-worktree message.

**Cause:** a previous run of this task id was never cleaned, or a merge left it behind.

**Fix:** finish or abandon the previous run, then `clean` that task id, then dispatch
again. Do not delete the directory by hand: the git metadata stays behind and the next
dispatch fails differently.

## `clean` refuses to remove the worktree

**Symptom:** `dispatch.sh clean <task-id>` exits 128, reports that the worktree contains
modified or untracked files, and leaves the directory in place.

**Cause:** `clean` runs `git worktree remove`, which refuses a worktree holding untracked
files. Ignored files do not stop it, so the directory the install command produces is a
problem only while it is not ignored. A repository that has never had a worktree dropped
on it often has no ignore rule for it yet.

**Fix:** ignore whatever the install command produces before the first dispatch, in the
repository's own ignore file, so every future `clean` succeeds. When the untracked files
are the task's own work, commit them from the worktree first, then `clean`. Do not delete
the directory by hand: the git metadata stays behind and the next dispatch for that task id
fails differently.

## The commit is blocked from a task branch

**Symptom:** a commit exits 2 with a message about registry files.

**Cause:** the branch content hook. The staged set includes a file under the registry
directory, and the commit is from a linked worktree or a task branch.

**Fix:** unstage the registry file. Registry flips happen in the main checkout after the
merge, because a binary database does not merge.

## A registry write is blocked

**Symptom:** a `sqlite3` command exits 2 before running.

**Cause:** the registry guard hook matched an `UPDATE`, `DELETE`, `DROP` or `ALTER` aimed
at the registry.

**Fix:** use the guarded write script. It prints the match list first, aborts on zero
rows, and writes the history row in the same transaction.

## The type check passes, the build fails

**Symptom:** the type check is green in the worktree and the build fails on an import.

**Cause:** the type checker does not see the bundler's boundaries, and after a route or
generated surface is deleted it keeps reading stale generated types.

**Fix:** run the build as a controller leg after any change that adds an import across a
bundler boundary or deletes a generated surface. Regenerate the generated types first.

## The same boundary keeps catching people out

**Symptom:** a change passes the tests and the type check but breaks the build or a
generated-types step, and it keeps happening on the same class of file.

**Cause:** the test tools are blind to that boundary. The entry above is the reactive fix,
and it depends on somebody remembering. Nothing in the toolchain tells the person editing
the file that this edit needs a leg the tests cannot ask for.

**Fix:** make the boundary announce itself. Write a project hook on `PostToolUse` for
`Edit|Write` that recognizes the file class and exits 2 with a message naming the leg to
run. Exit 2 surfaces the message as feedback rather than failing the edit, so it reads as a
reminder. Every project has a different boundary, so this stays a pattern rather than a
shipped file:

```bash
#!/usr/bin/env bash
file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  <glob for the file class>) echo "$file crosses a boundary the tests cannot see: run <the build command> before review." >&2; exit 2 ;;
esac
exit 0
```

Register it in the project's settings and keep it out of the wave tooling: the classes
worth guarding are the ones a wave has already been burned by, and that list is local.

## Prompt quoting mangles the task

**Symptom:** the implementer receives a truncated prompt, or the shell reports an unmatched
quote.

**Cause:** the prompt was passed inline, and it contains quotes, apostrophes or non-ASCII
punctuation the shell tried to interpret.

**Fix:** the prompt always rides in a file, and the script passes the file's contents as a
single argument. Write the brief to a file, pass the path.
