import { SignJWT, jwtVerify } from 'jose'
import { env } from '@/env'

const SESSION_SECRET = new TextEncoder().encode(env().SESSION_SECRET)

export interface SessionPayload {
  userId: string
  createdAt: number
  [key: string]: unknown // Index signature for Jose library compatibility
}

export async function createSession(userId: string): Promise<string> {
  const payload: SessionPayload = {
    userId,
    createdAt: Date.now(),
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SESSION_SECRET)

  return token
}

export async function validateSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return payload as SessionPayload
  } catch {
    return null
  }
}

export function destroySession(): boolean {
  // For JWT, the server is stateless
  // The client needs to delete the cookie
  // Here we return true to indicate the operation succeeded
  return true
}
