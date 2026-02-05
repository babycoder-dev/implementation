import { z } from 'zod'

export const uploadTaskFileSchema = z.object({
  title: z.string().min(1, '文件标题不能为空').max(200, '标题最多 200 个字符'),
})

export type UploadTaskFileInput = z.infer<typeof uploadTaskFileSchema>

export function determineFileType(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'video/mp4': 'video',
    'video/webm': 'video',
    'video/quicktime': 'video',
  }
  return typeMap[mimeType] || 'other'
}
