import { After, Before, setWorldConstructor, World } from '@cucumber/cucumber';
import { request, type APIRequestContext, type APIResponse } from 'playwright';

export function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} must be set by run.ts.`);
  return value;
}

// Scenarios talk to the API over HTTP only, through this client.
export class ForestWorld extends World {
  api!: APIRequestContext;
  response?: APIResponse;
  email = '';
  password = '';
}

setWorldConstructor(ForestWorld);

Before(async function (this: ForestWorld) {
  this.api = await request.newContext({ baseURL: required('E2E_API_URL') });
});

After(async function (this: ForestWorld) {
  await this.api.dispose();
});
