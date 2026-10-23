// Writes the Go Forest story of a branch as a Markdown spec, for the Claude pull request review.
// Usage: BRANCH=<type>/<TASK>-<slug> NOTION_TOKEN=... bun .github/scripts/story-spec.ts <spec file>
import { writeFileSync } from 'node:fs';
import type { Fetch } from './http.ts';
import { notion, storiesWithTask, storyName, taskFromBranch } from './notion.ts';

export interface Spec {
  ok: boolean;
  // The spec file's content: the story, or a line starting with "Spec unavailable: " that says why there is none.
  markdown: string;
}

// The review skips its spec axis when the spec file starts with this prefix.
const UNAVAILABLE = 'Spec unavailable: ';

function unavailable(reason: string): Spec {
  return { ok: false, markdown: `${UNAVAILABLE}${reason}\n` };
}

interface Block {
  type: string;
  id?: string;
  has_children?: boolean;
  // Filled by `pageBlocks` for blocks that have nested content.
  children?: Block[];
  [key: string]: unknown;
}

// The type-specific part of a block, such as `block.paragraph` for a paragraph.
interface Payload {
  rich_text?: { plain_text: string }[];
  checked?: boolean;
  language?: string;
}

function payload(block: Block): Payload {
  return (block[block.type] ?? {}) as Payload;
}

function plain(block: Block): string {
  return (payload(block).rich_text ?? []).map((part) => part.plain_text).join('');
}

const HEADINGS: Record<string, string> = { heading_1: '#', heading_2: '##', heading_3: '###' };

function render(block: Block, indent: string): string[] {
  const line = plain(block);
  switch (block.type) {
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
      return [`${HEADINGS[block.type]} ${line}`, ''];
    case 'bulleted_list_item':
      return [`${indent}- ${line}`];
    case 'numbered_list_item':
      return [`${indent}1. ${line}`];
    case 'to_do':
      return [`${indent}- [${payload(block).checked ? 'x' : ' '}] ${line}`];
    case 'code':
      return [`${indent}\`\`\`${payload(block).language ?? ''}`, `${indent}${line}`, `${indent}\`\`\``, ''];
    case 'paragraph':
      return indent ? [`${indent}${line}`] : [line, ''];
    default:
      return [];
  }
}

function renderAll(blocks: Block[], indent: string): string[] {
  const lines: string[] = [];
  for (const block of blocks) {
    if (!indent && block.type === 'heading_1' && plain(block).trim() === 'To Do') break;
    lines.push(...render(block, indent));
    if (block.children?.length) lines.push(...renderAll(block.children, `${indent}  `));
  }
  return lines;
}

// Renders the story's blocks, with nested blocks indented, up to its `# To Do` section, which only holds the task board.
export function storyMarkdown(blocks: Block[]): string {
  return renderAll(blocks, '').join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Sub-pages and databases are other pages: their content is not part of the story.
const SEPARATE = new Set(['child_page', 'child_database']);

// Reads every block under `blockId`, page by page, with the children of the blocks that have some.
async function pageBlocks(fetcher: Fetch, token: string, blockId: string): Promise<Block[]> {
  const blocks: Block[] = [];
  let cursor: string | undefined;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const page = (await notion(fetcher, token, 'GET', `/blocks/${blockId}/children${query}`)) as {
      results: Block[];
      has_more: boolean;
      next_cursor: string | null;
    };
    blocks.push(...page.results);
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  for (const block of blocks)
    if (block.has_children && block.id && !SEPARATE.has(block.type))
      block.children = await pageBlocks(fetcher, token, block.id);
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
