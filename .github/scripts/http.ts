// The JSON request the GitHub scripts make to Notion and to GitHub.

export type Fetch = typeof fetch;

// A request the service refused, with its HTTP status.
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Sends `body` as JSON and returns the JSON answer, or undefined for an empty one such as a 204;
// a refused request throws with the service's status and message.
export async function requestJson(
  fetcher: Fetch,
  service: string,
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
) {
  const response = await fetcher(url, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const path = new URL(url).pathname.replace(/^\/v1/, '');
  if (!response.ok)
    throw new HttpError(`${service} refused ${method} ${path}: ${response.status} ${await response.text()}`, response.status);
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${service} answered ${method} ${path} with a body that is not JSON: ${text.slice(0, 200)}`);
  }
}

const GITHUB = 'https://api.github.com';

// Calls the GitHub REST API with a token, such as the workflow's GITHUB_TOKEN.
export function github(fetcher: Fetch, token: string, method: string, path: string, body?: unknown) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  return requestJson(fetcher, 'GitHub', method, `${GITHUB}${path}`, headers, body);
}
