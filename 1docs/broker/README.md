# Redis broker

The `broker/` directory contains the Redis image used by Docker Compose. The
worker connects to it through `REDIS_URL` (`redis://broker:6379` in Compose).
Redis is reserved for queuing worker jobs, not application caching.

Set `REDIS_URL` and `REDIS_PORT` in the root `.env` file when configuring the
Compose environment. The broker has a Redis ping health check, and the worker
waits for it to become healthy before starting.
