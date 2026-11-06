import { HttpError } from '../../shared/http-error.js'
import type { TrackRepository } from './tracks.repository.js'
import type { TrackInput, TrackQuery } from './tracks.schema.js'

export class TrackService {
  constructor(private readonly repository: TrackRepository) {}

  create(input: TrackInput) {
    return this.repository.create(input)
  }

  list({ limit = '20', offset = '0' }: TrackQuery) {
    const parsedOffset = Number(offset)
    if (parsedOffset > 2147483647) throw new HttpError(400, 'Offset must not exceed 2147483647')
    return this.repository.list(Number(limit), parsedOffset)
  }

  async get(id: string) {
    const track = await this.repository.findById(id)
    if (!track) throw new HttpError(404, 'Track not found')
    return track
  }

  update(id: string, input: Partial<TrackInput>) {
    return this.repository.update(id, input)
  }

  delete(id: string) {
    return this.repository.delete(id)
  }
}
