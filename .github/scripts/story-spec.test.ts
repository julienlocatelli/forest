import { describe, expect, test } from 'bun:test';
import { storyMarkdown, storySpec } from './story-spec.ts';

const rich = (content: string) => ({ rich_text: [{ plain_text: content }] });
const block = (type: string, content: string, extra: object = {}) => ({ type, [type]: { ...rich(content), ...extra } });

const story = {
  id: 'page-id',
  url: 'https://app.notion.com/p/page-id',
  properties: { Name: { title: [{ plain_text: '[BLF-16] Review pull requests' }] }, Status: { select: null } },
};

// A Notion API stand-in: answers the story query, then the page's blocks in pages (the second one after a
// `next cursor` cursor), and the children of any block listed in `children`.
function fakeNotion(stories: unknown[], blockPages: unknown[][] = [], children: Record<string, unknown[]> = {}) {
  const calls: string[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method} ${url.replace('https://api.notion.com/v1', '')}`);
    if (init.method === 'POST') return Response.json({ results: stories });
    const id = /\/blocks\/([^/]+)\/children/.exec(url)?.[1] ?? '';
    if (id !== 'page-id') return Response.json({ results: children[id] ?? [], has_more: false, next_cursor: null });
    const index = url.includes('start_cursor=') ? 1 : 0;
    const more = index < blockPages.length - 1;
    return Response.json({ results: blockPages[index] ?? [], has_more: more, next_cursor: more ? 'next cursor' : null });
  }) as typeof fetch;
  return { calls, fetcher };
}

describe('storyMarkdown', () => {
  test('renders the story sections and stops at the task board', () => {
    const markdown = storyMarkdown([
      block('heading_2', 'User story'),
      block('paragraph', 'As a Forest developer'),
      block('heading_2', 'Acceptance criteria'),
      block('to_do', 'Runs on pull requests', { checked: true }),
      block('to_do', 'Posts one comment', { checked: false }),
      block('heading_2', 'Out of scope'),
      block('bulleted_list_item', 'Inline comments'),
      block('code', 'Feature: Review', { language: 'gherkin' }),
      block('heading_1', 'To Do'),
      block('paragraph', 'never rendered'),
    ]);

    expect(markdown).toBe(
      [
        '## User story',
        '',
        'As a Forest developer',
        '',
        '## Acceptance criteria',
        '',
        '- [x] Runs on pull requests',
        '- [ ] Posts one comment',
        '## Out of scope',
        '',
        '- Inline comments',
        '```gherkin',
        'Feature: Review',
        '```',
      ].join('\n'),
    );
  });
});

describe('storyMarkdown with nested blocks', () => {
  test('renders the children of a block indented under it', () => {
    const markdown = storyMarkdown([
      { ...block('bulleted_list_item', 'Parent'), children: [{ ...block('to_do', 'Child', { checked: false }), children: [block('paragraph', 'Grandchild')] }] },
      block('heading_1', 'To Do'),
    ]);

    expect(markdown).toBe(['- Parent', '  - [ ] Child', '    Grandchild'].join('\n'));
  });
});

describe('storySpec', () => {
  test('reads the children of blocks that have some, but not of sub-pages or databases', async () => {
    const { calls, fetcher } = fakeNotion(
      [story],
      [
        [
          { id: 'list', has_children: true, ...block('bulleted_list_item', 'Criterion') },
          { id: 'board', has_children: true, type: 'child_database', child_database: { title: 'Tasks' } },
        ],
      ],
      { list: [block('bulleted_list_item', 'Nested detail')] },
    );

    const spec = await storySpec('chore/26-claude-pr-review', 'token', fetcher);

    expect(calls).toContain('GET /blocks/list/children?page_size=100');
    expect(calls.some((call) => call.includes('/blocks/board/'))).toBe(false);
    expect(spec.markdown).toEndWith('- Criterion\n  - Nested detail\n');
  });

  test('writes the story of the branch, reading every page of its blocks', async () => {
    const { calls, fetcher } = fakeNotion(
      [story],
      [[block('heading_2', 'User story')], [block('paragraph', 'As a Forest developer')]],
    );

    const spec = await storySpec('chore/26-claude-pr-review', 'token', fetcher);

    expect(calls).toEqual([
      'POST /data_sources/e3ef2fdf-b522-4b2a-9e07-e875c6249370/query',
      'GET /blocks/page-id/children?page_size=100',
      'GET /blocks/page-id/children?page_size=100&start_cursor=next%20cursor',
    ]);
    expect(spec).toEqual({
      ok: true,
      markdown:
        '# TASK-26: [BLF-16] Review pull requests\n\nNotion: https://app.notion.com/p/page-id\n\n## User story\n\nAs a Forest developer\n',
    });
  });

  test('marks the spec unavailable for a branch without a TASK number, without calling Notion', async () => {
    const { calls, fetcher } = fakeNotion([story]);

    expect(await storySpec('renovate/bun-1.x', 'token', fetcher)).toEqual({
      ok: false,
      markdown:
        'Spec unavailable: branch "renovate/bun-1.x" has no TASK number (expected <type>/<TASK>-<slug>), so it has no Go Forest story.\n',
    });
    expect(calls).toEqual([]);
  });

  test('marks the spec unavailable when the TASK number matches no story', async () => {
    const { fetcher } = fakeNotion([]);

    expect(await storySpec('chore/999-unknown', 'token', fetcher)).toEqual({
      ok: false,
      markdown: 'Spec unavailable: expected one Go Forest story with TASK-999, found 0.\n',
    });
  });

  test('marks the spec unavailable with the Notion error when Notion refuses the request', async () => {
    const fetcher = (async () => new Response('{"code":"unauthorized"}', { status: 401 })) as unknown as typeof fetch;

    const spec = await storySpec('chore/26-claude-pr-review', 'token', fetcher);

    expect(spec.ok).toBe(false);
    expect(spec.markdown).toStartWith('Spec unavailable: Notion refused POST');
  });
});
