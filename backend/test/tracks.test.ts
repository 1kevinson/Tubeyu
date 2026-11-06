import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createTestApp } from './helpers.js'

const metadata = { title: 'Song', artist: 'Artist', album: '', duration: 180 }

test('tracks support create, paginated list, get, patch, and delete', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  const created = await app.inject({ method: 'POST', url: '/api/tracks', payload: metadata })
  assert.equal(created.statusCode, 201, created.body)
  const track = created.json()
  const url = `/api/tracks/${track.id}`
  assert.equal(created.headers.location, url)
  assert.deepEqual(track, { id: track.id, ...metadata })
  assert.deepEqual((await app.inject(url)).json(), track)
  assert.deepEqual((await app.inject('/api/tracks?limit=1&offset=0')).json(), [track])
  assert.deepEqual((await app.inject('/api/tracks?offset=1')).json(), [])
  const updated = await app.inject({ method: 'PATCH', url, payload: { title: 'New title' } })
  assert.equal(updated.statusCode, 200, updated.body)
  assert.deepEqual(updated.json(), { ...track, title: 'New title' })
  const deleted = await app.inject({ method: 'DELETE', url })
  assert.equal(deleted.statusCode, 204)
  assert.equal(deleted.body, '')
  for (const method of ['GET', 'PATCH', 'DELETE'] as const) {
    const response = await app.inject({
      method, url, ...(method === 'PATCH' ? { payload: { title: 'Missing' } } : {}),
    })
    assert.equal(response.statusCode, 404, response.body)
  }
})

test('track JSON Schemas reject invalid metadata without coercion or silently dropping fields', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  for (const payload of [
    {}, { ...metadata, title: '' }, { ...metadata, artist: '  ' },
    { ...metadata, title: 'x'.repeat(501) }, { ...metadata, duration: -1 },
    { ...metadata, duration: 1.5 }, { ...metadata, duration: 2147483648 },
    { ...metadata, duration: '180' }, { ...metadata, duration: null },
    { ...metadata, artist: ['Artist'] }, { ...metadata, extra: true },
  ]) {
    const response = await app.inject({ method: 'POST', url: '/api/tracks', payload })
    assert.equal(response.statusCode, 400, response.body)
    assert.equal(response.json().status, 'error')
  }
  assert.deepEqual((await app.inject('/api/tracks')).json(), [])
  for (const payload of [{}, { extra: true }, { duration: '1' }]) {
    const response = await app.inject({
      method: 'PATCH', url: `/api/tracks/${randomUUID()}`, payload,
    })
    assert.equal(response.statusCode, 400, response.body)
  }
})

test('track routes reject invalid UUIDs and pagination boundaries', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  for (const url of [
    '/api/tracks/invalid', '/api/tracks?limit=0', '/api/tracks?limit=101',
    '/api/tracks?offset=-1', '/api/tracks?offset=2147483648',
    '/api/tracks?limit=1.5', '/api/tracks?offset=abc',
    '/api/tracks?extra=true', '/api/tracks?limit=1&limit=2',
  ]) {
    const response = await app.inject(url)
    assert.equal(response.statusCode, 400, response.body)
  }
  assert.equal((await app.inject('/api/tracks?limit=100&offset=2147483647')).statusCode, 200)
  assert.equal((await app.inject(`/api/tracks/${randomUUID()}`)).statusCode, 404)
})
