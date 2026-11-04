# GitHub automation

## PR checks

`workflows/pr-checks.yml` runs the repository checks on every pull request into `main`: when it is opened, pushed to, reopened or marked ready for review. A new push cancels the run still going on the same pull request. The job needs no secret and touches no database, so end-to-end scenarios stay local. It builds no native iOS or Android binary: the mobile app is type-checked, linted and unit-tested.

Each check is its own step, named in the run:

| Step | Command |
| --- | --- |
| Generate the Prisma client | `bun run --cwd apps/api prisma:generate` |
| API lint | `bun run --cwd apps/api lint` |
| API unit tests | `bun run --cwd apps/api test` |
| Front lint | `bun run --cwd apps/front lint` |
| Front build | `bun run --cwd apps/front build` |
| Design tokens tests | `bun run --cwd packages/design-tokens test` |
| Web components tests | `bun run --cwd packages/ui test` |
| Storybook build | `bun run --cwd packages/ui build-storybook` |
| Mobile components type-check | `bun run --cwd packages/ui-native typecheck` |
| Mobile components tests | `bun run --cwd packages/ui-native test` |
| Mobile app type-check | `bun run --cwd apps/mobile typecheck` |
| Mobile app lint | `bun run --cwd apps/mobile lint` |
| Mobile app tests | `bun run --cwd apps/mobile test` |
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

## Delete merged branch

`workflows/delete-merged-branch.yml` deletes the head branch of a pull request merged into `main`, whoever merged it: `/merge-story`, the GitHub interface, `gh pr merge` or Renovate. A pull request closed without merging keeps its branch. `.github/scripts/delete-branch.ts` decides, with the workflow's `GITHUB_TOKEN` (`contents: write`), and writes one line to the log and the job summary naming the branch and why it was deleted or kept:

| Case | Outcome |
| --- | --- |
| Merged branch of this repository | Deleted |
| `main` | Kept |
| Branch of a fork | Kept: the workflow never touches another repository |
| Base of another open pull request | Kept, naming those pull requests; delete it by hand once they are merged or retargeted |
| Already deleted, for example by `/merge-story` | Success, nothing to do |

Branches merged before this workflow existed are not cleaned up. To test the script:

```sh
bun test ./.github/scripts/delete-branch.test.ts
```

## Clean merged local branches

`mise run clean-branches` cleans the local clone; it works from any directory inside it, since mise runs its tasks from the repository root. It needs `gh` signed in to GitHub. `.github/scripts/clean-branches.ts`:

1. Runs `git fetch --prune origin`, which removes the `origin/*` references of branches deleted on GitHub.
2. Reads the pull requests merged into `main` with `gh`.
3. Deletes a local branch only when one of those pull requests has it as head branch and contains its tip: the branch holds no commit the pull request lacks.
4. Prints every deleted branch, and every kept branch with its reason.

It never deletes:

- `main`;
- a branch without a merged pull request into `main`;
- a branch with commits its merged pull request does not contain, such as work pushed after the merge.

When the current branch is to be deleted, it first switches to `main` and pulls it from GitHub. With uncommitted changes in the working tree, it deletes nothing at all, says why and exits with an error. Running it again right away deletes nothing and lists the same kept branches.

## Dependency updates

