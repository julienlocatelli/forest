import { describe, expect, test } from 'bun:test';
import { commentableLines, postReview, type Review } from './post-review.ts';

type Call = { method: string; path: string; body?: unknown };

// A GitHub API stand-in: serves the pull request's files, review comments and issue comments, and records every call.
function fakeGitHub(state: { files?: unknown[]; reviewComments?: unknown[]; issueComments?: unknown[] }) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace('https://api.github.com', '');
    calls.push({ method, path, body: init.body ? JSON.parse(String(init.body)) : undefined });
    if (method !== 'GET') return Response.json({ id: 1 });
    const page = Number(new URL(url).searchParams.get('page') ?? '1');
    const list = path.includes('/files')
      ? state.files
      : path.includes('/pulls/14/comments')
        ? state.reviewComments
        : state.issueComments;
    return Response.json(page === 1 ? (list ?? []) : []);
  }) as typeof fetch;
  return { calls, fetcher, writes: () => calls.filter((call) => call.method !== 'GET') };
}

const patch = ['@@ -1,3 +1,4 @@', ' const a = 1;', '-const b = 2;', '+const b = 3;', '+const c = 4;', ' export { a };'].join(
  '\n',
);
const files = [{ filename: 'src/a.ts', patch }];
const review: Review = {
  summary: '## Standards\n\nNothing else.\n\n## Spec\n\nAll criteria met.',
  inline: [
    { path: 'src/a.ts', line: 2, code: 'const b = 3;', axis: 'Standards', body: 'Possible Mysterious Name: `b`.' },
    { path: 'src/a.ts', line: 40, code: 'const y = 0;', axis: 'Spec', body: 'This line is not in the diff.' },
  ],
};
const options = { repo: 'owner/forest', pr: 14, token: 'token' };

describe('commentableLines', () => {
  test('maps the new-side lines of every hunk, context and added lines, not removed ones, to their text', () => {
    expect([...commentableLines(patch)]).toEqual([
      [1, 'const a = 1;'],
      [2, 'const b = 3;'],
      [3, 'const c = 4;'],
      [4, 'export { a };'],
    ]);
    expect([...commentableLines('@@ -10,2 +20,2 @@\n context\n+added').keys()]).toEqual([20, 21]);
    expect(commentableLines(undefined).size).toBe(0);
  });
});

