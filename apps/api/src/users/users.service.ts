import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { User } from './user.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
const publicFields = {
  id: true,
  firstName: true,
  lastName: true,
  isActive: true,
} as const;
function response(user: User): User {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
  };
}
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: CreateUserDto): Promise<User> {
    return response(
      await this.prisma.user.create({
        data: { firstName: data.firstName, lastName: data.lastName },
        select: publicFields,
      }),
    );
  }
  async findAll(): Promise<User[]> {
    return (await this.prisma.user.findMany({ select: publicFields })).map(
      response,
    );
  }
  async findOne(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicFields,
    });
    return user ? response(user) : null;
  }
  async remove(id: number): Promise<void> {
    // DELETE receives a string at runtime; PostgreSQL rejects non-decimal integers.
    if (!/^[+-]?\d+$/.test(String(id).trim()))
      throw new Error('Invalid user identifier.');
    await this.prisma.user.deleteMany({ where: { id: Number(id) } });
  }
}
