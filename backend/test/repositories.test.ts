import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createPrismaClient } from '../src/database/prisma.js'
import { Prisma } from '../src/generated/prisma/client.js'
import { PrismaTrackRepository } from '../src/features/tracks/tracks.repository.js'
import { PrismaUrlRepository } from '../src/features/url-management/url-management.repository.js'
import { HttpError } from '../src/shared/http-error.js'

function databaseError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Private database details', {
    code, clientVersion: 'test',
  })
}

test('track repositories translate missing records and restricted deletes, but propagate unexpected failures', async (t) => {
  const prisma = createPrismaClient('postgresql://test:test@localhost:5432/test')
  t.after(() => prisma.$disconnect())
  const database = {
    track: {
      create: prisma.track.create, findMany: prisma.track.findMany,
      findUnique: prisma.track.findUnique, update: prisma.track.update, delete: prisma.track.delete,
    },
  }
  const repository = new PrismaTrackRepository(database)
  const id = randomUUID()
  const update = t.mock.method(database.track, 'update', async () => { throw databaseError('P2025') })
  const remove = t.mock.method(database.track, 'delete', async () => { throw databaseError('P2025') })
  await assert.rejects(repository.update(id, { title: 'New' }), { statusCode: 404, message: 'Track not found' })
  await assert.rejects(repository.delete(id), { statusCode: 404, message: 'Track not found' })
  remove.mock.mockImplementation(async () => { throw databaseError('P2003') })
  await assert.rejects(repository.delete(id), { statusCode: 409 })
  const unexpected = new Error('Unexpected failure')
  for (const method of [update, remove]) {
    method.mock.mockImplementation(async () => { throw unexpected })
  }
  await assert.rejects(repository.update(id, { title: 'New' }), (error) => error === unexpected)
  await assert.rejects(repository.delete(id), (error) => error === unexpected)
})

test('URL repository relies on atomic uniqueness and foreign keys and scopes source deletion', async (t) => {
  const prisma = createPrismaClient('postgresql://test:test@localhost:5432/test')
  t.after(() => prisma.$disconnect())
  const database = {
    trackSource: {
      create: prisma.trackSource.create, findMany: prisma.trackSource.findMany,
      deleteMany: prisma.trackSource.deleteMany,
    },
  }
  const repository = new PrismaUrlRepository(database)
  const trackId = randomUUID()
  const sourceId = randomUUID()
  const url = {
    sourceUrl: 'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    provider: 'youtube_music', externalId: 'dQw4w9WgXcQ',
  } as const
  const create = t.mock.method(database.trackSource, 'create', async () => { throw databaseError('P2002') })
  await assert.rejects(repository.add(trackId, url), { statusCode: 409 })
  create.mock.mockImplementation(async () => { throw databaseError('P2003') })
  await assert.rejects(repository.add(trackId, url), { statusCode: 404 })
  const unexpected = new Error('Unexpected failure')
  create.mock.mockImplementation(async () => { throw unexpected })
  await assert.rejects(repository.add(trackId, url), (error) => error === unexpected)
  const remove = t.mock.method(database.trackSource, 'deleteMany', async () => ({ count: 0 }))
  await assert.rejects(repository.delete(trackId, sourceId), HttpError)
  assert.deepEqual(remove.mock.calls[0]?.arguments[0], {
    where: { id: sourceId, trackId, provider: 'youtube_music' },
  })
  remove.mock.mockImplementation(async () => ({ count: 1 }))
  await repository.delete(trackId, sourceId)
})
