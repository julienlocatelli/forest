# GitHub automation

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
