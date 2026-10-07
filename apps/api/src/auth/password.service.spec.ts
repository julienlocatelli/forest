import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';
describe('password protection', () => {
  it('salts independently, verifies exactly, and performs unknown-account verification', async () => {
    const passwords = new PasswordService();
    await passwords.initialize();
    const first = await passwords.hash('Synthetic-password-123');
    const second = await passwords.hash('Synthetic-password-123');
    expect(first).not.toBe(second);
    expect(first).not.toContain('Synthetic-password');
    expect(await passwords.verify('Synthetic-password-123', first)).toBe(true);
    expect(await passwords.verify('Synthetic-password-123 ', first)).toBe(
      false,
    );
    expect(await passwords.verify('Synthetic-password-123')).toBe(false);
    await expect(passwords.verify('test', 'malformed')).rejects.toThrow(
      'Invalid password verifier',
    );
  });
  it('bounds concurrent work and rejects overflow without stranding queued work', async () => {
    const passwords = new PasswordService();
    const jobs = Array.from({ length: 19 }, () =>
      passwords.hash('Synthetic-password-123'),
    );
    const outcomes = await Promise.allSettled(jobs);
    expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(18);
    const failures = outcomes.filter((r) => r.status === 'rejected');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      reason: { message: 'Authentication unavailable.' },
    });
    expect(await passwords.hash('Synthetic-password-123')).toContain(
      'scrypt$1',
    );
  }, 15000);
});
