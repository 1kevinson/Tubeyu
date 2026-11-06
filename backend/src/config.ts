export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }

  let protocol: string
  try {
    protocol = new URL(databaseUrl).protocol
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL')
  }
  if (protocol !== 'postgresql:' && protocol !== 'postgres:') {
    throw new Error('DATABASE_URL must use the postgresql: or postgres: protocol')
  }

  const port = Number(env.PORT ?? '3000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return {
    databaseUrl,
    port,
    host: env.HOST ?? '0.0.0.0',
    corsOrigin: env.CORS_ORIGIN ?? 'http://localhost:5173',
  }
}
