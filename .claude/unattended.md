# Unattended runs

`/plan`, `/implement` and `/pull-request` run unattended when `--unattended` follows the story reference, for example `/plan TASK-31 --unattended`; `/merge-story`, the flow's last step, always does. The development loop uses it; without the flag, each skill asks and waits as its own steps say.

## Rules

In an unattended run:

- **Nobody answers.** Never call `AskUserQuestion` and never wait for an approval. Where a step would ask the user or show something for approval, take the option the step recommends and go on. When it recommends none, take the option that keeps everything as it is, or block.
- **Log every choice.** For each choice the user would have made, append one line to the decision log, `$(git rev-parse --git-common-dir)/forest-unattended/TASK-<n>.md`, creating the folder when needed: `- <skill>, <step>: <choice>. <reason>.` The log lives in Git's own directory, so it is never committed, and only runs in the same clone share it; `/pull-request` copies it into the PR body.
- **Stay reversible.** An action a step reserves for the user's explicit approval, such as dropping a `Doing` or `Done` task, a force-push or a deletion, is never taken: pick the option that keeps everything, or block.

## Blocked

A story is blocked when a step would otherwise stop and wait for the user:

- a check fails and no fix inside the story's scope makes it pass;
- an acceptance criterion stays unproven;
- the work would change the story's acceptance criteria, user story or out-of-scope list;
- the story, its tasks, its branch or the repository is not in the state a step requires.

Then:

1. Leave every task and the story's status where they are: `To Define` or `To Do` during `/plan`, `Doing` during `/implement` and `/pull-request`, since `/implement` moves the story to `Review` only once the pull request is verified, and `Review` during `/merge-story`. Commit nothing unfinished.
2. Append a `## Blocked YYYY-MM-DD` section at the end of the story page, with today's date: the skill and step, what failed with the check output or the reason, and what would unblock it.
3. End the run with the result line.

## Result line

The last line of an unattended run's final message is exactly one of:

- `UNATTENDED RESULT: planned TASK-<n>` when `/plan` published the board;
- `UNATTENDED RESULT: pr TASK-<n> <pull request URL>` when `/implement` or `/pull-request` left a ready pull request;
- `UNATTENDED RESULT: merged TASK-<n> <pull request URL>` when `/merge-story` merged the pull request;
- `UNATTENDED RESULT: blocked TASK-<n> <one-line reason>` when the story is blocked.
