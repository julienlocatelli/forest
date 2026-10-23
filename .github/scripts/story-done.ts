// Moves the Go Forest story of a merged branch to Done.
// Usage: BRANCH=<type>/<TASK>-<slug> NOTION_TOKEN=... bun .github/scripts/story-done.ts
import { appendFileSync } from 'node:fs';
import { type Fetch, notion, storiesWithTask, storyName, taskFromBranch } from './notion.ts';

const DONE = 'Done 🙌';

export interface Outcome {
  ok: boolean;
  summary: string;
}

async function moveToDone(branch: string, token: string, fetcher: Fetch): Promise<Outcome> {
  const task = taskFromBranch(branch);
  // Branches that are not story branches, such as dependency updates, have no story to move.
  if (task === undefined)
    return { ok: true, summary: `Skipped: branch "${branch}" has no TASK number (expected <type>/<TASK>-<slug>).` };

  const results = await storiesWithTask(fetcher, token, task);
  if (results.length === 0) return { ok: false, summary: `No Go Forest story has TASK-${task}.` };
  if (results.length > 1)
    return { ok: false, summary: `${results.length} Go Forest stories have TASK-${task}: none was moved.` };

  const [story] = results;
  const link = `[TASK-${task} ${storyName(story)}](${story.url})`;
  const previous = story.properties.Status.select?.name ?? 'none';
  if (previous === DONE) return { ok: true, summary: `${link} is already in ${DONE}: nothing to do.` };

  await notion(fetcher, token, 'PATCH', `/pages/${story.id}`, {
    properties: { Status: { select: { name: DONE } } },
  });
  return { ok: true, summary: `Moved ${link} from ${previous} to ${DONE}.` };
}

// Never throws: every failure becomes an outcome whose summary names the cause.
export async function storyDone(branch: string, token: string, fetcher: Fetch = fetch): Promise<Outcome> {
  try {
    return await moveToDone(branch, token, fetcher);
  } catch (error) {
    return { ok: false, summary: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const branch = process.env.BRANCH ?? '';
  const token = process.env.NOTION_TOKEN ?? '';
  const outcome = token
    ? await storyDone(branch, token)
    : { ok: false, summary: 'NOTION_TOKEN is not set.' };
  console.log(outcome.summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${outcome.summary}\n`);
  // Exit explicitly so a failed outcome always fails the job step.
  process.exit(outcome.ok ? 0 : 1);
}

if (import.meta.main) await main();
