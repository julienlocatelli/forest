// Moves the Go Forest story of a merged branch to Done.
// Usage: BRANCH=<type>/<TASK>-<slug> NOTION_TOKEN=... bun .github/scripts/story-done.ts
import { appendFileSync } from 'node:fs';

const STORIES = 'e3ef2fdf-b522-4b2a-9e07-e875c6249370';
const DONE = 'Done 🙌';
const NOTION = 'https://api.notion.com/v1';

type Fetch = typeof fetch;

interface Story {
  id: string;
  url: string;
  properties: {
    Name: { title: { plain_text: string }[] };
    Status: { select: { name: string } | null };
  };
}

export interface Outcome {
  ok: boolean;
  summary: string;
}

// Story branches are named <type>/<TASK>-<slug>, for example chore/20-done-on-merge.
export function taskFromBranch(branch: string): number | undefined {
  const match = /^[a-z]+\/(\d+)-/.exec(branch);
  return match ? Number(match[1]) : undefined;
}

async function notion(fetcher: Fetch, token: string, method: string, path: string, body: unknown) {
  const response = await fetcher(`${NOTION}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Notion refused ${method} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function moveToDone(branch: string, token: string, fetcher: Fetch): Promise<Outcome> {
  const task = taskFromBranch(branch);
  // Branches that are not story branches, such as dependency updates, have no story to move.
  if (task === undefined)
    return { ok: true, summary: `Skipped: branch "${branch}" has no TASK number (expected <type>/<TASK>-<slug>).` };

  const { results } = (await notion(fetcher, token, 'POST', `/data_sources/${STORIES}/query`, {
    filter: { property: 'TASK', unique_id: { equals: task } },
  })) as { results: Story[] };
  if (results.length === 0) return { ok: false, summary: `No Go Forest story has TASK-${task}.` };
  if (results.length > 1)
    return { ok: false, summary: `${results.length} Go Forest stories have TASK-${task}: none was moved.` };

  const [story] = results;
  const link = `[TASK-${task} ${story.properties.Name.title.map((part) => part.plain_text).join('')}](${story.url})`;
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
