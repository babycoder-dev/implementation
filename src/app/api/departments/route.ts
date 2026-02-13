import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserFromHeaders } from '@/lib/auth';
import { z } from 'zod';

// Helper to safely convert undefined to null for SQL
const toSqlNull = (value: string | null | undefined): string | null => value ?? null;

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  leader_id: string | null;
  created_at: Date;
  updated_at: Date | null;
  user_count: string;
}

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    // Validate authentication from headers set by middleware
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can manage departments, but leaders can view departments
    if (currentUser.role !== 'admin' && currentUser.role !== 'leader') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeTree = searchParams.get('tree') === 'true';

    if (includeTree) {
      // Get departments as tree structure
      const result = await sql<DepartmentRow[]>`
        WITH RECURSIVE department_tree AS (
          -- Base case: top-level departments
          SELECT d.*,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
          FROM departments d
          WHERE d.parent_id IS NULL

          UNION ALL

          -- Recursive case: child departments
          SELECT d.*,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
          FROM departments d
          INNER JOIN department_tree dt ON d.parent_id = dt.id
        )
        SELECT * FROM department_tree
        ORDER BY name
      `;

      // Build tree structure
      const buildTree = (departments: DepartmentRow[], parentId: string | null = null): DepartmentRow[] => {
        return departments.filter((d: DepartmentRow) => d.parent_id === parentId).map((d: DepartmentRow) => ({
          ...d,
          children: buildTree(departments, d.id)
        }));
      };

      return NextResponse.json({
        success: true,
        data: buildTree(result)
      });
    }

    // Get flat list with user count
    const departments = await sql<DepartmentRow[]>`
      SELECT d.*,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count
      FROM departments d
      ORDER BY d.name
    `;

    return NextResponse.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a department
const createDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  leader_id: z.string().uuid().optional().nullable()
});

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const currentUser = getUserFromHeaders(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create departments
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createDepartmentSchema.parse(body);

    // Check if parent department exists
    if (validated.parent_id) {
      const parentExists = await sql`SELECT id FROM departments WHERE id = ${validated.parent_id}`;
      if (parentExists.length === 0) {
        return NextResponse.json(
          { success: false, error: '上级部门不存在' },
          { status: 400 }
        );
      }
    }

    // Check if leader exists and is in the department
    if (validated.leader_id) {
      const leaderExists = await sql`SELECT id, department_id FROM users WHERE id = ${validated.leader_id}`;
      if (leaderExists.length === 0) {
        return NextResponse.json(
          { success: false, error: '部门负责人不存在' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate name at same level
    const parentIdValue = validated.parent_id;
    let existing: { id: string }[];

    if (!parentIdValue) {
      existing = await sql`
        SELECT id FROM departments
        WHERE name = ${validated.name} AND parent_id IS NULL
      `;
    } else {
      existing = await sql`
        SELECT id FROM departments
        WHERE name = ${validated.name} AND parent_id = ${parentIdValue}
      `;
    }

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '同级部门中已存在相同名称' },
        { status: 400 }
      );
    }

    // Use tagged template literal with proper null handling
    // For UUID columns, we need to cast null properly
    const descVal = validated.description || null;
    const pId = validated.parent_id || null;
    const lId = validated.leader_id || null;

    // Use sql.identifier to pass typed null values
    const result = await sql`
      INSERT INTO departments (name, description, parent_id, leader_id)
      VALUES (
        ${validated.name},
        ${descVal},
        ${pId ? pId : sql`null::uuid`},
        ${lId ? lId : sql`null::uuid`}
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      data: result[0]
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as unknown as { errors: Array<{ message: string }> };
      return NextResponse.json(
        { success: false, error: zodError.errors?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Error creating department:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
