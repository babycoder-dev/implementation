import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { taskFiles, tasks } from '@/db/schema'
import { validateRequest } from '@/lib/auth/middleware'
import { uploadFile, getFileUrl } from '@/lib/storage/minio'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate session
  const auth = await validateRequest(request)
  if (!auth) {
    return NextResponse.json(
      { success: false, error: '未授权' },
      { status: 401 }
    )
  }

  // Check admin permission
  const { id: taskId } = await params

  try {
    // Check if task exists
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      )
    }

    // Check if user is admin or task owner
    const isAdmin = auth.role === 'admin'
    const isOwner = task.createdBy === auth.userId

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的文件' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: '请输入文件标题' },
        { status: 400 }
      )
    }

    // Determine file type from MIME type
    const fileType = determineFileType(file.type)

    // Generate unique filename
    const ext = file.name.split('.').pop() || ''
    const filename = `${randomUUID()}.${ext}`

    // Upload file to MinIO
    const uploadResult = await uploadFile(file, `tasks/${taskId}`, filename)

    // Get the public URL
    const fileUrl = getFileUrl(uploadResult.path)

    // Save file info to database
    const [newFile] = await db
      .insert(taskFiles)
      .values({
        taskId,
        title,
        fileUrl,
        fileType,
        fileSize: uploadResult.size,
        order: 0,
      })
      .returning({
        id: taskFiles.id,
        title: taskFiles.title,
        fileUrl: taskFiles.fileUrl,
        fileType: taskFiles.fileType,
        fileSize: taskFiles.fileSize,
        order: taskFiles.order,
      })

    return NextResponse.json(
      {
        success: true,
        file: {
          id: newFile.id,
          filename: file.name,
          title: newFile.title,
          url: newFile.fileUrl,
          size: newFile.fileSize,
          type: newFile.fileType,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('File upload error:', error)

    if (error instanceof Error && error.message === '文件上传失败') {
      return NextResponse.json(
        { success: false, error: '文件上传失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: '保存文件信息失败' },
      { status: 500 }
    )
  }
}

function determineFileType(mimeType: string): string {
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
