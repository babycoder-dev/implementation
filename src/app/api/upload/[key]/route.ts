import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { validateRequest } from '@/lib/auth/middleware'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  endpoint: `${env().MINIO_USE_SSL ? 'https' : 'http'}://${env().MINIO_ENDPOINT}:${env().MINIO_PORT}`,
  credentials: {
    accessKeyId: env().MINIO_ACCESS_KEY,
    secretAccessKey: env().MINIO_SECRET_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
): Promise<NextResponse> {
  // Verify session
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  // Check admin role
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1)

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 })
  }

  try {
    const { key } = await params
    const decodedKey = decodeURIComponent(key)

    // Check if object exists
    try {
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: env().MINIO_BUCKET,
          Key: decodedKey,
        })
      )
    } catch {
      return NextResponse.json({ success: false, error: '文件不存在' }, { status: 404 })
    }

    // Delete the object
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: env().MINIO_BUCKET,
        Key: decodedKey,
      })
    )

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    )
  }
}