describe('postReview', () => {
  test('posts the findings on diff lines as one COMMENT review and the rest in a new summary comment', async () => {
    const { fetcher, writes } = fakeGitHub({ files });

    await postReview(review, { ...options, fetcher });

    const [reviewCall, summaryCall] = writes();
    expect(reviewCall).toMatchObject({ method: 'POST', path: '/repos/owner/forest/pulls/14/reviews' });
    expect(reviewCall.body).toEqual({
      event: 'COMMENT',
      body: 'Claude review: 1 inline comment. The summary is in the "Claude review" comment.',
      comments: [
        {
          path: 'src/a.ts',
          line: 2,
          side: 'RIGHT',
          body: '<!-- claude-pr-review-inline -->\n**Standards**: Possible Mysterious Name: `b`.',
        },
      ],
    });
    expect(summaryCall).toMatchObject({ method: 'POST', path: '/repos/owner/forest/issues/14/comments' });
    expect((summaryCall.body as { body: string }).body).toBe(
      [
        '<!-- claude-pr-review -->',
        '# Claude review',
        '',
        '## Standards',
        '',
        'Nothing else.',
        '',
        '## Spec',
        '',
        'All criteria met.',
        '',
        '## Findings outside the diff',
        '',
        '- **Spec** `src/a.ts:40`: This line is not in the diff.',
        '',
        '1 inline comment on the diff.',
      ].join('\n'),
    );
  });

  test('updates the existing summary comment instead of adding another', async () => {
    const { fetcher, writes } = fakeGitHub({
      files,
      issueComments: [
        { id: 5, body: 'a human comment' },
        { id: 7, body: '<!-- claude-pr-review -->\n# Claude review\nold' },
      ],
    });

    await postReview(review, { ...options, fetcher });

    expect(writes().at(-1)).toMatchObject({ method: 'PATCH', path: '/repos/owner/forest/issues/comments/7' });
  });

  test('deletes previous inline comments nobody replied to, and keeps replied threads and human comments', async () => {
    const { fetcher, writes } = fakeGitHub({
      files,
      reviewComments: [
        { id: 21, body: '<!-- claude-pr-review-inline -->\n**Standards**: old, no reply' },
        { id: 22, body: '<!-- claude-pr-review-inline -->\n**Spec**: old, with a reply' },
        { id: 23, body: 'I disagree', in_reply_to_id: 22 },
        { id: 24, body: 'a human inline comment' },
      ],
    });

    await postReview(review, { ...options, fetcher });

    const deletes = writes().filter((call) => call.method === 'DELETE');
    expect(deletes.map((call) => call.path)).toEqual(['/repos/owner/forest/pulls/comments/21']);
    expect(writes()[0].method).toBe('DELETE');
  });

  test('does not repeat a finding on a line whose previous thread got a reply, and lists it in the summary', async () => {
    const { fetcher, writes } = fakeGitHub({
      files,
      reviewComments: [
        { id: 22, path: 'src/a.ts', line: 2, body: '<!-- claude-pr-review-inline -->\n**Standards**: old, with a reply' },
        { id: 23, path: 'src/a.ts', line: 2, body: 'Kept on purpose', in_reply_to_id: 22 },
      ],
    });

    await postReview(review, { ...options, fetcher });

    expect(writes().map((call) => `${call.method} ${call.path}`)).toEqual(['POST /repos/owner/forest/issues/14/comments']);
    expect((writes()[0].body as { body: string }).body).toContain(
      '## Findings on lines already discussed\n\n- **Standards** `src/a.ts:2`: Possible Mysterious Name: `b`.',
    );
  });

  test('moves a finding to the line holding its quoted code when its line number is wrong', async () => {
    const { fetcher, writes } = fakeGitHub({ files });

    await postReview(
      { summary: 'S', inline: [{ path: 'src/a.ts', line: 4, code: 'const c = 4;', axis: 'Standards', body: 'Unused.' }] },
      { ...options, fetcher },
    );

    expect((writes()[0].body as { comments: { line: number }[] }).comments[0].line).toBe(3);
  });

  test('moves a finding to the summary instead of guessing when its short or repeated code fits several lines', async () => {
    const repeated = [{ filename: 'src/b.ts', patch: '@@ -0,0 +1,4 @@\n+if (a) {\n+  return;\n+}\n+return;' }];
    const { fetcher, writes } = fakeGitHub({ files: repeated });

    await postReview(
      {
        summary: 'S',
        inline: [
          { path: 'src/b.ts', line: 1, code: '}', axis: 'Standards', body: 'Too short to place.' },
          { path: 'src/b.ts', line: 1, code: 'return;', axis: 'Standards', body: 'On two lines.' },
        ],
      },
      { ...options, fetcher },
    );

    expect(writes().map((call) => call.method)).toEqual(['POST']);
    const body = (writes()[0].body as { body: string }).body;
    expect(body).toContain('- **Standards** `src/b.ts:1`: Too short to place.');
    expect(body).toContain('- **Standards** `src/b.ts:1`: On two lines.');
  });

  test('moves a finding to the summary when its quoted code is on no diff line', async () => {
    const { fetcher, writes } = fakeGitHub({ files });

    await postReview(
      { summary: 'S', inline: [{ path: 'src/a.ts', line: 2, code: 'const z = 9;', axis: 'Spec', body: 'Missing.' }] },
      { ...options, fetcher },
    );

    expect(writes().map((call) => call.method)).toEqual(['POST']);
    expect((writes()[0].body as { body: string }).body).toContain('- **Spec** `src/a.ts:2`: Missing.');
  });

  test('posts no review when no finding points at a diff line', async () => {
    const { fetcher, writes } = fakeGitHub({ files });

    await postReview({ summary: '## Standards\n\nNone.', inline: [] }, { ...options, fetcher });

    expect(writes().map((call) => `${call.method} ${call.path}`)).toEqual(['POST /repos/owner/forest/issues/14/comments']);
    expect((writes()[0].body as { body: string }).body).toEndWith('No inline comment on the diff.');
  });

  test('still updates the summary, with the inline findings and the reason, when GitHub refuses the review', async () => {
    const calls: string[] = [];
    const fetcher = (async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET';
      const path = url.replace('https://api.github.com', '');
      calls.push(`${method} ${path}`);
      if (method === 'POST' && path.endsWith('/reviews')) return new Response('{"message":"Validation Failed"}', { status: 422 });
      if (method !== 'GET') return Response.json({ id: 1 });
      return Response.json(path.includes('/files') && path.includes('page=1') ? files : []);
    }) as typeof fetch;
    let summary = '';
    const recording = (async (url: string, init: RequestInit = {}) => {
      if ((init.method ?? 'GET') === 'POST' && url.endsWith('/issues/14/comments')) summary = JSON.parse(String(init.body)).body;
      return fetcher(url, init);
    }) as typeof fetch;

    const log = await postReview(review, { ...options, fetcher: recording });

    expect(calls).toContain('POST /repos/owner/forest/issues/14/comments');
    expect(summary).toContain('## Findings GitHub refused inline');
    expect(summary).toContain('- **Standards** `src/a.ts:2`: Possible Mysterious Name: `b`.');
    expect(summary).toContain('No inline comment on the diff.');
    expect(log.join('\n')).toContain('GitHub refused the inline review');
  });

  test('fails with the GitHub error when GitHub refuses a request', async () => {
    const fetcher = (async () => new Response('{"message":"Bad credentials"}', { status: 401 })) as unknown as typeof fetch;

    expect(postReview(review, { ...options, fetcher })).rejects.toThrow('GitHub refused GET');
  });
});
