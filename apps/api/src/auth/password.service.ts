import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const prefix = 'scrypt$1$32768$8$3';
@Injectable()
export class PasswordService {
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private dummy?: string;
  private async derive(password: string, salt: Buffer): Promise<Buffer> {
    if (this.active >= 2) {
      if (this.waiting.length >= 16)
        throw new ServiceUnavailableException('Authentication unavailable.');
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else this.active++;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          password,
          salt,
          64,
          { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
      });
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await this.derive(password, salt);
    return `${prefix}$${salt.toString('hex')}$${derived.toString('hex')}`;
  }
  async initialize(): Promise<void> {
    this.dummy = await this.hash(randomBytes(32).toString('hex'));
  }
  async verify(password: string, encoded?: string): Promise<boolean> {
    const target = encoded ?? this.dummy;
    if (!target) throw new Error('Password verifier not initialized.');
    const parts = target.split('$');
    if (
      parts.length !== 7 ||
      parts.slice(0, 5).join('$') !== prefix ||
      !/^[a-f0-9]{32}$/.test(parts[5]) ||
      !/^[a-f0-9]{128}$/.test(parts[6])
    )
      throw new Error('Invalid password verifier.');
    const actual = await this.derive(password, Buffer.from(parts[5], 'hex'));
    return (
      timingSafeEqual(actual, Buffer.from(parts[6], 'hex')) &&
      encoded !== undefined
    );
  }
}
