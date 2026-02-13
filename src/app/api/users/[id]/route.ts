import { NextRequest } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getUserFromHeaders } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
  status: 'active' | 'disabled';
  department_id: string | null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }
    const { id: userId } = await params;
    const db = sql;

    // Get target user info first
    const targetUser = await db`
      SELECT u.id, u.username, u.name, u.role, u.status, u.department_id, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ${userId}
    ` as (UserRow & { department_name: string | null })[];

    if (targetUser.length === 0) return errorResponse('用户不存在', 404);

    // Permission matrix per SRS-04
    if (currentUser.role === 'admin') {
      // Admin: full access
      return successResponse(targetUser[0]);
    } else if (currentUser.role === 'leader') {
      // Leader: only users in their department
      const leaderDept = await db`
        SELECT department_id FROM users WHERE id = ${currentUser.userId}
      ` as { department_id: string | null }[];

      if (targetUser[0].department_id === leaderDept[0]?.department_id) {
        return successResponse(targetUser[0]);
      }
      return errorResponse('无权限访问', 403);
    } else {
      // User: only themselves
      if (currentUser.userId === userId) {
        return successResponse(targetUser[0]);
      }
      return errorResponse('无权限访问', 403);
    }
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('获取用户失败', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return errorResponse('未登录', 401);
    }
    const { id: userId } = await params;
    const { username, password, name, role, status, department_id } = await request.json();
    const db = sql;

    // Check if target user exists
    const existingUser = await db`SELECT id, department_id FROM users WHERE id = ${userId}` as UserRow[];
    if (existingUser.length === 0) return errorResponse('用户不存在', 404);

    // Permission matrix per SRS-04
    const targetDeptId = existingUser[0].department_id;
    let canUpdate = false;

    if (currentUser.role === 'admin') {
      // Admin: full access
      canUpdate = true;
    } else if (currentUser.role === 'leader') {
      // Leader: only users in their department
      const leaderDept = await db`
        SELECT department_id FROM users WHERE id = ${currentUser.userId}
      ` as { department_id: string | null }[];
      if (targetDeptId === leaderDept[0]?.department_id) {
        canUpdate = true;
      }
    } else {
      // User: only themselves
      if (currentUser.userId === userId) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      return errorResponse('无权限修改此用户', 403);
    }

    // Regular users can only update themselves (not role/status)
    if (currentUser.role === 'user' && currentUser.userId !== userId) {
      return errorResponse('无权限修改此用户', 403);
    }
    // Non-admin cannot change role or status
    if (currentUser.role !== 'admin' && (role || status)) {
      return errorResponse('无权限修改用户角色或状态', 403);
    }

    if (username) {
      const usernameExists = await db`SELECT id FROM users WHERE username = ${username} AND id != ${userId}` as { id: string }[];
      if (usernameExists.length > 0) return errorResponse('用户名已存在', 409);
    }
    if (department_id) {
      const deptExists = await db`SELECT id FROM departments WHERE id = ${department_id}` as { id: string }[];
      if (deptExists.length === 0) return errorResponse('部门不存在', 400);
    }

    // Build parameterized update
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (username) {
      updates.push(`username = $${idx++}`);
      values.push(username);
    }
    if (password) {
      updates.push(`password_hash = $${idx++}`);
      values.push(await bcrypt.hash(password, 10));
    }
    if (name) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (role && currentUser.role === 'admin') {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (status && currentUser.role === 'admin') {
      updates.push(`status = $${idx++}`);
      values.push(status);
    }
    if (department_id !== undefined) {
      updates.push(`department_id = $${idx++}`);
      values.push(department_id || null);
    }

    if (updates.length === 0) return errorResponse('没有要更新的字段', 400);
    values.push(userId);

    const updateSql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    await db.unsafe(updateSql, ...values);

    const result = await db`
      SELECT u.id, u.username, u.name, u.role, u.status, u.department_id, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ${userId}
    ` as (UserRow & { department_name: string | null })[];
    return successResponse(result[0], { message: '用户更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('更新用户失败', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('Forbidden', 403);
    }
    const { id: userId } = await params;
    const existingUser = await sql`SELECT id FROM users WHERE id = ${userId}` as { id: string }[];
    if (existingUser.length === 0) return errorResponse('用户不存在', 404);
    await sql`DELETE FROM users WHERE id = ${userId}`;
    return successResponse(null, { message: '用户删除成功' });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('删除用户失败', 500);
  }
}
