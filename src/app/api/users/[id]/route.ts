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
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('Forbidden', 403);
    }
    const { id: userId } = await params;
    const result = await sql`
      SELECT u.id, u.username, u.name, u.role, u.status, u.department_id, d.name as department_name
      FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ${userId}
    ` as (UserRow & { department_name: string | null })[];
    if (result.length === 0) return errorResponse('用户不存在', 404);
    return successResponse(result[0]);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('获取用户失败', 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('Forbidden', 403);
    }
    const { id: userId } = await params;
    const { username, password, name, role, status, department_id } = await request.json();
    const existingUser = await sql`SELECT id FROM users WHERE id = ${userId}` as UserRow[];
    if (existingUser.length === 0) return errorResponse('用户不存在', 404);
    if (username) {
      const usernameExists = await sql`SELECT id FROM users WHERE username = ${username} AND id != ${userId}` as { id: string }[];
      if (usernameExists.length > 0) return errorResponse('用户名已存在', 409);
    }
    if (department_id) {
      const deptExists = await sql`SELECT id FROM departments WHERE id = ${department_id}` as { id: string }[];
      if (deptExists.length === 0) return errorResponse('部门不存在', 400);
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    if (username) { updates.push('username = ?'); values.push(username); }
    if (password) { updates.push('password_hash = ?'); values.push(await bcrypt.hash(password, 10)); }
    if (name) { updates.push('name = ?'); values.push(name); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (department_id !== undefined) { updates.push('department_id = ?'); values.push(department_id); }
    if (updates.length === 0) return errorResponse('没有要更新的字段', 400);
    values.push(userId);
    await sql`UPDATE users SET ${updates.join(', ')} WHERE id = ${userId}`;
    const result = await sql`
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
