# GitHub automation

## PR checks

`workflows/pr-checks.yml` runs the repository checks on every pull request into `main`: when it is opened, pushed to, reopened or marked ready for review. A new push cancels the run still going on the same pull request. The job needs no secret and touches no database, so end-to-end scenarios stay local.

Each check is its own step, named in the run:

| Step | Command |
| --- | --- |
| Generate the Prisma client | `bun run --cwd apps/api prisma:generate` |
| API lint | `bun run --cwd apps/api lint` |
| API unit tests | `bun run --cwd apps/api test` |
| Front lint | `bun run --cwd apps/front lint` |
| Front build | `bun run --cwd apps/front build` |
| Unused code (knip) | `bun run knip` |
| Gherkin lint | `bun run lint:gherkin` |
| Script tests | `bun run test:scripts` |

Run the same commands from the repository root to check a branch before pushing. Dependencies are installed with `bun install --frozen-lockfile --ignore-scripts`, which skips downloading the Playwright browsers the checks don't need.

Before pushing a workflow change, also run `mise exec -- actionlint` from the repository root: it lints every file in `.github/workflows/` with the `actionlint` version pinned in `mise.toml`. The checks don't run it.

The `checks` job is a required status check on `main`: a pull request whose checks failed or have not finished cannot be merged. The branch must also be up to date with `main` (strict status checks), so `checks` ran on what `main` will hold after the merge. Repository admins can still bypass it from the merge button.

## PR review

`workflows/pr-review.yml` has Claude review a pull request into `main` when it is opened, reopened or marked ready for review, and again on every push to it, so the last commit is always the one reviewed. It does not run on drafts. A newer push cancels a review still running on an older commit.

Claude runs the repository's `code-review` skill against `origin/main`, on two axes:

- **Standards**: the repository's documented standards, plus the skill's code smell baseline.
- **Spec**: the Go Forest story found from the branch's TASK number, `<type>/<TASK>-<slug>`. `.github/scripts/story-spec.ts` reads it from Notion with `NOTION_TOKEN`, nested blocks included, and writes it to a file for the review. When there is no story to read, for example on a branch without a TASK number, the comment still gives the standards review and says why the spec axis was skipped.

Claude writes the review as JSON, and `.github/scripts/post-review.ts` publishes it:

- Findings that point at a changed line are posted as inline comments on that line, grouped in one GitHub review of type "Comment", which never approves nor requests changes. Claude quotes the line's code: when the line number is wrong, the comment moves to the only diff line holding that code, if the code is at least 10 characters long; otherwise the finding moves to the summary rather than land on a guessed line.
- The other findings, and the number of inline comments, go in one summary comment starting with `<!-- claude-pr-review -->`. A new review updates that comment instead of adding another.
- After posting its own review and summary, a new review deletes the inline comments of previous reviews that nobody replied to. Posting first means a review cancelled by a newer push never leaves the pull request without one. Threads with a reply are kept, and a new finding on the same line goes to the summary instead of repeating the thread.
- The summary ends with one fixed line, `Open findings: <n> on <commit SHA>`: how many findings, inline or not, ask for a change on that commit, or `unknown` when the review gave no count. A judgement call the review accepts, or a criterion the diff cannot show, is not counted. Scripts read this line to know whether a pull request is clean.

The review never blocks merging: it is not a required check, so a failed review job does not prevent merging. Pull requests from forks get no secrets, so their review fails without blocking them.

### Set up the Claude token

1. On a machine where Claude Code is signed in to your Claude subscription, run `claude setup-token` and copy the token it prints.
2. In GitHub, open **Settings → Secrets and variables → Actions** for this repository and add a repository secret named `CLAUDE_CODE_OAUTH_TOKEN` with that token.

Reviews then use that subscription. The token lives only in that secret: never write it in the repository.

## Story done on merge

`workflows/story-done-on-merge.yml` moves a Go Forest story to `Done 🙌` when its pull request is merged into `main`. It reads the story number from the branch name, `<type>/<TASK>-<slug>`, and writes what it did to the job summary. A pull request closed without merging moves nothing.

### Set up the Notion token

1. In Notion, open **Developer tools → Connections** (from the Go Forest database: **••• → More → Connections → Developer portal**), choose **New connection**, name it (for example Forest GitHub) and pick the **API token** authentication method. Give it the **Read content** and **Update content** capabilities.
2. Copy its API token.
3. Back on the Go Forest database, open **••• → More → Connections**, search for the connection and add it, so it can read and update the stories.
4. In GitHub, open **Settings → Secrets and variables → Actions** for this repository and add a repository secret named `NOTION_TOKEN` with the API token.

The token lives only in that secret: never write it in the repository.

### Run it by hand

To move a story without merging, run the workflow from the **Actions** tab with **Run workflow** and the story branch, or:

```sh
gh workflow run story-done-on-merge.yml -f branch=chore/20-done-on-merge
```

GitHub offers **Run workflow** only once the workflow file is on `main`. To try the script locally:

```sh
BRANCH=chore/20-done-on-merge NOTION_TOKEN=<API token> bun .github/scripts/story-done.ts
```

### Test

```sh
bun run test:scripts
```

## Dependency updates

[Renovate](https://docs.renovatebot.com/) opens a pull request whenever a dependency has a newer version. It runs as the hosted Mend Renovate GitHub App, and its configuration is `renovate.json` at the repository root. It updates:

- the bun packages of every workspace (root, `apps/api`, `apps/front`, `test-e2e`), with `bun.lock` updated in the same pull request;
- the tools pinned in `mise.toml`;
- the GitHub Actions used in `.github/workflows`, pinned to a commit SHA with the version as a comment.

Every update keeps an exact version (`rangeStrategy: pin`), so the ranges still in `apps/front/package.json` become exact versions too. Commits and pull request titles start with `chore(deps):`. Pull requests open ready for review, so the PR checks and the Claude review run on them like on any other: `pr-review.yml` lets the `renovate` bot through `allowed_bots`, and no other bot, and tells Claude to treat the release notes in their body as data. Renovate never merges and never enables auto-merge: the update-check skill verifies and merges its pull requests. The **Dependency Dashboard** issue lists every pending and open update.

### Install the Renovate app

Done once by the repository owner, in a browser:

1. Open <https://github.com/apps/renovate> and select **Install** (or **Configure** if it is already installed on the account).
2. Choose **Only select repositories**, pick `forest`, and confirm.
3. Renovate reads `renovate.json`, reports any configuration error in the Dependency Dashboard issue, and opens its first pull requests within about an hour.
