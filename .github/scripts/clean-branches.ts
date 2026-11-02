// Removes the local branches whose pull request into main is merged, and the origin/* references
// of branches deleted on GitHub. Usage, from anywhere in the clone: mise run clean-branches
import { spawn } from 'node:child_process';

export type Run = (command: string, args: string[]) => Promise<{ code: number; stdout: string }>;

export interface Report {
  deleted: string[];
  kept: string[];
  // Why nothing was deleted, when the run stopped before deleting.
  stopped?: string;
}

interface Merged {
  number: number;
  headRefName: string;
  headRefOid: string;
}

async function output(run: Run, command: string, args: string[]) {
  const result = await run(command, args);
  if (result.code !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.code}.`);
  return result.stdout;
}

// True when `tip` is the pull request head or one of its ancestors: the branch holds nothing the pull request lacks.
async function contains(run: Run, pr: Merged, tip: string) {
  // The head may be missing locally, for example when the branch was merged from another machine.
  if ((await run('git', ['cat-file', '-e', `${pr.headRefOid}^{commit}`])).code !== 0)
    await run('git', ['fetch', '--quiet', 'origin', `refs/pull/${pr.number}/head`]);
  return (await run('git', ['merge-base', '--is-ancestor', tip, pr.headRefOid])).code === 0;
}

export async function cleanBranches(run: Run): Promise<Report> {
  await output(run, 'git', ['fetch', '--prune', 'origin']);
  const merged = JSON.parse(
    await output(run, 'gh', [
      'pr', 'list', '--state', 'merged', '--base', 'main', '--limit', '1000',
      '--json', 'number,headRefName,headRefOid',
    ]),
  ) as Merged[];
  const current = (await output(run, 'git', ['branch', '--show-current'])).trim();
  const refs = await output(run, 'git', ['for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads']);

  // Decide every branch before deleting any, so a stop deletes nothing.
  const kept: string[] = [];
  const doomed: { branch: string; pr: Merged }[] = [];
  for (const line of refs.split('\n').filter(Boolean)) {
    const [branch, tip] = line.split(' ');
    if (branch === 'main') {
      kept.push('main (never deleted)');
      continue;
    }
    const prs = merged.filter((pr) => pr.headRefName === branch);
    if (prs.length === 0) {
      kept.push(`${branch} (no merged pull request into main)`);
      continue;
    }
    let match: Merged | undefined;
    for (const pr of prs) if (await contains(run, pr, tip)) match = pr;
    if (match) doomed.push({ branch, pr: match });
    else kept.push(`${branch} (has commits pull request #${prs[0].number} does not contain)`);
  }

  if (doomed.some(({ branch }) => branch === current)) {
    if ((await output(run, 'git', ['status', '--porcelain'])).trim())
      return {
        deleted: [],
        kept: kept.sort(),
        stopped: `Nothing deleted: the current branch ${current} is merged, but the working tree has uncommitted changes. Commit or stash them, then run again.`,
      };
    await output(run, 'git', ['switch', 'main']);
    await output(run, 'git', ['pull', '--ff-only', 'origin', 'main']);
  }

  const deleted: string[] = [];
  for (const { branch, pr } of doomed) {
    await output(run, 'git', ['branch', '-D', branch]);
    deleted.push(`${branch} (pull request #${pr.number} merged)`);
  }
  return { deleted: deleted.sort(), kept: kept.sort() };
}

const exec: Run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout }));
  });

async function main() {
  try {
    const report = await cleanBranches(exec);
    console.log(report.deleted.length ? `Deleted:\n  ${report.deleted.join('\n  ')}` : 'Deleted: none');
    console.log(report.kept.length ? `Kept:\n  ${report.kept.join('\n  ')}` : 'Kept: none');
    if (report.stopped) {
      console.error(report.stopped);
      process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.main) await main();
