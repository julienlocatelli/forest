import { describe, expect, it } from 'vitest';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../database/prisma.service.js';
// Substitute only the database boundary; real SQL and permissions are tested in e2e.
const user = { id: 7, firstName: 'Ada', lastName: 'Lovelace', isActive: true };
function service() {
  return new UsersService({
    user: {
      create: () => Promise.resolve({ ...user, internal: 'not public' }),
      findMany: () => Promise.resolve([user]),
      findUnique: () => Promise.resolve(null),
      deleteMany: () => Promise.resolve({ count: 0 }),
    },
  } as unknown as PrismaService);
}
describe('user operations', () => {
  it('returns only the public fields after creation', async () => {
    expect(
      await service().create({ firstName: 'Ada', lastName: 'Lovelace' }),
    ).toEqual(user);
  });
  it('keeps absent reads and deletes nonexceptional', async () => {
    expect(await service().findOne(99)).toBeNull();
    expect(await service().remove(99)).toBeUndefined();
  });
});
