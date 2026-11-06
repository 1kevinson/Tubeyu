# ⚙️ Backend

[![Project overview](../assets/overview.svg)](../../README.md) [![Backend — current page](../assets/backend-active.svg)](README.md)

---

The backend uses Node.js 26.13.0, Fastify, TypeScript, and Prisma with the PostgreSQL driver adapter.

## 🛠️ Local development

Use the Node.js version in `backend/.node-version`. From `backend/`:

```sh
cp .env.example .env
npm ci
npm run prisma:generate
npm run dev
```

Set `DATABASE_URL` to your PostgreSQL connection URL. The example uses `db`, the
Docker Compose hostname; change it to `localhost` when running the API directly
on your machine. Existing `.env` files are not overwritten automatically.
`PORT` defaults to `3000`, `HOST` to `0.0.0.0`, and `CORS_ORIGIN` to
`http://localhost:5173`. Configuration is validated at startup.

From the repository root, `docker compose up --build backend db` starts the API
and PostgreSQL. Prisma Client is generated before the development server starts,
including when the source directory is bind-mounted.

## 🏗️ Architecture

Requests flow through routes, controllers, services, and repositories:

- `src/routes/`: URL and HTTP method registration.
- `src/controllers/`: HTTP request and response handling.
- `src/services/`: application logic, independent of Fastify and Prisma.
- `src/repositories/`: persistence access through Prisma.
- `src/database/`: Prisma Client and PostgreSQL pool configuration.
- `src/app.ts`: application composition, CORS, and centralized error handling.
- `src/server.ts`: configuration, listening, and graceful shutdown.

The application factory accepts a repository dependency so HTTP tests do not
require a database. Shutdown closes Fastify and disconnects Prisma's pool.

## 🩺 Health endpoints

| Endpoint | Purpose | Responses |
| --- | --- | --- |
| `GET /api/health` | Process liveness; does not query the database | `200`, `{"status":"ok","service":"tubeyu-backend"}` |
| `GET /api/health/ready` | Database readiness using Prisma's `SELECT 1` | `200` with `database: "connected"`, or `503` when PostgreSQL is unavailable |

Database failures are logged server-side; connection details are not returned
to callers. PostgreSQL connection and query timeouts are five seconds.

## 🗄️ Prisma and builds

`prisma/schema.prisma` intentionally contains no domain models yet. No application
tables or migrations are created by this foundation. Add models when implementing
features, then run `npm run prisma:migrate -- --name <description>` and commit the
generated migrations. Use `npm run prisma:deploy` to apply committed migrations
in deployment; do not use development migrations in production.

Generated Prisma Client files live in `src/generated/prisma` and are not committed.
Run `npm run prisma:generate` after schema changes and before type-checking or tests.
The build generates the client automatically. Generation needs `DATABASE_URL` to
load Prisma configuration but does not connect to PostgreSQL; the Docker image
uses a build-only placeholder URL for this step.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves compiled code from `dist/`. The supplied Dockerfile is for
development and runs the watch server.

Tests use Fastify injection and Node's test runner. Set `TEST_DATABASE_URL` to
also run the PostgreSQL integration test; without it, that test is skipped.
