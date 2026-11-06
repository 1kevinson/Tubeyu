import type { FastifyInstance } from 'fastify'
import { errorSchema, trackParamsSchema } from '../../shared/schemas.js'
import type { TrackParams } from '../tracks/tracks.schema.js'
import type { UrlManagementService } from './url-management.service.js'
import {
  sourceParamsSchema, sourceSchema, urlInputSchema, validatedUrlSchema,
  type SourceParams, type UrlInput,
} from './url-management.schema.js'

export function registerUrlManagementRoutes(app: FastifyInstance, service: UrlManagementService) {
  const errors = { 400: errorSchema, 404: errorSchema, 409: errorSchema, 500: errorSchema }

  app.post<{ Body: UrlInput }>('/api/urls/validate', {
    schema: { body: urlInputSchema, response: { 200: validatedUrlSchema, ...errors } },
  }, async (request) => service.validate(request.body.url))

  app.post<{ Params: TrackParams; Body: UrlInput }>('/api/tracks/:trackId/sources', {
    schema: {
      params: trackParamsSchema, body: urlInputSchema,
      response: { 201: sourceSchema, ...errors },
    },
  }, async (request, reply) => {
    const source = await service.add(request.params.trackId, request.body.url)
    return reply.code(201).send(source)
  })

  app.get<{ Params: TrackParams }>('/api/tracks/:trackId/sources', {
    schema: {
      params: trackParamsSchema,
      response: { 200: { type: 'array', items: sourceSchema }, ...errors },
    },
  }, async (request) => service.list(request.params.trackId))

  app.delete<{ Params: SourceParams }>('/api/tracks/:trackId/sources/:sourceId', {
    schema: { params: sourceParamsSchema, response: errors },
  }, async (request, reply) => {
    await service.delete(request.params.trackId, request.params.sourceId)
    return reply.code(204).send()
  })
}
