import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { test } from 'node:test'
import { createTestApp } from './helpers.js'

const url = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'
const normalized = { sourceUrl: url, provider: 'youtube_music', externalId: 'dQw4w9WgXcQ' }
const metadata = { title: 'Song', artist: 'Artist', album: '', duration: 180 }

test('validation canonicalizes individual music links without database access', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  for (const input of [url, `${url}&si=sharing`, `${url}&list=playlist&index=2#details`]) {
    const response = await app.inject({
      method: 'POST', url: '/api/urls/validate', payload: { url: input },
    })
    assert.equal(response.statusCode, 200, response.body)
    assert.deepEqual(response.json(), normalized)
  }
  assert.deepEqual((await app.inject('/api/tracks')).json(), [])
})

test('URL validation rejects malformed, non-music, playlist-only, and ambiguous links', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  for (const input of [
    'invalid', 'http://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ',
    'https://music.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com@evil.example/watch?v=dQw4w9WgXcQ',
    'https://user:pass@music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com:8443/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com/playlist?list=example',
    'https://music.youtube.com/watch', `${url}&v=dQw4w9WgXcQ`,
    'https://music.youtube.com/watch?v=short',
    'https://music.youtube.com/watch?v=abcdefghij!', `${url}%0A`,
    ` ${url}`, `${url}\n`, 'https://music.youtube.com\\watch?v=dQw4w9WgXcQ',
    `${url}&si=${'x'.repeat(2048)}`,
  ]) {
    const response = await app.inject({
      method: 'POST', url: '/api/urls/validate', payload: { url: input },
    })
    assert.equal(response.statusCode, 400, `${input}: ${response.body}`)
    assert.equal(response.json().status, 'error')
  }
  for (const payload of [{}, { url: null }, { url: [url] }, { url, extra: true }]) {
    assert.equal((await app.inject({
      method: 'POST', url: '/api/urls/validate', payload,
    })).statusCode, 400)
  }
})

test('sources attach to existing tracks, enforce global uniqueness, and can be removed', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  const create = async () => (await app.inject({
    method: 'POST', url: '/api/tracks', payload: metadata,
  })).json().id as string
  const trackId = await create()
  const otherTrackId = await create()
  const sourcesUrl = `/api/tracks/${trackId}/sources`
  assert.deepEqual((await app.inject(sourcesUrl)).json(), [])
  const added = await app.inject({
    method: 'POST', url: sourcesUrl, payload: { url: `${url}&si=shared` },
  })
  assert.equal(added.statusCode, 201, added.body)
  const source = added.json()
  assert.deepEqual(source, { id: source.id, trackId, ...normalized })
  assert.deepEqual((await app.inject(sourcesUrl)).json(), [source])
  for (const id of [trackId, otherTrackId]) {
    const duplicate = await app.inject({
      method: 'POST', url: `/api/tracks/${id}/sources`, payload: { url },
    })
    assert.equal(duplicate.statusCode, 409, duplicate.body)
  }
  assert.equal((await app.inject({
    method: 'DELETE', url: `/api/tracks/${trackId}`,
  })).statusCode, 409)
  assert.equal((await app.inject({
    method: 'DELETE', url: `/api/tracks/${otherTrackId}/sources/${source.id}`,
  })).statusCode, 404)
  assert.deepEqual((await app.inject(sourcesUrl)).json(), [source])
  const removed = await app.inject({ method: 'DELETE', url: `${sourcesUrl}/${source.id}` })
  assert.equal(removed.statusCode, 204)
  assert.equal(removed.body, '')
  assert.equal((await app.inject({
    method: 'DELETE', url: `${sourcesUrl}/${source.id}`,
  })).statusCode, 404)
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tracks/${trackId}` })).statusCode, 204)
  assert.equal((await app.inject({
    method: 'POST', url: `/api/tracks/${otherTrackId}/sources`, payload: { url },
  })).statusCode, 201)
})

test('source routes reject missing tracks, malformed IDs, and invalid URLs before saving', async (t) => {
  const app = createTestApp()
  t.after(() => app.close())
  const missing = `/api/tracks/${randomUUID()}/sources`
  for (const method of ['GET', 'POST', 'DELETE'] as const) {
    const response = await app.inject({
      method, url: method === 'DELETE' ? `${missing}/${randomUUID()}` : missing,
      ...(method === 'POST' ? { payload: { url } } : {}),
    })
    assert.equal(response.statusCode, 404, response.body)
  }
  assert.equal((await app.inject({
    method: 'POST', url: '/api/tracks/invalid/sources', payload: { url },
  })).statusCode, 400)
  assert.equal((await app.inject({
    method: 'DELETE', url: `${missing}/invalid`,
  })).statusCode, 400)
  assert.equal((await app.inject({
    method: 'POST', url: missing, payload: { url: 'https://example.com/watch?v=dQw4w9WgXcQ' },
  })).statusCode, 400)
})
