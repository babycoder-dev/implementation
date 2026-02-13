import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for updating file order
const updateOrderSchema = z.object({
  file_ids: z.array(z.string().uuid('无效的文件ID')).min(1, '文件ID列表不能为空'),
});

// PUT /api/tasks/[id]/files/order - Update file order (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限修改文件排序', 403);
    }

    const { id: taskId } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateOrderSchema.parse(body);
    const { file_ids } = validatedData;

    // Verify task exists
    const taskResult = await sql<{ id: string }[]>`
      SELECT id FROM tasks WHERE id = ${taskId}
    `;

    if (taskResult.length === 0) {
      return errorResponse('任务不存在', 404);
    }

    // Verify all files belong to this task
    const filesResult = await sql<{ id: string }[]>`
      SELECT id FROM task_files
      WHERE id IN ${sql(file_ids)} AND task_id = ${taskId}
    `;

    if (filesResult.length !== file_ids.length) {
      return errorResponse('部分文件不存在或不属于该任务', 400);
    }

    // Update order for each file in a transaction for atomicity
    await sql.begin(async (transaction) => {
      for (let i = 0; i < file_ids.length; i++) {
        const fileId = file_ids[i];
        const newOrder = i + 1;

        await transaction`
          UPDATE task_files
          SET "order" = ${newOrder}
          WHERE id = ${fileId} AND task_id = ${taskId}
        `;
      }
    });

    // Get updated files
    const updatedFiles = await sql<{
      id: string;
      title: string;
      order: number;
    }[]>`
      SELECT id, title, "order"
      FROM task_files
      WHERE task_id = ${taskId}
      ORDER BY "order" ASC
    `;

    return successResponse(
      updatedFiles.map((f) => ({ id: f.id, title: f.title, order: f.order })),
      { message: '文件排序更新成功' }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: Array<{ message?: string }> };
      const firstError = zodError.errors[0];
      return errorResponse(firstError?.message || '参数验证失败', 400);
    }
    console.error('Update file order error:', error);
    return errorResponse('更新文件排序失败', 500);
  }
}
