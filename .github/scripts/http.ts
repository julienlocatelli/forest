// The JSON request the GitHub scripts make to Notion and to GitHub.

export type Fetch = typeof fetch;

// Sends `body` as JSON and returns the JSON answer; a refused request throws with the service's status and message.
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
  if (!response.ok) throw new Error(`${service} refused ${method} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}