[Renovate](https://docs.renovatebot.com/) opens a pull request whenever a dependency has a newer version. It runs as the hosted Mend Renovate GitHub App, and its configuration is `renovate.json` at the repository root. It updates:

- the bun packages of every workspace (root, `apps/api`, `apps/front`, `test-e2e`), with `bun.lock` updated in the same pull request;
- the tools pinned in `mise.toml`;
- the GitHub Actions used in `.github/workflows`, pinned to a commit SHA with the version as a comment.

`prisma` and the `@prisma/*` packages move together in one pull request, since Prisma's CLI, client and adapters must share one version. Every update keeps an exact version (`rangeStrategy: pin`), so the ranges still in `apps/front/package.json` become exact versions too. In the React Native workspaces (`packages/ui-native`, `apps/mobile`), Jest and Babel get no major update: `@react-native/jest-preset` bundles Jest 29 and Babel 7, so they move when the preset does. Peer dependency ranges, such as `react` in `packages/ui`, are the other exception: they stay ranges (`rangeStrategy: widen`), since an exact peer version would conflict with every consumer on another version. Commits and pull request titles start with `chore(deps):`. Pull requests open ready for review, so the PR checks and the Claude review run on them like on any other: `pr-review.yml` lets the `renovate` bot through `allowed_bots`, and no other bot, and tells Claude to treat the release notes in their body as data. Renovate never merges and never enables auto-merge: the update-check skill verifies and merges its pull requests. The **Dependency Dashboard** issue lists every pending and open update.

### Install the Renovate app

Done once by the repository owner, in a browser:

1. Open <https://github.com/apps/renovate> and select **Install** (or **Configure** if it is already installed on the account).
2. Choose **Only select repositories**, pick `forest`, and confirm.
3. Renovate reads `renovate.json`, reports any configuration error in the Dependency Dashboard issue, and opens its first pull requests within about an hour.

## Releases

`workflows/release.yml` runs [release-please](https://github.com/googleapis/release-please) on every push to `main`. It reads the Conventional Commits merged since each package's last release and keeps one release pull request open, from the `release-please--branches--main` branch. Its configuration is `release-please-config.json`, and `.release-please-manifest.json` holds each package's last released version.

### Released packages

| Package | Folder | Tag |
| --- | --- | --- |
| `api` | `apps/api` | `api-v<version>` |
| `front` | `apps/front` | `front-v<version>` |
| `ui` | `packages/ui` | `ui-v<version>` |
| `design-tokens` | `packages/design-tokens` | `design-tokens-v<version>` |
| `ui-native` | `packages/ui-native` | `ui-native-v<version>` |

Each one is released on its own. A commit counts for a package only when it changes a file in that package's folder; a commit that changes no package, like most skill or workflow changes, releases nothing. `apps/mobile` and `test-e2e` are not released. History before `bootstrap-sha` in the configuration bumps nothing: each package started from the version its `package.json` held then.

### Bump rules

| Commit | Bump |
| --- | --- |
| `feat` | Minor: `0.1.0` → `0.2.0` |
| `fix` | Patch: `0.1.0` → `0.1.1` |
| A breaking change, `!` after the type or a `BREAKING CHANGE:` footer, whatever the type | Major, also from `0.x`: `0.1.0` → `1.0.0` |
| Any other type: `chore`, `docs`, `refactor`, `test`, `ci`, `perf`… | None |

### Changelogs

Each package has a `CHANGELOG.md` in its folder, with one section per version, newest first. A section lists the breaking changes, then the `feat` and `fix` commits under **Features** and **Bug Fixes**, each linking to its commit. Other types are left out: release-please releases every type it shows in a changelog, so showing `chore` or `docs` would make them bump a patch version.

### The release pull request

The pull request bumps the `version` of each bumped package's `package.json`, adds its changelog section, updates `.release-please-manifest.json`, and lists each bumped package with its new version and changelog section in its description. Internal `workspace:*` ranges stay as they are. Each merge into `main` that bumps a package updates it; a merge that bumps nothing leaves it as it is.

`bun.lock` records each workspace's version too, and release-please does not update it. The workflow then checks out the release branch, runs `bun install --lockfile-only` and pushes `bun.lock` when it changed, so a later `bun install` changes nothing.

The release pull request is never a story: `/merge-story`, `/dev-loop` and the update-check skill never take it, and the story-done workflow skips its branch. The PR checks and the Claude review run on it as on any pull request; the review skips its spec axis, since the branch has no TASK number.

### Preview the next versions

```sh
mise run versions
```

It prints what the release pull request would hold if the workflow ran now: each package that would be bumped, its next version and the `feat`, `fix` and breaking commits behind it. When nothing would be bumped, it says `No package changes`. It runs the pinned release-please command-line tool with `--dry-run`, so it opens no pull request and writes no file, branch, tag or GitHub Release.

release-please reads the commits, the configuration and the manifest from `main` on GitHub, like the workflow. The preview shows what `main` would release, not your local branch: to see your change, merge it first.

It needs a GitHub token, even for a dry run, and takes it from the signed-in `gh`. When there is none, it stops and asks you to run `mise exec -- gh auth login`.

### Release

Merge the release pull request once its checks pass. The next workflow run creates one tag per bumped package, such as `front-v0.2.0`, and one GitHub Release per tag whose notes are that version's changelog section. It opens no new release pull request until a later commit bumps a package again.

GitHub sometimes answers a release creation with a server error. The run then fails, and the merged release pull request keeps its `autorelease: pending` label. Re-run the failed job (`gh run rerun <run id>`): release-please skips the releases already created, creates the missing ones, and moves the pull request to `autorelease: tagged`. A re-run that finds every release already created still fails, with `already_exists`, but only after updating the label, so the next push to `main` runs normally.

### Set up the release token

A pull request opened with the workflow's own `GITHUB_TOKEN` starts no workflow, so neither the checks nor the review would run on the release pull request. The workflow uses a fine-grained personal access token instead, and `main`'s protection gets no exception.

1. In GitHub, open your avatar → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Set **Resource owner** to the repository's owner, **Repository access** to **Only select repositories** with `forest`, and under **Repository permissions** give **Contents** and **Pull requests** *Read and write*. Pick an expiration; create a new token before it expires.
3. Add it as a repository secret named `RELEASE_TOKEN` (**Settings → Secrets and variables → Actions**), or run `gh secret set RELEASE_TOKEN`.

The token lives only in that secret: never write it in the repository.
