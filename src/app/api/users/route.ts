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
  department_name: string | null;
  created_at: string;
}

interface UserResponse {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
  status: 'active' | 'disabled';
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}

// GET /api/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限访问', 403);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('department_id');

    const db = sql;

    // Get total count
    const countResult = await db`
      SELECT COUNT(*) as count FROM users
      WHERE 1=1
      ${role ? db`AND role = ${role}` : db``}
      ${status ? db`AND status = ${status}` : db``}
      ${departmentId ? db`AND department_id = ${departmentId}` : db``}
    ` as { count: string }[];
    const total = parseInt(countResult[0].count);

    let result: UserRow[];
    if (role || status || departmentId) {
      result = await db`
        SELECT u.id, u.username, u.name, u.role, u.status, u.department_id,
               d.name as department_name, u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE 1=1
        ${role ? db`AND u.role = ${role}` : db``}
        ${status ? db`AND u.status = ${status}` : db``}
        ${departmentId ? db`AND u.department_id = ${departmentId}` : db``}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as UserRow[];
    } else {
      result = await db`
        SELECT u.id, u.username, u.name, u.role, u.status, u.department_id,
               d.name as department_name, u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      ` as UserRow[];
    }

    const users: UserResponse[] = result.map((row) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      status: row.status,
      department_id: row.department_id,
      department_name: row.department_name,
      created_at: row.created_at,
    }));

    return successResponse(users, {
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('获取用户列表失败', 500);
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return errorResponse('无权限访问', 403);
    }

    const { username, password, name, role, department_id } = await request.json();

    if (!username || !password || !name) {
      return errorResponse('用户名、密码和姓名不能为空', 400);
    }

    const db = sql;

    // Check if username exists
    const existingUser = await db`
      SELECT id FROM users WHERE username = ${username}
    ` as { id: string }[];

    if (existingUser.length > 0) {
      return errorResponse('用户名已存在', 409);
    }

    // Check if department exists if provided
    if (department_id) {
      const deptExists = await db`
        SELECT id FROM departments WHERE id = ${department_id}
      ` as { id: string }[];
      if (deptExists.length === 0) {
        return errorResponse('部门不存在', 400);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db`
      INSERT INTO users (username, password_hash, name, role, status, department_id)
      VALUES (${username}, ${passwordHash}, ${name}, ${role || 'user'}, 'active', ${department_id || null})
      RETURNING id, username, name, role, status, department_id, created_at
    ` as UserRow[];

    const user: UserResponse = {
      ...result[0],
      department_name: null,
    };

    return successResponse(user, { message: '用户创建成功' }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse('创建用户失败', 500);
  }
}
