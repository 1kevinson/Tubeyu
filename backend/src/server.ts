import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createPrismaClient } from './database/prisma.js'
import { PrismaHealthRepository } from './repositories/health.repository.js'

const config = loadConfig()
const prisma = createPrismaClient(config.databaseUrl)
const app = buildApp({
  healthRepository: new PrismaHealthRepository(prisma),
  corsOrigin: config.corsOrigin,
})

app.addHook('onClose', async () => {
  await prisma.$disconnect()
})

async function shutdown() {
  try {
    await app.close()
  } catch (error) {
    app.log.error({ err: error }, 'Shutdown failed')
    process.exitCode = 1
  }
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

try {
  await app.listen({ port: config.port, host: config.host })
} catch (error) {
  app.log.error({ err: error }, 'Server startup failed')
  process.exitCode = 1
  await shutdown()
}
