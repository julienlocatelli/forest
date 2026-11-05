# Forest

## Library documentation

Before writing or changing code that uses a library's API, run the [library-docs](.claude/skills/library-docs/SKILL.md) skill: it fetches the documentation of the version Forest uses, with `ctx7`.

## Tools and libraries

Before installing, adding or running a tool or a library, follow the [install-tools](.claude/skills/install-tools/SKILL.md) skill: tools are pinned in `mise.toml`, libraries in their workspace's `package.json`.

## Branches behind main

Bring a branch up to date with `main` by rebasing it onto `origin/main`, then push it with `git push --force-with-lease`; merging `main` into a branch, `gh pr update-branch` included, adds a merge commit the pull request must not carry. A user's request to update a branch is their approval for that branch's `--force-with-lease` push.
