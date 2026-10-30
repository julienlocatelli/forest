// Publishes Claude's pull request review: inline comments on the diff, and one summary comment.
// Usage: GITHUB_TOKEN=... REPO=<owner/name> PR=<number> bun .github/scripts/post-review.ts <review.json>
import { readFileSync } from 'node:fs';
import { type Fetch, requestJson } from './http.ts';

export interface Finding {
  path: string;
  line: number;
  // The exact text of that line, so a wrong line number can be corrected.
  code?: string;
  axis: 'Standards' | 'Spec';
  body: string;
}

// What Claude writes to review.json.
export interface Review {
  // The report's Markdown: the findings that point at no changed line, and the one-line summary.
  summary: string;
  // The findings that point at one changed line of the diff.
  inline: Finding[];
  // How many findings, inline or not, ask for a change to the pull request.
  open?: number;
}

interface Options {
  repo: string;
  pr: number;
  token: string;
  // The reviewed commit, named on the summary's last line.
  sha?: string;
  fetcher?: Fetch;
}

interface Comment {
  id: number;
  body: string;
  in_reply_to_id?: number;
  path?: string;
  line?: number | null;
}

const GITHUB = 'https://api.github.com';
// Marks the summary comment, so a new review updates it.
const SUMMARY = '<!-- claude-pr-review -->';
// Marks each inline comment, so a new review can replace them.
const INLINE = '<!-- claude-pr-review-inline -->';

// The new-side lines a review comment can target in one file's patch, context and added lines, with their text.
export function commentableLines(patch: string | undefined): Map<number, string> {
  const lines = new Map<number, string>();
  let line = 0;
  for (const text of (patch ?? '').split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (hunk) line = Number(hunk[1]);
    else if (text.startsWith('+') || text.startsWith(' ')) lines.set(line++, text.slice(1));
  }
  return lines;
}

// Quoted code shorter than this, such as `}` or `return;`, is too common to move a comment on.
const MIN_ANCHOR = 10;

// The diff line a finding belongs on: its own line when it holds the quoted code, otherwise the only diff line
// holding that code; undefined when the finding can't be placed on the diff without guessing.
function placement(finding: Finding, lines: Map<number, string> | undefined): number | undefined {
  if (!lines) return undefined;
  const code = finding.code?.trim();
  const text = lines.get(finding.line);
  if (!code) return text === undefined ? undefined : finding.line;
  if (text?.includes(code)) return finding.line;
  if (code.length < MIN_ANCHOR) return undefined;
  const matches = [...lines].filter(([, line]) => line.includes(code)).map(([number]) => number);
  return matches.length === 1 ? matches[0] : undefined;
}

// "1 inline comment" or "N inline comments".
function inlineCount(count: number): string {
  return count === 1 ? '1 inline comment' : `${count} inline comments`;
}

function github(fetcher: Fetch, token: string, method: string, path: string, body?: unknown) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  return requestJson(fetcher, 'GitHub', method, `${GITHUB}${path}`, headers, body);
}

