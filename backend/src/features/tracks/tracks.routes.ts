import type { FastifyInstance } from 'fastify'
import { errorSchema, trackParamsSchema } from '../../shared/schemas.js'
import type { TrackService } from './tracks.service.js'
import {
  trackInputSchema, trackQuerySchema, trackSchema, trackUpdateSchema,
  type TrackInput, type TrackParams, type TrackQuery,
} from './tracks.schema.js'

export function registerTrackRoutes(app: FastifyInstance, service: TrackService) {
  const errors = { 400: errorSchema, 404: errorSchema, 409: errorSchema, 500: errorSchema }

  app.post<{ Body: TrackInput }>('/api/tracks', {
    schema: { body: trackInputSchema, response: { 201: trackSchema, ...errors } },
  }, async (request, reply) => {
    const track = await service.create(request.body)
    return reply.code(201).header('Location', `/api/tracks/${track.id}`).send(track)
  })

  app.get<{ Querystring: TrackQuery }>('/api/tracks', {
    schema: {
      querystring: trackQuerySchema,
      response: { 200: { type: 'array', items: trackSchema }, ...errors },
    },
  }, async (request) => service.list(request.query))

  app.get<{ Params: TrackParams }>('/api/tracks/:trackId', {
    schema: { params: trackParamsSchema, response: { 200: trackSchema, ...errors } },
  }, async (request) => service.get(request.params.trackId))

  app.patch<{ Params: TrackParams; Body: Partial<TrackInput> }>('/api/tracks/:trackId', {
    schema: {
      params: trackParamsSchema, body: trackUpdateSchema,
      response: { 200: trackSchema, ...errors },
    },
  }, async (request) => service.update(request.params.trackId, request.body))

  app.delete<{ Params: TrackParams }>('/api/tracks/:trackId', {
    schema: { params: trackParamsSchema, response: errors },
  }, async (request, reply) => {
    await service.delete(request.params.trackId)
    return reply.code(204).send()
  })
}
