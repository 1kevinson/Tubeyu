import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from '../src/app.js'
import { createPrismaClient } from '../src/database/prisma.js'
import { PrismaHealthRepository } from '../src/repositories/health.repository.js'

const databaseUrl = process.env.TEST_DATABASE_URL

test('readiness queries PostgreSQL through Prisma', { skip: !databaseUrl }, async (t) => {
  assert.ok(databaseUrl)
  const prisma = createPrismaClient(databaseUrl)
  const app = buildApp({
    healthRepository: new PrismaHealthRepository(prisma),
    corsOrigin: 'http://localhost:5173',
    logger: false,
  })
  t.after(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  const response = await app.inject('/api/health/ready')

  assert.equal(response.statusCode, 200, response.body)
  assert.equal(response.json().database, 'connected')
})
