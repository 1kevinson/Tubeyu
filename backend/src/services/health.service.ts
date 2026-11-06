import type { HealthRepository } from '../repositories/health.repository.js'

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Database is unavailable', { cause })
    this.name = 'DatabaseUnavailableError'
  }
}

export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  getHealth() {
    return { status: 'ok', service: 'tubeyu-backend' } as const
  }

  async getReadiness() {
    try {
      await this.repository.checkConnection()
    } catch (error) {
      throw new DatabaseUnavailableError(error)
    }

    return { ...this.getHealth(), database: 'connected' } as const
  }
}
