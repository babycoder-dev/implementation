import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// GET /api/departments/[id]/users - Get users in a department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return errorResponse('无权限访问', 403);
    }

    const { id: departmentId } = await params;

    // Leaders can only view their own department
    if (currentUser.role === 'leader') {
      const leaderDept = await sql`SELECT department_id FROM users WHERE id = ${currentUser.userId}` as { department_id: string | null }[];
      if (leaderDept[0]?.department_id !== departmentId) {
        return errorResponse('只能查看本部门用户', 403);
      }
    }

    const users = await sql`
      SELECT id, username, name, role, status, created_at
      FROM users
      WHERE department_id = ${departmentId}
      ORDER BY created_at DESC
    `;

    return successResponse(users);
  } catch (error) {
    console.error('Error fetching department users:', error);
    return errorResponse('获取部门用户列表失败', 500);
  }
}

// POST /api/departments/[id]/users - Add user to department
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return errorResponse('无权限访问', 403);
    }

    const { id: departmentId } = await params;

    // Leaders can only add users to their own department
    if (currentUser.role === 'leader') {
      const leaderDept = await sql`SELECT department_id FROM users WHERE id = ${currentUser.userId}` as { department_id: string | null }[];
      if (leaderDept[0]?.department_id !== departmentId) {
        return errorResponse('只能管理本部门用户', 403);
      }
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return errorResponse('用户ID不能为空', 400);
    }

    const deptExists = await sql`SELECT id FROM departments WHERE id = ${departmentId}`;
    if (deptExists.length === 0) {
      return errorResponse('部门不存在', 404);
    }

    const userExists = await sql`SELECT id FROM users WHERE id = ${user_id}`;
    if (userExists.length === 0) {
      return errorResponse('用户不存在', 404);
    }

    await sql`UPDATE users SET department_id = ${departmentId} WHERE id = ${user_id}`;

    return successResponse(null, { message: '用户已添加到部门' });
  } catch (error) {
    console.error('Error adding user to department:', error);
    return errorResponse('添加用户到部门失败', 500);
  }
}

// DELETE /api/departments/[id]/users - Remove user from department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return errorResponse('无权限访问', 403);
    }

    const { id: departmentId } = await params;

    // Leaders can only remove users from their own department
    if (currentUser.role === 'leader') {
      const leaderDept = await sql`SELECT department_id FROM users WHERE id = ${currentUser.userId}` as { department_id: string | null }[];
      if (leaderDept[0]?.department_id !== departmentId) {
        return errorResponse('只能管理本部门用户', 403);
      }
    }

    const { user_id } = await request.json();

    if (!user_id) {
      return errorResponse('用户ID不能为空', 400);
    }

    // Verify user belongs to this department
    const userDept = await sql`SELECT department_id FROM users WHERE id = ${user_id}`;
    if (userDept.length === 0) {
      return errorResponse('用户不存在', 404);
    }
    if (userDept[0].department_id !== departmentId) {
      return errorResponse('用户不在此部门中', 404);
    }

    // Remove user from department (set department_id to null)
    await sql`UPDATE users SET department_id = NULL WHERE id = ${user_id}`;

    return successResponse(null, { message: '用户已从部门移除' });
  } catch (error) {
    console.error('Error removing user from department:', error);
    return errorResponse('从部门移除用户失败', 500);
  }
}
