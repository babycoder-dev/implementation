import { db } from '../src/db'
import { users } from '../src/db/schema'
import { hashPassword } from '../src/lib/auth/password'
import { eq } from 'drizzle-orm'

async function createAdmin() {
  // Support command line args or use defaults
  const username = process.argv[2] || 'admin'
  const password = process.argv[3] || 'Admin@123'
  const name = process.argv[4] || username

  console.log(`Creating admin user: ${username}`)

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