// Reads every page of a GitHub list endpoint.
async function all<T>(fetcher: Fetch, token: string, path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const batch = (await github(fetcher, token, 'GET', `${path}?per_page=100&page=${page}`)) as T[];
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

export async function postReview(review: Review, { repo, pr, token, sha = 'unknown', fetcher = fetch }: Options): Promise<string[]> {
  const log: string[] = [];
  const base = `/repos/${repo}`;

  // The previous inline comments are replaced, except the threads someone replied to. They are read now and
  // deleted last, so a run cancelled by a newer push leaves at worst both reviews, never none.
  const previous = await all<Comment>(fetcher, token, `${base}/pulls/${pr}/comments`);
  const replied = new Set(previous.map((comment) => comment.in_reply_to_id).filter((id) => id !== undefined));
  const ours = previous.filter((comment) => comment.body.startsWith(INLINE) && comment.in_reply_to_id === undefined);
  const kept = new Set(ours.filter((comment) => replied.has(comment.id)).map((comment) => `${comment.path}:${comment.line}`));

  // GitHub refuses a review whose comment targets a line outside the diff: those findings go to the summary,
  // like those on a line whose kept thread already discusses it, so the review repeats nothing.
  const files = await all<{ filename: string; patch?: string }>(fetcher, token, `${base}/pulls/${pr}/files`);
  const lines = new Map(files.map((file) => [file.filename, commentableLines(file.patch)]));
  const placed = review.inline.map((finding) => {
    const line = placement(finding, lines.get(finding.path));
    return line === undefined ? { ...finding, onDiff: false } : { ...finding, line, onDiff: true };
  });
  const discussed = placed.filter((finding) => finding.onDiff && kept.has(`${finding.path}:${finding.line}`));
  const onDiff = placed.filter((finding) => finding.onDiff && !discussed.includes(finding));
  const offDiff = placed.filter((finding) => !finding.onDiff);

  // When GitHub refuses the review, its findings and the reason still reach the summary, which is always posted.
  let posted = 0;
  let refused: { findings: Finding[]; reason: string } | undefined;
  if (onDiff.length > 0) {
    try {
      await github(fetcher, token, 'POST', `${base}/pulls/${pr}/reviews`, {
        event: 'COMMENT',
        body: `Claude review: ${inlineCount(onDiff.length)}. The summary is in the "Claude review" comment.`,
        comments: onDiff.map((finding) => ({
          path: finding.path,
          line: finding.line,
          side: 'RIGHT',
          body: `${INLINE}\n**${finding.axis}**: ${finding.body}`,
        })),
      });
      posted = onDiff.length;
      log.push(`Posted a review with ${inlineCount(posted)}.`);
    } catch (error) {
      refused = { findings: onDiff, reason: error instanceof Error ? error.message : String(error) };
      log.push(`GitHub refused the inline review; its findings go to the summary. ${refused.reason}`);
    }
  }

  const section = (title: string, findings: Finding[], note?: string) =>
    findings.length
      ? [
          `## ${title}`,
          '',
          ...(note ? [note, ''] : []),
          ...findings.map((finding) => `- **${finding.axis}** \`${finding.path}:${finding.line}\`: ${finding.body}`),
          '',
        ]
      : [];
  const outside = [
    ...section('Findings GitHub refused inline', refused?.findings ?? [], refused && `Reason: ${refused.reason}`),
    ...section('Findings outside the diff', offDiff),
    ...section('Findings on lines already discussed', discussed),
  ];
  const count = posted ? `${inlineCount(posted)} on the diff.` : 'No inline comment on the diff.';
  // The last line is fixed so a script can read it: `Open findings: <n|unknown> on <sha>`.
  const open = `Open findings: ${Number.isInteger(review.open) && review.open! >= 0 ? review.open : 'unknown'} on ${sha}`;
  const body = [SUMMARY, '# Claude review', '', review.summary.trim(), '', ...outside, count, '', open].join('\n');

  // One summary comment per pull request: update the marked one, or create it.
  const comments = await all<Comment>(fetcher, token, `${base}/issues/${pr}/comments`);
  const summary = comments.find((comment) => comment.body.startsWith(SUMMARY));
  if (summary) {
    await github(fetcher, token, 'PATCH', `${base}/issues/comments/${summary.id}`, { body });
    log.push(`Updated summary comment ${summary.id}.`);
  } else {
    await github(fetcher, token, 'POST', `${base}/issues/${pr}/comments`, { body });
    log.push('Created the summary comment.');
  }

  for (const comment of ours)
    if (!replied.has(comment.id)) {
      await github(fetcher, token, 'DELETE', `${base}/pulls/comments/${comment.id}`);
      log.push(`Deleted inline comment ${comment.id}.`);
    }
  return log;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: bun .github/scripts/post-review.ts <review.json>');
  const review = JSON.parse(readFileSync(file, 'utf8')) as Review;
  const log = await postReview(review, {
    repo: process.env.REPO ?? '',
    pr: Number(process.env.PR),
    token: process.env.GITHUB_TOKEN ?? '',
    sha: process.env.HEAD_SHA,
  });
  console.log(log.join('\n'));
}

if (import.meta.main) await main();
