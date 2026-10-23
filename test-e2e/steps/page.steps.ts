import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import type { ForestWorld } from '../support/world.ts';

When('I open the page at {string}', async function (this: ForestWorld, path: string) {
  const response = await this.page.goto(path);
  assert.equal(response?.status(), 200);
});

Then('the page title is {string}', async function (this: ForestWorld, title: string) {
  assert.equal(await this.page.title(), title);
});
