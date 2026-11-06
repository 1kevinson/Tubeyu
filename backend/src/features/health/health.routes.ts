import type { FastifyInstance } from 'fastify'
import type { HealthController } from './health.controller.js'

export function registerHealthRoutes(app: FastifyInstance, controller: HealthController) {
  app.get('/api/health', controller.health)
  app.get('/api/health/ready', controller.readiness)
}
