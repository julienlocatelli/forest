import { describe, expect, test } from 'bun:test';
import { deleteMergedBranch } from './delete-branch.ts';

type Call = { method: string; url: string };

// A GitHub API stand-in: records every call and answers each with `answer(method, url)`.
function fakeGitHub(answer: (method: string, url: string) => Response = () => new Response(null, { status: 204 })) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url });
    return answer(method, url);
  }) as typeof fetch;
  return { calls, fetcher };
}

const merged = { repo: 'owner/forest', headRepo: 'owner/forest', branch: 'chore/47-delete-merged-branch', pr: 70, token: 'token' };

describe('deleteMergedBranch', () => {
  test('deletes the head branch of a merged pull request and says so', async () => {
    const { calls, fetcher } = fakeGitHub((method) =>
      method === 'GET' ? new Response('[]', { status: 200 }) : new Response(null, { status: 204 }),
    );

    const outcome = await deleteMergedBranch({ ...merged, fetcher });

    expect(calls.at(-1)).toEqual({
      method: 'DELETE',
      url: 'https://api.github.com/repos/owner/forest/git/refs/heads/chore/47-delete-merged-branch',
    });
    expect(outcome).toEqual({
      ok: true,
      summary: 'Deleted branch "chore/47-delete-merged-branch": pull request #70 is merged.',
    });
  });

  test('reports a refused deletion as a failure', async () => {
    const { fetcher } = fakeGitHub((method) =>
      method === 'GET' ? new Response('[]', { status: 200 }) : new Response('{"message":"Forbidden"}', { status: 403 }),
    );

    const outcome = await deleteMergedBranch({ ...merged, fetcher });

    expect(outcome.ok).toBe(false);
    expect(outcome.summary).toContain('403');
  });

  test('keeps main', async () => {
    const { calls, fetcher } = fakeGitHub();

    const outcome = await deleteMergedBranch({ ...merged, branch: 'main', fetcher });

    expect(calls).toEqual([]);
    expect(outcome).toEqual({ ok: true, summary: 'Kept branch "main": it is the default branch.' });
  });

  test('keeps a branch from a fork', async () => {
    const { calls, fetcher } = fakeGitHub();

    const outcome = await deleteMergedBranch({ ...merged, headRepo: 'someone/forest', fetcher });

    expect(calls).toEqual([]);
    expect(outcome).toEqual({
      ok: true,
      summary: 'Kept branch "chore/47-delete-merged-branch": it belongs to the fork someone/forest.',
    });
  });

  test('keeps a branch another open pull request is based on, and names it', async () => {
    const { calls, fetcher } = fakeGitHub(() => new Response('[{"number":71},{"number":72}]', { status: 200 }));

    const outcome = await deleteMergedBranch({ ...merged, fetcher });

    expect(calls).toEqual([
      {
        method: 'GET',
        url: 'https://api.github.com/repos/owner/forest/pulls?state=open&base=chore%2F47-delete-merged-branch&per_page=100',
      },
    ]);
    expect(outcome).toEqual({
      ok: true,
      summary: 'Kept branch "chore/47-delete-merged-branch": open pull requests #71, #72 are based on it.',
    });
  });

  for (const status of [404, 422])
    test(`succeeds when the branch is already deleted (${status})`, async () => {
      const { fetcher } = fakeGitHub((method) =>
        method === 'GET'
          ? new Response('[]', { status: 200 })
          : new Response('{"message":"Reference does not exist"}', { status }),
      );

      const outcome = await deleteMergedBranch({ ...merged, fetcher });

      expect(outcome).toEqual({
        ok: true,
        summary: 'Branch "chore/47-delete-merged-branch" was already deleted: nothing to do.',
      });
    });
});
