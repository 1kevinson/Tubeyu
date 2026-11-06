import { uuidSchema } from '../../shared/schemas.js'

export interface TrackInput {
  title: string
  artist: string
  album: string
  duration: number
}

export interface Track extends TrackInput {
  id: string
}

export interface TrackParams {
  trackId: string
}

export interface TrackQuery {
  limit?: string
  offset?: string
}

const metadataProperties = {
  title: { type: 'string', minLength: 1, maxLength: 500, pattern: '\\S' },
  artist: { type: 'string', minLength: 1, maxLength: 500, pattern: '\\S' },
  album: { type: 'string', maxLength: 500 },
  duration: { type: 'integer', minimum: 0, maximum: 2147483647 },
} as const

export const trackInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'artist', 'album', 'duration'],
  properties: metadataProperties,
} as const

export const trackUpdateSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: metadataProperties,
} as const

export const trackSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'artist', 'album', 'duration'],
  properties: { id: uuidSchema, ...metadataProperties },
} as const

export const trackQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    limit: { type: 'string', pattern: '^(?:[1-9]|[1-9][0-9]|100)$' },
    offset: { type: 'string', pattern: '^(?:0|[1-9][0-9]{0,9})$' },
  },
} as const
