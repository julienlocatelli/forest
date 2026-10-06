import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { runMigration } from '../src/database/migrate.js';
const { AppModule } = await import(
  new URL('../dist/app.module.js', import.meta.url).href
);

describe('users contract and persistence', () => {
  let app: INestApplication;
  const created: number[] = [];
  async function open() {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  }
  beforeAll(async () => {
    expect(await runMigration('run')).toBe(0);
    await open();
  });
  afterAll(async () => {
    if (!app) return;
    try {
      for (const id of created)
        await request(app.getHttpServer()).delete(`/users/${id}`);
    } finally {
      await app.close();
    }
  });
  it('creates, lists, retains across restart and deletes only its own records', async () => {
    for (const firstName of ['First', 'Second']) {
      const result = await request(app.getHttpServer())
        .post('/users')
        .send({ firstName, lastName: 'MigrationTest' })
        .expect(201);
      expect(result.body).toMatchObject({
        firstName,
        lastName: 'MigrationTest',
        isActive: true,
      });
      expect(Number.isInteger(result.body.id)).toBe(true);
      expect(Object.keys(result.body).sort()).toEqual([
        'firstName',
        'id',
        'isActive',
        'lastName',
      ]);
      created.push(result.body.id);
    }
    expect(new Set(created).size).toBe(created.length);
    await request(app.getHttpServer())
      .delete(`/users/${created[0]}e0`)
      .expect(500);
    const first = (
      await request(app.getHttpServer()).get(`/users/${created[0]}`).expect(200)
    ).body;
    const list = await request(app.getHttpServer()).get('/users').expect(200);
    expect(list.body).toEqual(expect.arrayContaining([first]));
    await app.close();
    await open();
    expect(
      (
        await request(app.getHttpServer())
          .get(`/users/${created[0]}`)
          .expect(200)
      ).body,
    ).toEqual(first);
    await request(app.getHttpServer())
      .delete(`/users/${created[0]}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/users/${created[0]}`)
      .expect(200);
    const absent = await request(app.getHttpServer())
      .get(`/users/${created[0]}`)
      .expect(200);
    expect([null, '']).toContain(absent.text === '' ? '' : absent.body);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/users/${created[1]}`)
          .expect(200)
      ).body.firstName,
    ).toBe('Second');
  });
  it('preserves existing invalid-input behavior', async () => {
    await request(app.getHttpServer()).get('/users/not-a-number').expect(400);
    const invalidDelete = await request(app.getHttpServer())
      .delete('/users/not-a-number')
      .expect(500);
    expect(invalidDelete.body.message).toBe('Internal server error');
    const result = await request(app.getHttpServer())
      .post('/users')
      .send({ firstName: 'MissingLastName' })
      .expect(500);
    expect(result.body.message).toBe('Internal server error');
  });
});
