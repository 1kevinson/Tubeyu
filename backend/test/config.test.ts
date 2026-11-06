import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadConfig } from '../src/config.js'

const databaseUrl = 'postgresql://localhost:5432/tubeyu'

test('configuration provides local development defaults', () => {
  assert.deepEqual(loadConfig({ DATABASE_URL: databaseUrl }), {
    databaseUrl,
    port: 3000,
    host: '0.0.0.0',
    corsOrigin: 'http://localhost:5173',
  })
})

test('configuration accepts explicit server settings', () => {
  assert.deepEqual(loadConfig({
    DATABASE_URL: databaseUrl,
    PORT: '4000',
    HOST: '127.0.0.1',
    CORS_ORIGIN: 'https://app.example.com',
  }), {
    databaseUrl,
    port: 4000,
    host: '127.0.0.1',
    corsOrigin: 'https://app.example.com',
  })
})

test('configuration rejects missing or invalid database URLs', () => {
  for (const value of [undefined, '', 'not-a-url', 'https://localhost']) {
    const env: NodeJS.ProcessEnv = {}
    if (value !== undefined) env.DATABASE_URL = value
    assert.throws(() => loadConfig(env), /DATABASE_URL/)
  }
})

test('configuration rejects invalid ports', () => {
  for (const port of ['', '0', '-1', '65536', '3000.5', 'not-a-port']) {
    assert.throws(() => loadConfig({ DATABASE_URL: databaseUrl, PORT: port }), /PORT/)
  }
})
