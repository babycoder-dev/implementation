import { db } from '../src/db'
import { users } from '../src/db/schema'
import { hashPassword } from '../src/lib/auth/password'
import { eq } from 'drizzle-orm'

async function createAdmin() {
  const username = process.argv[2]
  const password = process.argv[3]
  const name = process.argv[4] || username

  if (!username || !password) {
    console.log('Usage: npx tsx scripts/create-admin.ts <username> <password> [name]')
    process.exit(1)
  }

  try {
    const passwordHash = await hashPassword(password)

    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        name,
        role: 'admin',
      })
      .onConflictDoNothing()
      .returning()

    if (user) {
      console.log('Admin user created successfully:', user.username)
    } else {
      console.log('Admin user already exists')
    }
  } catch (error) {
    console.error('Error creating admin:', error)
    process.exit(1)
  }
}

createAdmin()
