// What the GitHub scripts share to reach the Go Forest stories in Notion.

const STORIES = 'e3ef2fdf-b522-4b2a-9e07-e875c6249370';
const NOTION = 'https://api.notion.com/v1';

export type Fetch = typeof fetch;

export interface Story {
  id: string;
  url: string;
  properties: {
    Name: { title: { plain_text: string }[] };
    Status: { select: { name: string } | null };
  };
}

// Story branches are named <type>/<TASK>-<slug>, for example chore/20-done-on-merge.
export function taskFromBranch(branch: string): number | undefined {
  const match = /^[a-z]+\/(\d+)-/.exec(branch);
  return match ? Number(match[1]) : undefined;
}

export function storyName(story: Story): string {
  return story.properties.Name.title.map((part) => part.plain_text).join('');
}

export async function notion(fetcher: Fetch, token: string, method: string, path: string, body?: unknown) {
  const response = await fetcher(`${NOTION}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Notion refused ${method} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

// Every Go Forest story whose TASK number is `task`: normally exactly one.
export async function storiesWithTask(fetcher: Fetch, token: string, task: number): Promise<Story[]> {
  const { results } = (await notion(fetcher, token, 'POST', `/data_sources/${STORIES}/query`, {
    filter: { property: 'TASK', unique_id: { equals: task } },
  })) as { results: Story[] };
  return results;
}
