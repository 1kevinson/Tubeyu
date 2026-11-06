import { randomBytes, scrypt } from 'node:crypto'
import { createPrismaClient } from '../src/database/prisma.js'

// Seed is only necessary for user authentication, no need to seed other data.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database')
}

const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD
if (!defaultUserPassword) {
  throw new Error('DEFAULT_USER_PASSWORD is required to seed the database')
}

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')

  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

const prisma = createPrismaClient(databaseUrl)

try {
  const passwordHash = await hashPassword(defaultUserPassword)
  const user = await prisma.user.upsert({
    where: { email: 'johndoe@tubeyu.com' },
    update: {},
    create: {
      name: 'Usual Person',
      email: 'johndoe@tubeyu.com',
      passwordHash,
    },
  })

  if (!user.passwordHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })
  }

  console.info(`Seeded default user: ${user.email}`)
} finally {
  await prisma.$disconnect()
}
