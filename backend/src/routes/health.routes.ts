import type { FastifyInstance } from 'fastify'
import type { HealthController } from '../controllers/health.controller.js'

export function registerHealthRoutes(app: FastifyInstance, controller: HealthController) {
  app.get('/api/health', controller.health)
  app.get('/api/health/ready', controller.readiness)
}
