import { Prisma, type PrismaClient } from '../../generated/prisma/client.js'
import { HttpError } from '../../shared/http-error.js'
import type { Track, TrackInput } from './tracks.schema.js'

export interface TrackRepository {
  create(input: TrackInput): Promise<Track>
  list(limit: number, offset: number): Promise<Track[]>
  findById(id: string): Promise<Track | null>
  update(id: string, input: Partial<TrackInput>): Promise<Track>
  delete(id: string): Promise<void>
}

export class PrismaTrackRepository implements TrackRepository {
  constructor(private readonly prisma: {
    track: Pick<PrismaClient['track'], 'create' | 'findMany' | 'findUnique' | 'update' | 'delete'>
  }) {}

  create(input: TrackInput) {
    return this.prisma.track.create({ data: input })
  }

  list(limit: number, offset: number) {
    return this.prisma.track.findMany({ take: limit, skip: offset, orderBy: { id: 'asc' } })
  }

  findById(id: string) {
    return this.prisma.track.findUnique({ where: { id } })
  }

  async update(id: string, input: Partial<TrackInput>) {
    try {
      return await this.prisma.track.update({ where: { id }, data: input })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new HttpError(404, 'Track not found')
      }
      throw error
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.track.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new HttpError(404, 'Track not found')
        if (error.code === 'P2003') {
          throw new HttpError(409, 'Remove the track sources before deleting the track')
        }
      }
      throw error
    }
  }
}
