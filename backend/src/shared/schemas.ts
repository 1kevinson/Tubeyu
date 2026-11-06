export const uuidSchema = { type: 'string', format: 'uuid' } as const

export const trackParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['trackId'],
  properties: { trackId: uuidSchema },
} as const

export const errorSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'message'],
  properties: {
    status: { type: 'string', const: 'error' },
    message: { type: 'string' },
  },
} as const
