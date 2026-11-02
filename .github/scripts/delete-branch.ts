// Deletes the head branch of a pull request merged into main.
// Usage: GITHUB_TOKEN=... REPO=<owner/name> HEAD_REPO=<owner/name> BRANCH=<head ref> PR=<number> bun .github/scripts/delete-branch.ts
import { appendFileSync } from 'node:fs';
import { type Fetch, github, HttpError } from './http.ts';

export interface Outcome {
  ok: boolean;
  summary: string;
}

interface Options {
  // The repository the pull request was merged into, and the one its branch lives in.
  repo: string;
  headRepo: string;
  branch: string;
  pr: number;
  token: string;
  fetcher?: Fetch;
}

// A ref path keeps the branch's slashes; only each segment is encoded.
function refPath(repo: string, branch: string) {
  return `/repos/${repo}/git/refs/heads/${branch.split('/').map(encodeURIComponent).join('/')}`;
}

async function deleteBranch({ repo, headRepo, branch, pr, token, fetcher = fetch }: Options): Promise<Outcome> {
  const kept = (why: string) => ({ ok: true, summary: `Kept branch "${branch}": ${why}.` });
  if (branch === 'main') return kept('it is the default branch');
  if (headRepo !== repo) return kept(`it belongs to the fork ${headRepo}`);

  const query = new URLSearchParams({ state: 'open', base: branch, per_page: '100' });
  const based = (await github(fetcher, token, 'GET', `/repos/${repo}/pulls?${query}`)) as { number: number }[];
  if (based.length > 0)
    return kept(`open pull requests ${based.map((other) => `#${other.number}`).join(', ')} are based on it`);

  try {
    await github(fetcher, token, 'DELETE', refPath(repo, branch));
  } catch (error) {
    // GitHub answers 404 or 422 for a ref that no longer exists, for example after /merge-story deleted it.
    if (error instanceof HttpError && (error.status === 404 || error.status === 422))
      return { ok: true, summary: `Branch "${branch}" was already deleted: nothing to do.` };
    throw error;
  }
  return { ok: true, summary: `Deleted branch "${branch}": pull request #${pr} is merged.` };
}

// Never throws: every failure becomes an outcome whose summary names the cause.
export async function deleteMergedBranch(options: Options): Promise<Outcome> {
  try {
    return await deleteBranch(options);
  } catch (error) {
    return { ok: false, summary: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN ?? '';
  const outcome = token
    ? await deleteMergedBranch({
        repo: process.env.REPO ?? '',
        headRepo: process.env.HEAD_REPO ?? '',
        branch: process.env.BRANCH ?? '',
        pr: Number(process.env.PR),
        token,
      })
    : { ok: false, summary: 'GITHUB_TOKEN is not set.' };
  console.log(outcome.summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${outcome.summary}\n`);
  // Exit explicitly so a failed outcome always fails the job step.
  process.exit(outcome.ok ? 0 : 1);
}

if (import.meta.main) await main();
