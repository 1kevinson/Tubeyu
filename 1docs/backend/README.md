# ⚙️ Backend

[![Project overview](../assets/overview.svg)](../../README.md) [![Backend — current page](../assets/backend-active.svg)](README.md)

---

The backend uses Node.js 26.13.0, Fastify, TypeScript, and Prisma with the PostgreSQL driver adapter.

## 🛠️ Local development

Use the Node.js version in `backend/.node-version`. Enable Corepack and install
the backend dependencies from `backend/`. If Corepack is missing,
install it as described in the [project overview](../../README.md#package-management).

```sh
corepack enable
cd backend
pnpm install --frozen-lockfile
```

Then, still in `backend/`:

```sh
cp .env.example .env
pnpm run prisma:generate
pnpm run dev
```

The backend pins its own pnpm version in `package.json` and maintains its own
`pnpm-lock.yaml`. Use `pnpm add <package>` from `backend/` and commit the updated
manifest and lockfile. No workspace or dependencies are shared with other services.

Set `DATABASE_URL` to your PostgreSQL connection URL. The example uses `db`, the
Docker Compose hostname; change it to `localhost` when running the API directly
on your machine. Existing `.env` files are not overwritten automatically.
`PORT` defaults to `3000`, `HOST` to `0.0.0.0`, and `CORS_ORIGIN` to
`http://localhost:5173`. Configuration is validated at startup.

For Docker Compose, first configure the root `.env` as described in the
[project overview](../../README.md#docker-compose).
From the repository root, `docker compose up --build backend db` starts the API
and PostgreSQL. Prisma Client is generated before the development server starts,
including when the source directory is bind-mounted.

## 🏗️ Architecture

Code is organized into vertical feature slices rather than global layer folders:

- `src/features/health/`: existing liveness and readiness routes.
- `src/features/tracks/`: track schemas, HTTP routes, application service, and repository.
- `src/features/url-management/`: YouTube Music URL validation and track-source management.
- `src/shared/`: reusable HTTP errors and JSON Schemas, not feature logic.
- `src/database/`: Prisma Client and PostgreSQL pool configuration.
- `src/app.ts`: application composition, CORS, and centralized error handling.
- `src/server.ts`: configuration, listening, and graceful shutdown.

Each slice owns its routes, services, repositories, and request/response schemas.
Route handlers provide the HTTP boundary; services are independent of Fastify
and Prisma. URL management uses the track service to verify ownership of the
parent track. The application factory requires health, track, and URL repository
dependencies so HTTP tests do not require a database. Shutdown closes Fastify
and disconnects Prisma's pool.

## Tracks and URL management

| Endpoint | Purpose | Success |
| --- | --- | --- |
| `POST /api/tracks` | Create track metadata | `201`, track and `Location` header |
| `GET /api/tracks?limit=20&offset=0` | List tracks ordered by UUID | `200`, array |
| `GET /api/tracks/:trackId` | Retrieve a track | `200`, track |
| `PATCH /api/tracks/:trackId` | Update supplied metadata fields | `200`, track |
| `DELETE /api/tracks/:trackId` | Delete a track without sources | `204` |
| `POST /api/urls/validate` | Validate and canonicalize one music URL; no persistence | `200`, normalized URL |
| `POST /api/tracks/:trackId/sources` | Attach a music URL to an existing track | `201`, source |
| `GET /api/tracks/:trackId/sources` | List the track's YouTube Music sources | `200`, array |
| `DELETE /api/tracks/:trackId/sources/:sourceId` | Remove a source from its parent track | `204` |

Create a track with `{"title":"Song","artist":"Artist","album":"","duration":180}`.
Title and artist must contain non-whitespace text and are limited to 500
characters; album may be empty and is limited to 500 characters. Duration is an
integer number of seconds from 0 to 2147483647. PATCH requires at least one
metadata field. List pagination defaults to 20 items and offset 0; limit is
1-100 and offset is 0-2147483647.

Both URL POST endpoints accept `{"url":"https://music.youtube.com/watch?v=dQw4w9WgXcQ"}`.
Only individual HTTPS `music.youtube.com/watch` URLs with exactly one
11-character video ID are accepted. Standard YouTube links, shortened links,
playlist-only links, credentials, and nonstandard ports are rejected.
An individual watch URL containing playlist context is accepted; playlist,
tracking, and fragment parameters are removed. The canonical response is
`{"sourceUrl":"https://music.youtube.com/watch?v=dQw4w9WgXcQ","provider":"youtube_music","externalId":"dQw4w9WgXcQ"}`.
Saved sources also include UUID `id` and `trackId` fields.

Validation is structural: it makes no outbound requests, does not verify that a
video exists or is playable, and does not fetch metadata or enqueue downloads.
URLs are limited to 2048 characters. Fastify JSON Schemas validate bodies,
parameters, and queries, reject unknown fields, and do not coerce body values.
Missing resources return `404`; malformed requests return `400`. The database
uniqueness constraint rejects duplicate provider/video IDs with `409`, including
concurrent additions and additions to a different track. Track deletion returns
`409` while any source references it; remove sources explicitly first.
Errors use `{"status":"error","message":"..."}`.

## 🩺 Health endpoints

| Endpoint | Purpose | Responses |
| --- | --- | --- |
| `GET /api/health` | Process liveness; does not query the database | `200`, `{"status":"ok","service":"tubeyu-backend"}` |
| `GET /api/health/ready` | Database readiness using Prisma's `SELECT 1` | `200` with `database: "connected"`, or `503` when PostgreSQL is unavailable |

Database failures are logged server-side; connection details are not returned
to callers. PostgreSQL connection and query timeouts are five seconds.

## 🗄️ Prisma and builds

`prisma/schema.prisma` defines the `User` model, stored in the `users` table with
`created_at` and `updated_at` timestamps. The named
`20261106040202_create_default_user` migration creates this table and its unique
email index. Apply committed migrations in deployment with
`pnpm run prisma:deploy`; do not use development migrations in production.
For future schema changes, update the Prisma schema, run
`pnpm run prisma:migrate --name <description>`, and commit the generated migration.

`Track` is stored in `tracks` with a title, artist, album, and integer duration
in seconds. `TrackSource` is stored in `track_sources` and references a track
through `track_id`. It stores `source_url`, `provider`, and `external_id`, with
a unique constraint on `(provider, external_id)` and an index on `track_id`.
Both models use UUID primary keys. A track cannot be deleted while sources
reference it. The seed remains limited to the default user.

The seed script idempotently creates the default user (`Default User`,
`default@tubeyu.local`) with a scrypt password hash. Set `DEFAULT_USER_PASSWORD`
in `backend/.env` before running `pnpm run prisma:seed`. The seed fails if the
variable is missing or empty, and preserves an existing password hash when run
again. Existing users may have a null `password_hash` until their password is set.

To delete all tables and their data in the application schema, run the following
from `backend/`:

```sh
pnpm run prisma:drop --confirm
```

The script loads `backend/.env` and targets the `schema` parameter in
`DATABASE_URL`, or `public` when omitted. It requires `--confirm` and also drops
`_prisma_migrations`. It uses `CASCADE`, which can remove dependent objects,
including dependencies in other schemas. Do not run it against a database whose
data you need to keep. Recreate the tables with `pnpm run prisma:deploy`, then
run `pnpm run prisma:seed` if needed.

Generated Prisma Client files live in `src/generated/prisma` and are not committed.
Run `pnpm run prisma:generate` after schema changes and before type-checking or tests.
The build generates the client automatically. Generation needs `DATABASE_URL` to
load Prisma configuration but does not connect to PostgreSQL; the Docker image
uses a build-only placeholder URL for this step.

```sh
pnpm run typecheck
pnpm test
pnpm run build
pnpm start
```

`pnpm start` serves compiled code from `dist/`. The supplied Dockerfile is for
development and runs the watch server.

Tests use Fastify injection and Node's test runner. Set `TEST_DATABASE_URL` to
also run the PostgreSQL integration tests against a dedicated test database with
committed migrations applied; without it, those tests are skipped. Track/source
integration tests create isolated records and remove only their own records.
