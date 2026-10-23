import { relative, resolve } from 'node:path';
import { After, AfterAll, Before, BeforeAll, Status, setWorldConstructor, World } from '@cucumber/cucumber';
import {
  chromium,
  request,
  type APIRequestContext,
  type APIResponse,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';

export function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} must be set by run.ts.`);
  return value;
}

// API steps talk to the API over HTTP only, through `api`; browser steps drive the front through `page`.
export class ForestWorld extends World {
  api!: APIRequestContext;
  page!: Page;
  response?: APIResponse;
  email = '';
  password = '';
}

setWorldConstructor(ForestWorld);

// One browser per run; each scenario gets a fresh context, so no cookie or storage carries over.
let browser: Browser;
let context: BrowserContext;

BeforeAll(async function () {
  // Headless by default; HEADED=1 shows the browser and slows each action down enough to follow it.
  const headed = process.env.HEADED === '1';
  browser = await chromium.launch({ headless: !headed, slowMo: headed ? 250 : 0 });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function (this: ForestWorld) {
  this.api = await request.newContext({ baseURL: required('E2E_API_URL') });
  context = await browser.newContext({ baseURL: required('E2E_FRONT_URL') });
  this.page = await context.newPage();
});

const screenshots = resolve(import.meta.dirname, '../reports/screenshots');

After(async function (this: ForestWorld, { pickle, result }) {
  // A failed scenario that opened a front page keeps a screenshot of the last page shown.
  if (result?.status === Status.FAILED && this.page.url() !== 'about:blank') {
    const name = `${pickle.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`;
    const path = resolve(screenshots, name);
    await this.page.screenshot({ path, fullPage: true });
    const shown = relative(resolve(import.meta.dirname, '../..'), path);
    console.error(`\nScreenshot of failed scenario "${pickle.name}": ${shown}`);
    this.attach(`Screenshot: ${shown}`);
  }
  await context.close();
  await this.api.dispose();
});
