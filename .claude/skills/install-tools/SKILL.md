---
name: install-tools
description: Add a tool or a library to Forest the pinned way, tools in mise.toml and libraries in their workspace. Use before installing, adding, upgrading or running a command-line tool or a library, a one-off code generator included.
---

# Install tools

Every tool and library Forest uses is pinned in the repository at an exact version, so every machine, CI and Renovate run the same one. A command-line tool lives in `mise.toml`; a library lives in the `package.json` of the workspace that uses it.

This rule wins over any imported skill or documentation that asks for a global install, such as the Neon skills' `npm i -g neon`: use the pinned equivalent from [Global installs](#global-installs) instead, and leave the imported skill as it is.

## A command-line tool

1. **Find its backend.** `mise registry <tool>` gives the short name of a tool mise knows. Otherwise pick the backend that publishes it: `npm:<package>`, `aqua:<owner>/<repo>`, `github:<owner>/<repo>`, `pipx:<package>`, `cargo:<crate>` or `go:<module>`. List its versions with `mise ls-remote <backend>:<tool>`. Done when you hold the tool's name and the exact version to pin, the latest stable one unless the task names another.
2. **Pin it.** From the repository root, run `mise use <tool>@<version>`. Done when `mise.toml` reads `"<tool>" = "<version>"`, a full version with no range.
3. **Run it** with `mise exec -- <command>`, or add a `[tasks]` entry in `mise.toml` for a command the team runs often. A tool used only once, such as a code generator, is pinned and run the same way.

A tool that is already a workspace dependency, such as `prisma`, `expo` or `eslint`, runs through that workspace: its `package.json` script, or `bun run --cwd <workspace> <binary>`.

## A library

From the repository root, run `bun add --cwd <workspace> --exact <package>@<version>`, with `--dev` for a development dependency. `<workspace>` is the folder whose code imports it: `apps/api`, `apps/front`, `apps/mobile`, `packages/<name>`, `test-e2e`, or `.` for tooling the whole repository uses. Done when that `package.json` lists the exact version and `bun.lock` changed with it.

## When there is no backend

When neither mise nor bun can install the tool, stop and ask the user: name the tool, the backends you tried and what `mise ls-remote` answered. Install it no other way.

## Global installs

These install outside the repository, or at whatever version is current that day. Use the pinned equivalent:

| Instead of | Use |
| --- | --- |
| `npm install -g <pkg>`, `bun add -g <pkg>`, `bun install -g <pkg>` | `mise use npm:<pkg>@<version>`, then `mise exec -- <command>` |
| `npx <pkg>`, `bunx <pkg>` | the same mise pin; or `bun run --cwd <workspace> <binary>` when a workspace already depends on it |
| `mise use -g <tool>` | `mise use <tool>@<version>` from the repository root |
| `brew install <tool>` | `mise use aqua:<owner>/<repo>@<version>` or `github:<owner>/<repo>@<version>` |
| `pipx install <pkg>` | `mise use pipx:<pkg>@<version>` |
| `curl … \| sh` or any download piped to a shell | `mise use github:<owner>/<repo>@<version>` for the release binary |

## After a change

Check that a fresh clone still installs: run `mise install` and `bun install --frozen-lockfile` from the repository root. Done when both succeed with no change to `mise.toml` or `bun.lock`.
