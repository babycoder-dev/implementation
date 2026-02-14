import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空').optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  leader_id: z.string().uuid().optional().nullable()
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限访问', 403);
    }
    const { id: departmentId } = await params;
    const result = await sql`
      SELECT d.*, (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
      FROM departments d WHERE d.id = ${departmentId}
    `;
    if (result.length === 0) {
      return errorResponse('部门不存在', 404);
    }

    // Get department members
    const members = await sql`
      SELECT id, username, name, role, status, created_at
      FROM users
      WHERE department_id = ${departmentId}
      ORDER BY created_at DESC
    `;

    return successResponse({
      ...result[0],
      members: members
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    return errorResponse('获取部门详情失败', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限访问', 403);
    }
    const { id: departmentId } = await params;
    const body = await request.json();
    const validated = updateDepartmentSchema.parse(body);
    const existing = await sql`SELECT id, parent_id FROM departments WHERE id = ${departmentId}`;
    if (existing.length === 0) {
      return errorResponse('部门不存在', 404);
    }
    if (validated.parent_id === departmentId) {
      return errorResponse('部门不能设置自己为上级部门', 400);
    }

    // Get current values
    const currentDept = await sql<Array<{ name: string; description: string | null; parent_id: string | null; leader_id: string | null }>>`
      SELECT name, description, parent_id, leader_id FROM departments WHERE id = ${departmentId}
    `;

    if (currentDept.length === 0) {
      return errorResponse('部门不存在', 404);
    }

    const current = currentDept[0];

    // Build parameterized update
    const newName = validated.name ?? current.name;
    const newDesc = validated.description !== undefined ? validated.description : current.description;
    const newParentId = validated.parent_id !== undefined ? validated.parent_id : current.parent_id;
    const newLeaderId = validated.leader_id !== undefined ? validated.leader_id : current.leader_id;

    // Build update fields and values
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (validated.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(newName);
    }
    if (validated.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(newDesc);
    }
    if (validated.parent_id !== undefined) {
      updates.push(`parent_id = $${idx++}`);
      values.push(newParentId);
    }
    if (validated.leader_id !== undefined) {
      updates.push(`leader_id = $${idx++}`);
      values.push(newLeaderId);
    }

    if (updates.length === 0) {
      return errorResponse('没有要更新的字段', 400);
    }

    values.push(departmentId);
    const updateSql = `UPDATE departments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

    const result = await sql.unsafe(updateSql, ...values) as Array<{ id: string; name: string; description: string | null; parent_id: string | null; leader_id: string | null; created_at: Date; updated_at: Date | null }>;

    return successResponse(result[0], { message: '部门更新成功' });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as unknown as { errors: Array<{ message: string }> };
      return errorResponse(zodError.errors?.[0]?.message || 'Validation error', 400);
    }
    console.error('Error updating department:', error);
    return errorResponse('更新部门失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限访问', 403);
    }
    const { id: departmentId } = await params;
    const existing = await sql`SELECT id FROM departments WHERE id = ${departmentId}`;
    if (existing.length === 0) {
      return errorResponse('部门不存在', 404);
    }
    const children = await sql`SELECT id FROM departments WHERE parent_id = ${departmentId}`;
    if (children.length > 0) {
      return errorResponse('请先删除子部门', 400);
    }
    const users = await sql`SELECT id FROM users WHERE department_id = ${departmentId}`;
    if (users.length > 0) {
      return errorResponse('请先将部门用户移至其他部门', 400);
    }
    await sql`DELETE FROM departments WHERE id = ${departmentId}`;
    return successResponse(null, { message: '部门删除成功' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return errorResponse('删除部门失败', 500);
  }
}
