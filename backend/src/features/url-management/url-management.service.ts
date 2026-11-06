import type { TrackService } from '../tracks/tracks.service.js'
import type { UrlRepository } from './url-management.repository.js'
import { validateYouTubeMusicUrl } from './youtube-music-url.js'

export class UrlManagementService {
  constructor(
    private readonly repository: UrlRepository,
    private readonly tracks: TrackService,
  ) {}

  validate(url: string) {
    return validateYouTubeMusicUrl(url)
  }

  async add(trackId: string, input: string) {
    const url = this.validate(input)
    await this.tracks.get(trackId)
    return this.repository.add(trackId, url)
  }

  async list(trackId: string) {
    await this.tracks.get(trackId)
    return this.repository.list(trackId)
  }

  async delete(trackId: string, sourceId: string) {
    await this.tracks.get(trackId)
    await this.repository.delete(trackId, sourceId)
  }
}
