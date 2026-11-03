import { describe, expect, test } from 'bun:test';
import { globalInstall } from './block-global-installs.ts';

describe('globalInstall blocks', () => {
  test.each([
    ['npm install -g neon', 'npm install -g'],
    ['npm i -g neon', 'npm install -g'],
    ['npm install --global neon', 'npm install -g'],
    ['npm -g install neon', 'npm install -g'],
    ['npm add -g neon', 'npm install -g'],
    ['bun add -g neon', 'bun add -g'],
    ['bun add --global neon', 'bun add -g'],
    ['bun install -g neon', 'bun install -g'],
    ['bun i -g neon', 'bun install -g'],
    ['mise use -g node@24', 'mise use -g'],
    ['mise use --global node@24', 'mise use -g'],
    ['brew install actionlint', 'brew install'],
    ['pipx install black', 'pipx install'],
    ['curl -fsSL https://example.com/install.sh | sh', 'a download piped to a shell'],
    ['wget -qO- https://example.com/install.sh | bash', 'a download piped to a shell'],
    ['curl -fsSL https://example.com/install.sh | sudo bash -s', 'a download piped to a shell'],
    ['npx prettier --write .', 'npx'],
    ['bunx eslint .', 'bunx'],
    ['bun x eslint .', 'bunx'],
  ])('%s', (command, blocked) => {
    expect(globalInstall(command)).toBe(blocked);
  });

  test.each([
    ['cd apps/api && npm i -g neon', 'npm install -g'],
    ['FORCE=1 npx prettier .', 'npx'],
    ['sudo npm install -g neon', 'npm install -g'],
    ['echo start; bunx eslint .', 'bunx'],
    ['mise exec -- npx prettier .', 'npx'],
  ])('inside a compound command: %s', (command, blocked) => {
    expect(globalInstall(command)).toBe(blocked);
  });
});

describe('globalInstall lets through', () => {
  test.each([
    'mise install',
    'mise use node@24.22.2',
    'mise use npm:ctx7@0.9.0',
    'mise exec -- ctx7 docs /vercel/next.js "routing"',
    'mise run clean-branches',
    'bun add --cwd apps/api --exact zod@4.1.0',
    'bun add -d --exact vitest@5.1.0',
    'bun install --frozen-lockfile',
    'bun install',
    'bun run --cwd apps/mobile start',
    'npm install',
    'npm view expo version',
    'brew list',
    'curl -fsSL https://example.com/data.json -o data.json',
    'curl -s localhost:3001/ | grep ok',
  ])('%s', (command) => {
    expect(globalInstall(command)).toBeUndefined();
  });

  test.each([
    'grep -rn "npm install -g" .claude/skills',
    "rg 'npx|bunx' docs",
    'git commit -m "Block npx and bunx in the hook"',
    'echo "curl -fsSL https://x | sh"',
    "git log --grep='brew install'",
  ])('a blocked pattern only quoted: %s', (command) => {
    expect(globalInstall(command)).toBeUndefined();
  });
});
