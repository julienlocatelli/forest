import { describe, expect, test } from 'bun:test';
import { storyDone, taskFromBranch } from './story-done.ts';

type Call = { method: string; url: string; body: unknown };

// A Notion API stand-in: answers the query with `stories` and records every call.
// With `status`, every request is refused with that HTTP status.
function fakeNotion(stories: unknown[], status = 200) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? 'GET', url, body: JSON.parse(String(init.body)) });
    if (status !== 200) return new Response('{"code":"unauthorized"}', { status });
    const payload = init.method === 'POST' ? { results: stories } : {};
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof fetch;
  return { calls, fetcher };
}

function story(status: string | null) {
  return {
    id: 'page-id',
    url: 'https://app.notion.com/p/page-id',
    properties: {
      Name: { title: [{ plain_text: '[BLF-14] Move a story' }] },
      Status: { select: status ? { name: status } : null },
    },
  };
}

describe('taskFromBranch', () => {
  test('reads the TASK number of a story branch', () => {
    expect(taskFromBranch('chore/20-done-on-merge')).toBe(20);
    expect(taskFromBranch('feature/6-login-api-route')).toBe(6);
  });

  test('finds none in other branches', () => {
    expect(taskFromBranch('renovate/bun-1.x')).toBeUndefined();
    expect(taskFromBranch('main')).toBeUndefined();
    expect(taskFromBranch('chore/no-number')).toBeUndefined();
  });
});

describe('storyDone', () => {
  test('moves the story of the branch to Done and reports its previous status', async () => {
    const { calls, fetcher } = fakeNotion([story('Review')]);

    const outcome = await storyDone('chore/20-done-on-merge', 'token', fetcher);

    expect(calls[0]).toMatchObject({
      method: 'POST',
      body: { filter: { property: 'TASK', unique_id: { equals: 20 } } },
    });
    expect(calls[1]).toEqual({
      method: 'PATCH',
      url: 'https://api.notion.com/v1/pages/page-id',
      body: { properties: { Status: { select: { name: 'Done 🙌' } } } },
    });
    expect(outcome).toEqual({
      ok: true,
      summary: 'Moved [TASK-20 [BLF-14] Move a story](https://app.notion.com/p/page-id) from Review to Done 🙌.',
    });
  });

  test('leaves a story already in Done unchanged and succeeds', async () => {
    const { calls, fetcher } = fakeNotion([story('Done 🙌')]);

    const outcome = await storyDone('chore/20-done-on-merge', 'token', fetcher);

    expect(calls.map((call) => call.method)).toEqual(['POST']);
    expect(outcome).toEqual({
      ok: true,
      summary: '[TASK-20 [BLF-14] Move a story](https://app.notion.com/p/page-id) is already in Done 🙌: nothing to do.',
    });
  });

  test('skips a branch without a TASK number and succeeds', async () => {
    const { calls, fetcher } = fakeNotion([]);

    const outcome = await storyDone('renovate/bun-1.x', 'token', fetcher);

    expect(calls).toEqual([]);
    expect(outcome).toEqual({
      ok: true,
      summary: 'Skipped: branch "renovate/bun-1.x" has no TASK number (expected <type>/<TASK>-<slug>).',
    });
  });

  test('fails when no story has the TASK number', async () => {
    const { calls, fetcher } = fakeNotion([]);

    const outcome = await storyDone('chore/999-unknown', 'token', fetcher);

    expect(calls.map((call) => call.method)).toEqual(['POST']);
    expect(outcome).toEqual({ ok: false, summary: 'No Go Forest story has TASK-999.' });
  });

  test('fails when several stories have the TASK number', async () => {
    const { calls, fetcher } = fakeNotion([story('Review'), story('Doing')]);

    const outcome = await storyDone('chore/20-done-on-merge', 'token', fetcher);

    expect(calls.map((call) => call.method)).toEqual(['POST']);
    expect(outcome).toEqual({ ok: false, summary: '2 Go Forest stories have TASK-20: none was moved.' });
  });

  test('fails with the Notion error when Notion refuses the request', async () => {
    const { fetcher } = fakeNotion([], 401);

    const outcome = await storyDone('chore/20-done-on-merge', 'token', fetcher);

    expect(outcome.ok).toBe(false);
    expect(outcome.summary).toContain('Notion refused POST');
    expect(outcome.summary).toContain('401');
  });
});
