import type { FastifyReply, FastifyRequest } from 'fastify'
import type { HealthService } from '../services/health.service.js'

export class HealthController {
  constructor(private readonly service: HealthService) {}

  health = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(this.service.getHealth())
  }

  readiness = async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(await this.service.getReadiness())
  }
}
