import { env } from '@/env'

export interface UploadResult {
  url: string
  size: number
  path: string
}

export async function uploadFile(
  file: File,
  prefix: string,
  filename: string
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('prefix', prefix)
  formData.append('filename', filename)

  const response = await fetch(`${getMinioEndpoint()}/api/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('文件上传失败')
  }

  return response.json()
}

export function getFileUrl(path: string): string {
  return `${getMinioEndpoint()}/${env().MINIO_BUCKET}/${path}`
}

function getMinioEndpoint(): string {
  const protocol = env().MINIO_USE_SSL ? 'https' : 'http'
  return `${protocol}://${env().MINIO_ENDPOINT}:${env().MINIO_PORT}`
}
