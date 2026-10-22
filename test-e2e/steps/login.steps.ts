import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { required, type ForestWorld } from '../support/world.ts';

async function logIn(world: ForestWorld, password: string) {
  world.response = await world.api.post('/auth/login', {
    headers: { 'X-Forest-Request': '1' },
    data: { email: world.email, password },
  });
}

Given('I have a local account', function (this: ForestWorld) {
  this.email = required('E2E_USER_EMAIL');
  this.password = required('E2E_USER_PASSWORD');
});

When('I log in with my email and password', async function (this: ForestWorld) {
  await logIn(this, this.password);
});

When('I log in with a wrong password', async function (this: ForestWorld) {
  await logIn(this, `${this.password}-wrong`);
});

Then('my session is open', async function (this: ForestWorld) {
  assert.equal(this.response?.status(), 200);
  const me = await this.api.get('/auth/me');
  assert.equal(me.status(), 200);
});

Then('I am told the credentials are invalid', function (this: ForestWorld) {
  assert.equal(this.response?.status(), 401);
});

Then('no session is open', async function (this: ForestWorld) {
  assert.equal(this.response?.headers()['set-cookie'], undefined);
  const me = await this.api.get('/auth/me');
  assert.equal(me.status(), 401);
});
