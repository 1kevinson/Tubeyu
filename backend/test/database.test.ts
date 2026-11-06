import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { test } from 'node:test'
import { buildApp } from '../src/app.js'
import { createPrismaClient } from '../src/database/prisma.js'
import { PrismaHealthRepository } from '../src/features/health/health.repository.js'
import { PrismaTrackRepository } from '../src/features/tracks/tracks.repository.js'
import { PrismaUrlRepository } from '../src/features/url-management/url-management.repository.js'

const databaseUrl = process.env.TEST_DATABASE_URL

test('readiness queries PostgreSQL through Prisma', { skip: !databaseUrl }, async (t) => {
  assert.ok(databaseUrl)
  const prisma = createPrismaClient(databaseUrl)
  const app = buildApp({
    healthRepository: new PrismaHealthRepository(prisma),
    trackRepository: new PrismaTrackRepository(prisma),
    urlRepository: new PrismaUrlRepository(prisma),
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

test('tracks and URL sources persist with atomic duplicate protection', { skip: !databaseUrl }, async (t) => {
  assert.ok(databaseUrl)
  const prisma = createPrismaClient(databaseUrl)
  const app = buildApp({
    healthRepository: new PrismaHealthRepository(prisma),
    trackRepository: new PrismaTrackRepository(prisma),
    urlRepository: new PrismaUrlRepository(prisma),
    corsOrigin: 'http://localhost:5173',
    logger: false,
  })
  const trackIds: string[] = []
  t.after(async () => {
    try {
      await app.close()
      await prisma.trackSource.deleteMany({ where: { trackId: { in: trackIds } } })
      await prisma.track.deleteMany({ where: { id: { in: trackIds } } })
    } finally {
      await prisma.$disconnect()
    }
  })
  const created = await app.inject({
    method: 'POST', url: '/api/tracks',
    payload: { title: 'Integration song', artist: 'Test artist', album: '', duration: 123 },
  })
  assert.equal(created.statusCode, 201, created.body)
  const trackId: string = created.json().id
  trackIds.push(trackId)
  const videoId = randomBytes(8).toString('base64url')
  const sourceUrl = `https://music.youtube.com/watch?v=${videoId}`
  const endpoint = `/api/tracks/${trackId}/sources`
  const results = await Promise.all([1, 2].map(() => app.inject({
    method: 'POST', url: endpoint, payload: { url: sourceUrl },
  })))
  assert.deepEqual(results.map((response) => response.statusCode).sort(), [201, 409])
  const stored = await prisma.trackSource.findUnique({
    where: { provider_externalId: { provider: 'youtube_music', externalId: videoId } },
  })
  assert.ok(stored)
  assert.equal(stored.trackId, trackId)
  assert.equal(stored.sourceUrl, sourceUrl)
  assert.equal((await app.inject(endpoint)).json().length, 1)
  assert.equal((await app.inject({
    method: 'DELETE', url: `/api/tracks/${trackId}`,
  })).statusCode, 409)
  assert.equal((await app.inject({
    method: 'DELETE', url: `${endpoint}/${stored.id}`,
  })).statusCode, 204)
  assert.equal((await app.inject({
    method: 'DELETE', url: `/api/tracks/${trackId}`,
  })).statusCode, 204)
  assert.equal(await prisma.track.findUnique({ where: { id: trackId } }), null)
})
