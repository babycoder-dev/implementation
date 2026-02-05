import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 创建已过期的 cookie 来清除 session
    const response = NextResponse.json({ success: true, message: '退出成功' })

    response.cookies.set('session-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // 立即过期
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { success: false, error: '退出失败' },
      { status: 500 }
    )
  }
}
