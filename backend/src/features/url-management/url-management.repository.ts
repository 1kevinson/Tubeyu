import { Prisma, type PrismaClient } from '../../generated/prisma/client.js'
import { HttpError } from '../../shared/http-error.js'
import type { TrackSource, ValidatedUrl } from './url-management.schema.js'

export interface UrlRepository {
  add(trackId: string, url: ValidatedUrl): Promise<TrackSource>
  list(trackId: string): Promise<TrackSource[]>
  delete(trackId: string, sourceId: string): Promise<void>
}

export class PrismaUrlRepository implements UrlRepository {
  constructor(private readonly prisma: {
    trackSource: Pick<PrismaClient['trackSource'], 'create' | 'findMany' | 'deleteMany'>
  }) {}

  async add(trackId: string, url: ValidatedUrl): Promise<TrackSource> {
    try {
      const source = await this.prisma.trackSource.create({ data: { trackId, ...url } })
      return { ...source, provider: url.provider }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new HttpError(409, 'This YouTube Music URL is already attached to a track')
        }
        if (error.code === 'P2003') throw new HttpError(404, 'Track not found')
      }
      throw error
    }
  }

  async list(trackId: string): Promise<TrackSource[]> {
    const sources = await this.prisma.trackSource.findMany({
      where: { trackId, provider: 'youtube_music' }, orderBy: { id: 'asc' },
    })
    return sources.map((source) => ({ ...source, provider: 'youtube_music' }))
  }

  async delete(trackId: string, sourceId: string) {
    const result = await this.prisma.trackSource.deleteMany({
      where: { id: sourceId, trackId, provider: 'youtube_music' },
    })
    if (result.count === 0) throw new HttpError(404, 'Track source not found')
  }
}
