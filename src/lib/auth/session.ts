import { SignJWT, jwtVerify } from 'jose'
import { env } from '@/env'

// Lazy encode secret to ensure env is loaded
function getSessionSecret(): Uint8Array {
  const secret = env().SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured')
  }
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  if (key.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return key
}

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

  const secret = getSessionSecret()
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  return token
}

export async function validateSession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret)
    return payload as SessionPayload
  } catch {
    return null
  }
}

export function destroySession(_token?: string): boolean {
  // For JWT, the server is stateless
  // The client needs to delete the cookie
  // Here we return true to indicate the operation succeeded
  return true
}
