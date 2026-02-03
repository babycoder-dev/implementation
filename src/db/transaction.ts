import { drizzle } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'

const client = neon(process.env.DATABASE_URL!)

export async function transaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return client.transaction(async (tx) => {
    try {
      const result = await callback(tx)
      await tx.commit()
      return result
    } catch (error) {
      await tx.rollback()
      throw error
    }
  })
}
