import { HttpError } from '../../shared/http-error.js'
import type { ValidatedUrl } from './url-management.schema.js'

export function validateYouTubeMusicUrl(input: string): ValidatedUrl {
  const invalid = () => new HttpError(400, 'Provide an individual HTTPS YouTube Music watch URL with one valid video ID')
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw invalid()
  }

  const ids = url.searchParams.getAll('v')
  const externalId = ids[0]
  if (
    input !== input.trim() || /\s|\\/.test(input) ||
    url.protocol !== 'https:' || url.hostname !== 'music.youtube.com' ||
    url.port !== '' || url.username !== '' || url.password !== '' ||
    url.pathname !== '/watch' || ids.length !== 1 ||
    !externalId || externalId.length !== 11 || !/^[A-Za-z0-9_-]{11}$/.test(externalId)
  ) {
    throw invalid()
  }

  return {
    sourceUrl: `https://music.youtube.com/watch?v=${externalId}`,
    provider: 'youtube_music',
    externalId,
  }
}
