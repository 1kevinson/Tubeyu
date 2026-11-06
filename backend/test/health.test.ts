import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildApp } from '../src/app.js'
import type { HealthRepository } from '../src/repositories/health.repository.js'

function createApp(healthRepository: HealthRepository) {
  return buildApp({
    healthRepository,
    corsOrigin: 'http://localhost:5173',
    logger: false,
  })
}

test('liveness preserves the existing response without accessing the database', async (t) => {
  const app = createApp({
    async checkConnection() {
      assert.fail('Liveness must not access the database')
    },
  })
  t.after(() => app.close())

  const response = await app.inject('/api/health')

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { status: 'ok', service: 'tubeyu-backend' })
})

test('readiness checks the repository and reports database availability', async (t) => {
  let checks = 0
  const app = createApp({
    async checkConnection() {
      checks += 1
    },
  })
  t.after(() => app.close())

  const response = await app.inject('/api/health/ready')

  assert.equal(checks, 1)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    status: 'ok',
    service: 'tubeyu-backend',
    database: 'connected',
  })
})

test('readiness returns 503 without leaking database error details', async (t) => {
  const app = createApp({
    async checkConnection() {
      throw new Error('Private database connection details')
    },
  })
  t.after(() => app.close())

  const response = await app.inject('/api/health/ready')

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.json(), {
    status: 'error',
    message: 'Database is unavailable',
  })
})

test('CORS allows the configured frontend origin', async (t) => {
  const app = createApp({ async checkConnection() {} })
  t.after(() => app.close())

  const response = await app.inject({
    url: '/api/health',
    headers: { origin: 'http://localhost:5173' },
  })

  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173')
})

test('unexpected failures return 500 without exposing internal details', async (t) => {
  const app = createApp({ async checkConnection() {} })
  app.get('/failure', async () => {
    throw new Error('Private internal details')
  })
  t.after(() => app.close())

  const response = await app.inject('/failure')

  assert.equal(response.statusCode, 500)
  assert.deepEqual(response.json(), {
    status: 'error',
    message: 'Internal server error',
  })
})

test('client errors retain their HTTP status and message', async (t) => {
  const app = createApp({ async checkConnection() {} })
  app.get('/invalid', async () => {
    throw Object.assign(new Error('Invalid request'), { statusCode: 400 })
  })
  t.after(() => app.close())

  const response = await app.inject('/invalid')

  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.json(), {
    status: 'error',
    message: 'Invalid request',
  })
})
