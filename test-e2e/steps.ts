// Lists the steps of the given feature files that no step definition in test-e2e/ matches.
// Usage: bun run test:e2e:steps [feature files…]  (defaults to features/**/*.feature)
// A dry run: it starts no API, front or browser, and touches no database.
import { relative, resolve } from 'node:path';
import { Writable } from 'node:stream';
import { loadConfiguration, runCucumber } from '@cucumber/cucumber/api';
import config from './cucumber.mjs';

const here = import.meta.dirname;
// Cucumber's own report is not needed: this script prints the missing steps itself.
const silent = new Writable({ write: (_chunk, _encoding, done) => done() });
const files = process.argv.slice(2).map((file) => resolve(file));

const { runConfiguration } = await loadConfiguration(
  {
    file: false,
    provided: {
      paths: files.length > 0 ? files : config.paths,
      import: config.import,
      dryRun: true,
      format: [],
    },
  },
  { cwd: here },
);

const stepTexts = new Map<string, string>(); // pickle step id → text
const scenarios = new Map<string, string>(); // pickle step id → "file: scenario"
const testSteps = new Map<string, string>(); // test step id → pickle step id
const missing = new Map<string, Set<string>>(); // step text → scenarios using it

const { success } = await runCucumber(runConfiguration, { cwd: here, stdout: silent }, (envelope) => {
  if (envelope.pickle) {
    const { uri, name, steps } = envelope.pickle;
    for (const step of steps) {
      stepTexts.set(step.id, step.text);
      const file = resolve(here, uri);
      const shown = relative(process.cwd(), file).startsWith('..') ? file : relative(process.cwd(), file);
      scenarios.set(step.id, `${shown}: ${name}`);
    }
  }
  if (envelope.testCase)
    for (const step of envelope.testCase.testSteps)
      if (step.pickleStepId) testSteps.set(step.id, step.pickleStepId);
  if (envelope.testStepFinished?.testStepResult.status === 'UNDEFINED') {
    const pickleStepId = testSteps.get(envelope.testStepFinished.testStepId) ?? '';
    const text = stepTexts.get(pickleStepId) ?? '';
    missing.set(text, (missing.get(text) ?? new Set()).add(scenarios.get(pickleStepId) ?? ''));
  }
});

if (missing.size === 0) {
  console.log(success ? 'Every step has a definition.' : 'The dry run failed; see the errors above.');
  process.exit(success ? 0 : 1);
}
console.log(`${missing.size} step(s) without a definition:`);
for (const [text, usedIn] of missing) console.log(`- ${text}\n    used in ${[...usedIn].join('; ')}`);
process.exit(1);
