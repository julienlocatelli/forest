# End-to-end scenarios

Runs the Gherkin features in `features/` with Cucumber.js against the real API and front.

```sh
bun run test:e2e
```

The command checks that the `TEST_*` variables from `apps/api/.env` target an isolated project, then:

1. Builds the API and applies migrations to the test database.
2. Builds the front.
3. Starts the API on port 3101 and the front on port 3100.
4. Runs every feature in random order.
5. Stops both servers and deletes the synthetic test user.

Override the ports with `E2E_API_PORT` and `E2E_FRONT_PORT`. Extra arguments go to Cucumber, for example `bun run test:e2e --order random:42` to replay an order.

## Watch a run in a visible browser

Browser scenarios run headless by default. To watch them in a visible Chromium window, slowed down so each action can be followed:

```sh
HEADED=1 bun run test:e2e
```

## Diagnose a failed browser scenario

A failed scenario that opened a front page saves a full-page screenshot to `test-e2e/reports/screenshots/` and prints its path in the output. The folder is ignored by Git.

## Writing steps

- Step definitions live in `steps/`, the Cucumber World and hooks in `support/`.
- API steps reach the API over HTTP only, through `this.api`.
- Browser steps drive the front through `this.page`, a Playwright page opened in a fresh browser context for each scenario.

## Find steps without a definition

```sh
bun run test:e2e:steps [feature files…]
```

Lists every step of the given feature files, or of `features/` by default, that no step definition in `steps/` matches, with the scenarios using it. It is a Cucumber dry run: it starts no API, front or browser and touches no database, so it takes a second. It exits 1 when a step has no definition.

`/plan` runs it on a draft of a Gherkin story's scenarios, kept outside the repository, and adds one `Define step` task per missing step to the story's board.
