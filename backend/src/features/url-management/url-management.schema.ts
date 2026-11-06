import { uuidSchema } from '../../shared/schemas.js'

export interface UrlInput {
  url: string
}

export interface ValidatedUrl {
  sourceUrl: string
  provider: 'youtube_music'
  externalId: string
}

export interface TrackSource extends ValidatedUrl {
  id: string
  trackId: string
}

export interface SourceParams {
  trackId: string
  sourceId: string
}

export const urlInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['url'],
  properties: {
    url: { type: 'string', format: 'uri', minLength: 1, maxLength: 2048, pattern: '^https://' },
  },
} as const

const urlProperties = {
  sourceUrl: { type: 'string', format: 'uri' },
  provider: { type: 'string', const: 'youtube_music' },
  externalId: { type: 'string', minLength: 11, maxLength: 11, pattern: '^[A-Za-z0-9_-]{11}$' },
} as const

export const validatedUrlSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['sourceUrl', 'provider', 'externalId'],
  properties: urlProperties,
} as const

export const sourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'trackId', 'sourceUrl', 'provider', 'externalId'],
  properties: { id: uuidSchema, trackId: uuidSchema, ...urlProperties },
} as const

export const sourceParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trackId', 'sourceId'],
  properties: { trackId: uuidSchema, sourceId: uuidSchema },
} as const
