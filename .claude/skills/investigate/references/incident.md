# Incident

Find the cause of something that went wrong: a red CI run, a broken workflow, an unexpected behaviour. The output is the cause and its evidence, so the user can decide the fix. Fixing is out of reach here; once the cause is known, the fix goes through a story, or the `diagnosing-bugs` skill for a hard bug that needs a reproduction loop.

Read logs and history with read-only commands: `gh run view <id> --log-failed`, `gh run list`, `gh pr view`, `git log`, `git show`, `git diff`. Rerunning a workflow, retrying a job or pushing a change is a change: list it as an open question instead.

The report covers:

1. **What happened.** The symptom as observed: the run, job and step that failed, with its link or ID, the time, and the exact error lines.
2. **Timeline.** The last known good state and the first bad one (runs, commits or deploys), with their IDs.
3. **Most likely cause.** The change or condition that produced the error, with evidence that links it to the error line: the commit and `path:line`, a config value, a documented limit.
4. **Other candidates.** Each cause you considered, and the evidence that rules it in or out.
5. **Impact.** What the incident blocked or broke, and whether it still happens on the current base branch.

The recommendation names the fix to make, without making it. Done when the most likely cause is backed by evidence that ties it to the error, or the report states it could not be found and what would find it.
