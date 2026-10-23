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

The `checks` job is a required status check on `main`: a pull request whose checks failed or have not finished cannot be merged. Repository admins can still bypass it from the merge button.

## PR review

`workflows/pr-review.yml` has Claude review a pull request into `main` when it is opened ready for review or marked ready for review. It does not run on drafts or on later pushes; to review again, turn the pull request back to draft and mark it ready.

Claude runs the repository's `code-review` skill against `origin/main`, on two axes:

- **Standards**: the repository's documented standards, plus the skill's code smell baseline.
- **Spec**: the Go Forest story found from the branch's TASK number, `<type>/<TASK>-<slug>`. `.github/scripts/story-spec.ts` reads it from Notion with `NOTION_TOKEN` and writes it to a file for the review. When there is no story to read, for example on a branch without a TASK number, the comment still gives the standards review and says why the spec axis was skipped.

The review is posted as one pull request comment, starting with `<!-- claude-pr-review -->`. A new review updates that comment instead of adding another.

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
