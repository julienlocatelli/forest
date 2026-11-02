import { describe, expect, test } from 'bun:test';
import { type Run, cleanBranches } from './clean-branches.ts';

interface Clone {
  current: string;
  branches: Record<string, string>; // local branch → tip SHA
  merged: { number: number; headRefName: string; headRefOid: string }[];
  // `ancestor → descendant` pairs that `git merge-base --is-ancestor` accepts; a SHA contains itself.
  contains?: [string, string][];
  dirty?: boolean;
}

// A stand-in for git and gh over a clone: answers the commands the cleanup runs and records them.
function fakeClone(clone: Clone) {
  const commands: string[] = [];
  const run: Run = async (command, args) => {
    const line = [command, ...args].join(' ');
    commands.push(line);
    const ok = (stdout = '') => ({ code: 0, stdout });
    if (command === 'gh') return ok(JSON.stringify(clone.merged));
    const [sub, ...rest] = args;
    if (sub === 'branch' && rest[0] === '--show-current') return ok(`${clone.current}\n`);
    if (sub === 'for-each-ref')
      return ok(Object.entries(clone.branches).map(([name, sha]) => `${name} ${sha}\n`).join(''));
    if (sub === 'status') return ok(clone.dirty ? ' M file.ts\n' : '');
    if (sub === 'cat-file') return ok();
    if (sub === 'merge-base') {
      const [, ancestor, descendant] = rest;
      const contained = ancestor === descendant || (clone.contains ?? []).some(([a, d]) => a === ancestor && d === descendant);
      return { code: contained ? 0 : 1, stdout: '' };
    }
    if (sub === 'branch' && rest[0] === '-D') delete clone.branches[rest[1]];
    if (sub === 'switch') clone.current = rest[0];
    return ok();
  };
  return { commands, run };
}

describe('cleanBranches', () => {
  test('prunes deleted remote branches and deletes a merged branch the pull request contains', async () => {
    const clone: Clone = {
      current: 'main',
      branches: { main: 'm1', 'chore/42-ctx7-mise': 'a1' },
      merged: [{ number: 52, headRefName: 'chore/42-ctx7-mise', headRefOid: 'a1' }],
    };
    const { commands, run } = fakeClone(clone);

    const report = await cleanBranches(run);

    expect(commands).toContain('git fetch --prune origin');
    expect(commands).toContain('git branch -D chore/42-ctx7-mise');
    expect(clone.branches).toEqual({ main: 'm1' });
    expect(report.deleted).toEqual(['chore/42-ctx7-mise (pull request #52 merged)']);
  });

  test('deletes a branch whose tip is behind the merged pull request head', async () => {
    const clone: Clone = {
      current: 'main',
      branches: { main: 'm1', 'chore/43-renovate': 'b1' },
      merged: [{ number: 53, headRefName: 'chore/43-renovate', headRefOid: 'b2' }],
      contains: [['b1', 'b2']],
    };
    const { run } = fakeClone(clone);

    const report = await cleanBranches(run);

    expect(report.deleted).toEqual(['chore/43-renovate (pull request #53 merged)']);
  });

  test('keeps main, unmerged branches and branches with commits the pull request lacks, with reasons', async () => {
    const clone: Clone = {
      current: 'main',
      branches: { main: 'm1', 'feature/60-wip': 'c1', 'chore/44-update-check': 'd2' },
      merged: [{ number: 54, headRefName: 'chore/44-update-check', headRefOid: 'd1' }],
      contains: [['d1', 'd2']],
    };
    const { commands, run } = fakeClone(clone);

    const report = await cleanBranches(run);

    expect(commands.filter((line) => line.startsWith('git branch -D'))).toEqual([]);
    expect(report.deleted).toEqual([]);
    expect(report.kept).toEqual([
      'chore/44-update-check (has commits pull request #54 does not contain)',
      'feature/60-wip (no merged pull request into main)',
      'main (never deleted)',
    ]);
  });

  test('switches to an updated main before deleting the current branch', async () => {
    const clone: Clone = {
      current: 'chore/47-delete-merged-branch',
      branches: { main: 'm1', 'chore/47-delete-merged-branch': 'e1' },
      merged: [{ number: 71, headRefName: 'chore/47-delete-merged-branch', headRefOid: 'e1' }],
    };
    const { commands, run } = fakeClone(clone);

    const report = await cleanBranches(run);

    const switched = commands.indexOf('git switch main');
    expect(switched).toBeGreaterThan(-1);
    expect(commands.indexOf('git pull --ff-only origin main')).toBeGreaterThan(switched);
    expect(commands.indexOf('git branch -D chore/47-delete-merged-branch')).toBeGreaterThan(switched);
    expect(report.deleted).toEqual(['chore/47-delete-merged-branch (pull request #71 merged)']);
  });

  test('deletes nothing when the current branch is to be deleted and the tree has uncommitted changes', async () => {
    const clone: Clone = {
      current: 'chore/47-delete-merged-branch',
      branches: { main: 'm1', 'chore/47-delete-merged-branch': 'e1', 'chore/42-ctx7-mise': 'a1' },
      merged: [
        { number: 71, headRefName: 'chore/47-delete-merged-branch', headRefOid: 'e1' },
        { number: 52, headRefName: 'chore/42-ctx7-mise', headRefOid: 'a1' },
      ],
      dirty: true,
    };
    const { commands, run } = fakeClone(clone);

    const report = await cleanBranches(run);

    expect(commands.some((line) => line.startsWith('git branch -D') || line.startsWith('git switch'))).toBe(false);
    expect(report.deleted).toEqual([]);
    expect(report.stopped).toBe(
      'Nothing deleted: the current branch chore/47-delete-merged-branch is merged, but the working tree has uncommitted changes. Commit or stash them, then run again.',
    );
  });

  test('a second run deletes nothing and reports the same kept branches', async () => {
    const clone: Clone = {
      current: 'main',
      branches: { main: 'm1', 'chore/42-ctx7-mise': 'a1', 'feature/60-wip': 'c1' },
      merged: [{ number: 52, headRefName: 'chore/42-ctx7-mise', headRefOid: 'a1' }],
    };
    const { run } = fakeClone(clone);

    const first = await cleanBranches(run);
    const second = await cleanBranches(run);

    expect(first.deleted).toEqual(['chore/42-ctx7-mise (pull request #52 merged)']);
    expect(second.deleted).toEqual([]);
    expect(second.kept).toEqual(first.kept);
  });
});
