import { describe, expect, test } from 'bun:test';
import { requestJson } from './http.ts';

// A fetch stand-in that answers every request with `response`.
const answering = (response: () => Response) => (async () => response()) as unknown as typeof fetch;

describe('requestJson', () => {
  test('returns the JSON answer', async () => {
    const fetcher = answering(() => Response.json({ id: 1 }));
    expect(await requestJson(fetcher, 'GitHub', 'GET', 'https://api.github.com/x', {})).toEqual({ id: 1 });
  });

  test('returns undefined for an empty answer, such as a 204 to a DELETE', async () => {
    const fetcher = answering(() => new Response(null, { status: 204 }));
    expect(await requestJson(fetcher, 'GitHub', 'DELETE', 'https://api.github.com/x', {})).toBeUndefined();
  });

  test('fails with the service, method and path when the answer is not JSON', async () => {
    const fetcher = answering(() => new Response('<html>oops</html>', { status: 200 }));
    await expect(requestJson(fetcher, 'GitHub', 'GET', 'https://api.github.com/repos/x', {})).rejects.toThrow(
      'GitHub answered GET /repos/x with a body that is not JSON: <html>oops</html>',
    );
  });
});
