import { validateSession } from './session'

export async function validateRequest(request: Request): Promise<{ userId: string } | null> {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  const match = cookieHeader.match(/session-token=([^;]+)/)
  if (!match) {
    return null
  }

  const token = match[1]
  const session = await validateSession(token)

  return session ? { userId: session.userId } : null
}
