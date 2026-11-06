import type { PrismaClient } from '../generated/prisma/client.js'

export interface HealthRepository {
  checkConnection(): Promise<void>
}

export class PrismaHealthRepository implements HealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async checkConnection(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`
  }
}
