import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch {
    return NextResponse.json({ success: false, error: '获取用户信息失败' }, { status: 500 })
  }
}
