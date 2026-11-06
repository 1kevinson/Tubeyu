import cors from '@fastify/cors'
import Fastify from 'fastify'
import { HealthController } from './controllers/health.controller.js'
import type { HealthRepository } from './repositories/health.repository.js'
import { registerHealthRoutes } from './routes/health.routes.js'
import { DatabaseUnavailableError, HealthService } from './services/health.service.js'

interface AppOptions {
  healthRepository: HealthRepository
  corsOrigin: string
  logger?: boolean
}

export function buildApp({ healthRepository, corsOrigin, logger = true }: AppOptions) {
  const app = Fastify({ logger })

  app.register(cors, { origin: corsOrigin })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DatabaseUnavailableError) {
      request.log.error({ err: error }, 'Readiness check failed')
      return reply.code(503).send({ status: 'error', message: error.message })
    }

    const statusCode = error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
      ? error.statusCode
      : 500
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Request failed')
    }

    return reply.code(statusCode).send({
      status: 'error',
      message: statusCode < 500 && error instanceof Error
        ? error.message
        : 'Internal server error',
    })
  })

  const service = new HealthService(healthRepository)
  registerHealthRoutes(app, new HealthController(service))

  return app
}
