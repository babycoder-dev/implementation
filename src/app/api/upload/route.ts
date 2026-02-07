import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { validateRequest } from '@/lib/auth/middleware'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getPublicFileUrl } from '@/lib/storage/url-resolver'

const s3Client = new S3Client({
  endpoint: `${env().MINIO_USE_SSL ? 'https' : 'http'}://${env().MINIO_ENDPOINT}:${env().MINIO_PORT}`,
  credentials: {
    accessKeyId: env().MINIO_ACCESS_KEY,
    secretAccessKey: env().MINIO_SECRET_KEY,
  },
  region: 'us-east-1',
  forcePathStyle: true,
})

export async function POST(request: NextRequest) {
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const prefix = formData.get('prefix') as string
    const filename = formData.get('filename') as string

    if (!file || !prefix || !filename) {
      return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 })
    }

    const path = `${prefix}/${filename}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await s3Client.send(
      new PutObjectCommand({
        Bucket: env().MINIO_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const internalUrl = `${env().MINIO_USE_SSL ? 'https' : 'http'}://${env().MINIO_ENDPOINT}:${env().MINIO_PORT}/${env().MINIO_BUCKET}/${path}`
    const url = getPublicFileUrl(internalUrl)

    return NextResponse.json({
      success: true,
      url,
      size: file.size,
      path,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: '上传失败' },
      { status: 500 }
    )
  }
}
