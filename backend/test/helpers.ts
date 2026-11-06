import { randomUUID } from 'node:crypto'
import { buildApp } from '../src/app.js'
import type { HealthRepository } from '../src/features/health/health.repository.js'
import type { TrackRepository } from '../src/features/tracks/tracks.repository.js'
import type { Track } from '../src/features/tracks/tracks.schema.js'
import type { UrlRepository } from '../src/features/url-management/url-management.repository.js'
import type { TrackSource } from '../src/features/url-management/url-management.schema.js'
import { HttpError } from '../src/shared/http-error.js'

export function createTestApp(healthRepository: HealthRepository = { async checkConnection() {} }) {
  const tracks = new Map<string, Track>()
  const sources = new Map<string, TrackSource>()
  const trackRepository: TrackRepository = {
    async create(input) {
      const track = { id: randomUUID(), ...input }
      tracks.set(track.id, track)
      return track
    },
    async list(limit, offset) {
      return [...tracks.values()].sort((a, b) => a.id.localeCompare(b.id)).slice(offset, offset + limit)
    },
    async findById(id) { return tracks.get(id) ?? null },
    async update(id, input) {
      const track = tracks.get(id)
      if (!track) throw new HttpError(404, 'Track not found')
      const updated = { ...track, ...input }
      tracks.set(id, updated)
      return updated
    },
    async delete(id) {
      if (!tracks.has(id)) throw new HttpError(404, 'Track not found')
      if ([...sources.values()].some((source) => source.trackId === id)) {
        throw new HttpError(409, 'Remove the track sources before deleting the track')
      }
      tracks.delete(id)
    },
  }
  const urlRepository: UrlRepository = {
    async add(trackId, url) {
      if (!tracks.has(trackId)) throw new HttpError(404, 'Track not found')
      if ([...sources.values()].some((source) =>
        source.provider === url.provider && source.externalId === url.externalId)) {
        throw new HttpError(409, 'This YouTube Music URL is already attached to a track')
      }
      const source = { id: randomUUID(), trackId, ...url }
      sources.set(source.id, source)
      return source
    },
    async list(trackId) {
      return [...sources.values()].filter((source) => source.trackId === trackId)
    },
    async delete(trackId, sourceId) {
      if (sources.get(sourceId)?.trackId !== trackId) {
        throw new HttpError(404, 'Track source not found')
      }
      sources.delete(sourceId)
    },
  }
  return buildApp({
    healthRepository, trackRepository, urlRepository,
    corsOrigin: 'http://localhost:5173', logger: false,
  })
}
