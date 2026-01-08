import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Load environment variables
const databaseUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    adapter: async () => {
      const { PrismaBetterSQLite3 } = await import('@prisma/adapter-better-sqlite3')
      const Database = (await import('better-sqlite3')).default
      const db = new Database(databaseUrl.replace('file:', ''))
      return new PrismaBetterSQLite3(db)
    },
  },
})
