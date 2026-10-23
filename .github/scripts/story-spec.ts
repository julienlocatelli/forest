// Writes the Go Forest story of a branch as a Markdown spec, for the Claude pull request review.
// Usage: BRANCH=<type>/<TASK>-<slug> NOTION_TOKEN=... bun .github/scripts/story-spec.ts <spec file>
import { writeFileSync } from 'node:fs';
import { type Fetch, notion, storiesWithTask, storyName, taskFromBranch } from './notion.ts';

export interface Spec {
  ok: boolean;
  // The spec file's content: the story, or a line starting with UNAVAILABLE that says why there is none.
  markdown: string;
}

// The review skips its spec axis when the spec file starts with this prefix.
const UNAVAILABLE = 'Spec unavailable: ';

function unavailable(reason: string): Spec {
  return { ok: false, markdown: `${UNAVAILABLE}${reason}\n` };
}

interface Block {
  type: string;
  [type: string]: unknown;
}

interface Text {
  rich_text?: { plain_text: string }[];
  checked?: boolean;
  language?: string;
}

function text(block: Block): Text {
  return (block[block.type] ?? {}) as Text;
}

function plain(block: Block): string {
  return (text(block).rich_text ?? []).map((part) => part.plain_text).join('');
}

// Renders the story's blocks up to its `# To Do` section, which only holds the task board.
export function storyMarkdown(blocks: Block[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const line = plain(block);
    if (block.type === 'heading_1' && line.trim() === 'To Do') break;
    switch (block.type) {
      case 'heading_1':
        lines.push(`# ${line}`, '');
        break;
      case 'heading_2':
        lines.push(`## ${line}`, '');
        break;
      case 'heading_3':
        lines.push(`### ${line}`, '');
        break;
      case 'bulleted_list_item':
        lines.push(`- ${line}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${line}`);
        break;
      case 'to_do':
        lines.push(`- [${text(block).checked ? 'x' : ' '}] ${line}`);
        break;
      case 'code':
        lines.push(`\`\`\`${text(block).language ?? ''}`, line, '```', '');
        break;
      case 'paragraph':
        lines.push(line, '');
        break;
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function pageBlocks(fetcher: Fetch, token: string, pageId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let cursor: string | undefined;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${cursor}` : '?page_size=100';
    const page = (await notion(fetcher, token, 'GET', `/blocks/${pageId}/children${query}`)) as {
      results: Block[];
      has_more: boolean;
      next_cursor: string | null;
    };
    blocks.push(...page.results);
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return blocks;
}

async function readSpec(branch: string, token: string, fetcher: Fetch): Promise<Spec> {
  const task = taskFromBranch(branch);
  if (task === undefined)
    return unavailable(
      `branch "${branch}" has no TASK number (expected <type>/<TASK>-<slug>), so it has no Go Forest story.`,
    );

  const stories = await storiesWithTask(fetcher, token, task);
  if (stories.length !== 1)
    return unavailable(`expected one Go Forest story with TASK-${task}, found ${stories.length}.`);

  const [story] = stories;
  const body = storyMarkdown(await pageBlocks(fetcher, token, story.id));
  return { ok: true, markdown: `# TASK-${task}: ${storyName(story)}\n\nNotion: ${story.url}\n\n${body}\n` };
}

// Never throws: a failure becomes an unavailable spec that names the cause.
export async function storySpec(branch: string, token: string, fetcher: Fetch = fetch): Promise<Spec> {
  try {
    return await readSpec(branch, token, fetcher);
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: bun .github/scripts/story-spec.ts <spec file>');
  const token = process.env.NOTION_TOKEN ?? '';
  const spec = token ? await storySpec(process.env.BRANCH ?? '', token) : unavailable('NOTION_TOKEN is not set.');
  writeFileSync(file, spec.markdown);
  // An unavailable spec does not fail the job: the review still runs its standards axis.
  console.log(spec.ok ? `Wrote the story to ${file}.` : spec.markdown.trim());
}

if (import.meta.main) await main();
