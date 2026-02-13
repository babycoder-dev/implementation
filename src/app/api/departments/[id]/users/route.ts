import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';

// GET /api/departments/[id]/users - Get users in a department
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = getUserFromHeaders(request);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;

    const users = await sql`
      SELECT id, username, name, role, status, created_at
      FROM users
      WHERE department_id = ${departmentId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching department users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch department users' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const deptExists = await sql`SELECT id FROM departments WHERE id = ${departmentId}`;
    if (deptExists.length === 0) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }

    const userExists = await sql`SELECT id FROM users WHERE id = ${user_id}`;
    if (userExists.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await sql`UPDATE users SET department_id = ${departmentId} WHERE id = ${user_id}`;

    return NextResponse.json({ success: true, message: 'User added to department' });
  } catch (error) {
    console.error('Error adding user to department:', error);
    return NextResponse.json({ success: false, error: 'Failed to add user to department' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id: departmentId } = await params;
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Verify user belongs to this department
    const userDept = await sql`SELECT department_id FROM users WHERE id = ${user_id}`;
    if (userDept.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (userDept[0].department_id !== departmentId) {
      return NextResponse.json({ success: false, error: 'User not in this department' }, { status: 404 });
    }

    // Remove user from department (set department_id to null)
    await sql`UPDATE users SET department_id = NULL WHERE id = ${user_id}`;

    return NextResponse.json({ success: true, message: 'User removed from department' });
  } catch (error) {
    console.error('Error removing user from department:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove user from department' }, { status: 500 });
  }
}
