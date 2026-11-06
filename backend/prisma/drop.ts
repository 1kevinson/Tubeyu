import { createPrismaClient } from '../src/database/prisma.js'

if (!process.argv.includes('--confirm')) {
  throw new Error('Dropping tables deletes all data. Run prisma:drop with --confirm to proceed.')
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to drop database tables')
}

const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public'

if (!schema) {
  throw new Error('DATABASE_URL must specify a non-empty schema')
}

if (schema === 'information_schema' || schema.startsWith('pg_')) {
  throw new Error('Dropping tables in a PostgreSQL system schema is not allowed')
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

const prisma = createPrismaClient(databaseUrl)

try {
  console.warn(`Dropping all tables in schema "${schema}", including Prisma migration history.`)

  const count = await prisma.$transaction(async (transaction) => {
    const tables = await transaction.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = ${schema}
    `

    if (tables.length === 0) {
      return 0
    }

    const names = tables
      .map(({ tablename }) => `${quoteIdentifier(schema)}.${quoteIdentifier(tablename)}`)
      .join(', ')

    await transaction.$executeRawUnsafe(`DROP TABLE IF EXISTS ${names} CASCADE`)
    return tables.length
  })

  console.info(`Dropped ${count} table(s) from schema "${schema}".`)
} finally {
  await prisma.$disconnect()
}
