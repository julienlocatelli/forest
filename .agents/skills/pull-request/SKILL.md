---
name: pull-request
description: Commit a validated Forest ticket with its Notion TASK in the Conventional Commit scope, push its branch, and create or update a draft GitHub pull request linked to the canonical ticket.
---

# Pull request for a Forest ticket

Invoke directly with a feature directory, or through speckit-implement after successful validation and the verified Review transition. Invocation authorizes intentional staging, a local commit, normal push of the ticket branch and creation/update of its GitHub draft PR. A request to edit this skill does not execute those actions. No merge, force-push, release, deployment or edits to other tickets are authorized.

## Verify context and scope

1. Read the feature's spec.md, plan.md, tasks.md and notion-source.json. Fetch the associated ticket and verify its UUID, canonical URL and positive numeric TASK. TASK is the display number, not a Notion page UUID: never fabricate app.notion.com/p/<TASK>. Use the verified canonical URL from the association/fetch in the commit body and PR.
2. Require completed tasks and successful required checks. Document unavailable checks honestly; incomplete implementation or failed required checks blocks publication unless the user explicitly accepts that limitation. Inspect repository instructions, current branch, remotes/upstream, base branch, staged/unstaged changes, untracked in-scope files and existing PRs. Verify actual Git branch rather than relying on Spec Kit's feature identifier. Default to main only when confirmed as the intended base.
3. Read the full diff against the base and identify changes belonging to this ticket. Stage explicit paths/hunks; preserve unrelated work and preexisting staging. If mixed staging cannot be separated safely, ask for resolution. Inspect the final staged diff for secrets, private data and generated noise before committing. Run applicable repository checks and git diff --check; use real scripts, without introducing a new test requirement for documentation alone.

## Commit convention

Use `<type>(<TASK>): <summary>`; choose feat, fix, docs, test, refactor, perf, build, ci, chore or style according to the actual change. TASK is the exact numeric ticket scope. The summary is an imperative description of the ticket's delivered outcome in four or five words maximum; fewer words are acceptable if sufficient. The limit applies to the subject summary, not the explanatory body.

Example for ticket 11:
```text
chore(11): automate Notion specification workflow

Notion: <verified canonical ticket URL>
```

Include the canonical ticket URL in the commit body. Additional body text may explain a nontrivial decision or validation limitation. Follow any stricter repository subject-length rule. Create a commit only when in-scope staged changes exist; on retry, reuse an existing matching commit instead of making an empty duplicate. Verify the resulting SHA and committed paths; commit-hook failure stops publication. Do not bypass commit hooks.

## Prepare the GitHub PR

1. Use an authenticated GitHub connector or gh CLI, verifying repository and head/base from actual metadata. Read the existing [PR body skill](../pr/SKILL.md) and any repository PR template; honor the repository template when present and use the skill's structure otherwise. Include a visible ticket reference such as `[Notion #11](<canonical URL>)`, concrete behavior, checks actually executed and material limitations. No GitHub closing keyword for a Notion number.
2. Push the ticket branch normally to the verified remote. Do not push main or rewrite remote history. If the remote branch diverges, stop and report the conflict. Publication must concern only the verified ticket commits; unexpected independent commits require resolution.
3. Search for a PR with this repository/head/base. If absent, create a draft PR; if present, update its description with the final scope and evidence, preserving unrelated human content and its existing draft/ready state. Use structured tool arguments or a temporary body file with gh --body-file, preserving literal text and newlines. Never open a duplicate PR after an uncertain response: re-read remote state first.
4. Verify the PR URL, head SHA and base. Report CI as observed (queued/running/passed/failed), without presenting pending jobs as successful. An authenticated remote unavailable or publication failure leaves the local commit intact for retry; no automatic reset or duplicate commit.

Report commit SHA and subject, canonical ticket link, remote branch, PR URL/state, validation and any blocker. Keep the ticket in Review; a PR does not imply merge or Done.
