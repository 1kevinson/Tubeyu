# 🎵 Tubeyu

[![Overview — current page](docs/assets/overview-active.svg)](README.md) [![Backend documentation](docs/assets/backend.svg)](docs/backend/README.md)

---

Tubeyu is a self-hosted music collection archiving and batch-processing platform.

The user provides individual music links and playlist links. The application builds a structured collection, maintains references to the original tracks, imports authorized audio recordings, converts compatible files and generates downloadable ZIP archives.

## ⚙️ Backend

The backend foundation uses Node.js, Fastify, TypeScript, and Prisma for PostgreSQL,
with controller, service, and repository layers. The Backend tab above covers
setup, health endpoints, database migrations, and build commands.
