import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { videoLogs } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { logVideoActionSchema } from '@/lib/validations/learning'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = logVideoActionSchema.parse(body)

    await db.insert(videoLogs).values({
      userId: auth.userId,
      fileId: validated.fileId,
      action: validated.action,
      currentTime: validated.currentTime,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return NextResponse.json(
        { success: false, error: firstIssue?.message || '验证失败' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '记录失败' },
      { status: 500 }
    )
  }
}
