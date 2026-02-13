import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// Task file database row
interface TaskFileRow {
  id: string;
  task_id: string;
  title: string;
  file_url: string;
  original_url: string | null;
  file_type: string;
  file_size: number;
  duration: number | null;
  required_completion: string;
  order: number;
  converted: boolean;
  created_at: string;
}

// DELETE /api/tasks/[id]/files/[fileId] - Delete a file from a task (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限删除文件', 403);
    }

    const { id: taskId, fileId } = await params;

    // Verify task exists
    const taskResult = await sql<{ id: string }[]>`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Verify file exists and belongs to this task
    const fileResult = await sql<TaskFileRow[]>`
      SELECT id FROM task_files
      WHERE id = ${fileId} AND task_id = ${taskId}
    `;

    if (fileResult.length === 0) {
      return errorResponse('文件不存在或不属于该任务', 404);
    }

    // Delete the file
    await sql`
      DELETE FROM task_files
      WHERE id = ${fileId}
    `;

    return successResponse({ id: fileId }, { message: '文件删除成功' });
  } catch (error) {
    console.error('Delete task file error:', error);
    return errorResponse('删除文件失败', 500);
  }
}
