import cors from '@fastify/cors'
import Fastify from 'fastify'
import { HealthController } from './features/health/health.controller.js'
import type { HealthRepository } from './features/health/health.repository.js'
import { registerHealthRoutes } from './features/health/health.routes.js'
import { DatabaseUnavailableError, HealthService } from './features/health/health.service.js'
import type { TrackRepository } from './features/tracks/tracks.repository.js'
import { registerTrackRoutes } from './features/tracks/tracks.routes.js'
import { TrackService } from './features/tracks/tracks.service.js'
import type { UrlRepository } from './features/url-management/url-management.repository.js'
import { registerUrlManagementRoutes } from './features/url-management/url-management.routes.js'
import { UrlManagementService } from './features/url-management/url-management.service.js'

interface AppOptions {
  healthRepository: HealthRepository
  trackRepository: TrackRepository
  urlRepository: UrlRepository
  corsOrigin: string
  logger?: boolean
}

export function buildApp({
  healthRepository, trackRepository, urlRepository, corsOrigin, logger = true,
}: AppOptions) {
  const app = Fastify({
    logger,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  })

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
  const tracks = new TrackService(trackRepository)
  registerTrackRoutes(app, tracks)
  registerUrlManagementRoutes(app, new UrlManagementService(urlRepository, tracks))

  return app
}
