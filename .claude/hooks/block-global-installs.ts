// Claude Code PreToolUse hook: refuses a shell command that installs a tool globally or runs one unpinned,
// and sends the agent to the install-tools skill. Reads the hook input on stdin; see .claude/settings.json.

type Word = { text: string; quoted: boolean };
// A command line split into sequences (`;`, `&&`, `||`, `&`, newlines), each a pipeline of stages (`|`).
type Pipeline = Word[][];

// Splits outside quotes, so a blocked pattern inside a quoted argument (a grep pattern, a commit message) stays text.
function parse(command: string): Pipeline[] {
  const pipelines: Pipeline[] = [];
  let stages: Word[][] = [];
  let words: Word[] = [];
  let word = '';
  let quoted = false;
  let started = false;
  const endWord = () => {
    if (started) words.push({ text: word, quoted });
    word = '';
    quoted = false;
    started = false;
  };
  const endStage = () => {
    endWord();
    if (words.length) stages.push(words);
    words = [];
  };
  const endPipeline = () => {
    endStage();
    if (stages.length) pipelines.push(stages);
    stages = [];
  };
  for (let i = 0; i < command.length; i++) {
    const char = command[i];
    if (char === "'" || char === '"') {
      const close = command.indexOf(char, i + 1);
      const end = close === -1 ? command.length : close;
      word += command.slice(i + 1, end).replace(char === '"' ? /\\(.)/g : /$^/, '$1');
      quoted = true;
      started = true;
      i = end;
    } else if (char === '\\' && i + 1 < command.length) {
      word += command[++i];
      started = true;
    } else if (char === ' ' || char === '\t') endWord();
    else if (char === '|' && command[i + 1] === '|') {
      endPipeline();
      i++;
    } else if (char === '|') endStage();
    else if (char === ';' || char === '\n' || char === '&') {
      endPipeline();
      if (command[i + 1] === '&') i++;
    } else {
      word += char;
      started = true;
    }
  }
  endPipeline();
  return pipelines;
}

// The words of the command a stage actually runs: leading variable assignments and wrappers removed.
function commandWords(stage: Word[]): string[] {
  let words = stage;
  for (;;) {
    const [first] = words;
    if (!first || first.quoted) return [];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(first.text)) words = words.slice(1);
    else if (first.text === 'sudo' || first.text === 'command' || first.text === 'env') {
      words = words.slice(1);
      while (words[0] && words[0].text.startsWith('-')) words = words.slice(1);
    } else if (first.text === 'mise' && words[1]?.text === 'exec') {
      const separator = words.findIndex((word) => word.text === '--');
      if (separator === -1) return words.map((word) => word.text);
      words = words.slice(separator + 1);
    } else return words.map((word) => word.text);
  }
}

const global = (args: string[]) => args.includes('-g') || args.includes('--global');
const subcommand = (args: string[]) => args.find((arg) => !arg.startsWith('-'));
const shells = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);

function blockedCommand([name, ...args]: string[]): string | undefined {
  const sub = subcommand(args);
  if (name === 'npx') return 'npx';
  if (name === 'bunx' || (name === 'bun' && sub === 'x')) return 'bunx';
  if (name === 'npm' && global(args) && ['install', 'i', 'in', 'add'].includes(sub ?? '')) return 'npm install -g';
  if (name === 'bun' && global(args) && sub === 'add') return 'bun add -g';
  if (name === 'bun' && global(args) && (sub === 'install' || sub === 'i')) return 'bun install -g';
  if (name === 'mise' && sub === 'use' && global(args)) return 'mise use -g';
  if (name === 'brew' && sub === 'install') return 'brew install';
  if (name === 'pipx' && sub === 'install') return 'pipx install';
  return undefined;
}

// The global or unpinned install `command` runs, named as the install skill lists it, or undefined.
export function globalInstall(command: string): string | undefined {
  for (const pipeline of parse(command)) {
    const stages = pipeline.map(commandWords);
    for (const words of stages) {
      const blocked = blockedCommand(words);
      if (blocked) return blocked;
    }
    const download = stages.findIndex(([name]) => name === 'curl' || name === 'wget');
    if (download !== -1 && stages.slice(download + 1).some(([name]) => shells.has(name))) return 'a download piped to a shell';
  }
  return undefined;
}

async function main() {
  const input = JSON.parse(await Bun.stdin.text()) as { tool_input?: { command?: string } };
  const command = input.tool_input?.command ?? '';
  const blocked = globalInstall(command);
  if (!blocked) return;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Blocked: \`${command}\` uses ${blocked}, a global or unpinned install. Forest pins every tool in mise.toml and every library in its workspace's package.json: follow .claude/skills/install-tools/SKILL.md for the pinned equivalent.`,
      },
    }),
  );
}

if (import.meta.main) await main();
