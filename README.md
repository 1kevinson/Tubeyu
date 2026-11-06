# 🎵 Tubeyu

[![Overview — current page](1docs/assets/overview-active.svg)](README.md) [![Backend documentation](1docs/assets/backend.svg)](1docs/backend/README.md)

---

Tubeyu is a self-hosted music collection archiving and batch-processing platform.

The user provides individual music links and playlist links. The application builds a structured collection, maintains references to the original tracks, imports authorized audio recordings, converts compatible files and generates downloadable ZIP archives.

## Package management

The backend, frontend, and worker are independent pnpm projects. Each service
has its own `package.json`, pinned pnpm version, `pnpm-lock.yaml`, and
`node_modules`. There is no shared workspace or root dependency installation.
Use the backend's Node.js version (`backend/.node-version`) when working on it.
For example, install and run the backend from its directory:

```sh
corepack enable
cd backend
pnpm install --frozen-lockfile
cp .env.example .env
pnpm run prisma:generate
pnpm run dev
```

Run `pnpm install --frozen-lockfile` inside `frontend/` or `worker/` to install
that service independently. Start the frontend with `pnpm run dev` and the
worker with `pnpm run start:dev`, from their respective directories.
Use `pnpm add <package>` inside the relevant service and commit that service's
lockfile. Do not copy an existing `.env.example` over an already configured `.env`.

Node.js 26 no longer bundles Corepack. If it is missing, bootstrap it once with
`npm install --global corepack@0.34.6`, then run `corepack enable`. This is only
a Corepack bootstrap step; all project dependency management and scripts use pnpm.

## Docker Compose

From the repository root, copy `.env.example` to `.env` and set
`POSTGRES_PASSWORD` before running `docker compose up --build`. The root `.env`
is ignored by Git and supplies Compose credentials, service URLs, and ports.
Use URL-safe PostgreSQL credentials, or percent-encode credentials in an explicit
`DATABASE_URL`. Changing credentials does not update an existing database volume.
The `broker` service runs Redis for worker job queuing; Redis is not used as an
application cache. Set `REDIS_URL=redis://broker:6379` in an existing root
`.env` after updating, and see the [broker documentation](1docs/broker/README.md).

The backend also requires `backend/.env`; copy `backend/.env.example` if it does
not exist. Compose overrides its `NODE_ENV`, `PORT`, and `DATABASE_URL` with the
root configuration. If you change `FRONTEND_PORT`, update `CORS_ORIGIN` in
`backend/.env` to match.

JavaScript services build from their own directories (for example,
`docker build backend`). Each service uses its own pnpm dependency volume;
no dependency directories or lockfiles are shared. The `db_data` volume is unchanged.

## ⚙️ Backend

The backend foundation uses Node.js, Fastify, TypeScript, and Prisma for PostgreSQL,
organized into health, tracks, and URL-management feature slices. Track CRUD and
individual YouTube Music URL validation and attachment use Fastify JSON Schema
validation. The Backend tab above covers API contracts, setup, database
migrations, and build commands.
