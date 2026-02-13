/**
 * 数据库种子脚本 - 初始化测试数据
 */

import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

interface DeptRow {
  id: string;
  name: string;
}

async function seed() {
  console.log('开始初始化数据库...');

  try {
    // 创建部门
    await sql`
      INSERT INTO departments (name, description)
      VALUES
        ('技术部', '技术研发部门'),
        ('市场部', '市场营销部门'),
        ('人力资源部', '人力资源管理')
      ON CONFLICT (name) DO NOTHING
    `;
    console.log('✓ 部门创建完成');

    // 获取部门ID
    const depts = await sql<DeptRow[]>`SELECT id, name FROM departments`;
    const techDept = depts.find((d) => d.name === '技术部');
    const hrDept = depts.find((d) => d.name === '人力资源部');

    // 创建管理员账户
    const adminHash = await bcrypt.hash('admin123', 10);
    await sql`
      INSERT INTO users (username, password_hash, name, role, status, department_id)
      VALUES ('admin', ${adminHash}, '系统管理员', 'admin', 'active', ${techDept?.id || null})
      ON CONFLICT (username) DO UPDATE SET password_hash = ${adminHash}
    `;
    console.log('✓ 管理员账户创建完成 (admin/admin123)');

    // 创建测试用户
    const userHash = await bcrypt.hash('test123', 10);
    await sql`
      INSERT INTO users (username, password_hash, name, role, status, department_id)
      VALUES
        ('testuser', ${userHash}, '测试用户', 'user', 'active', ${techDept?.id || null}),
        ('leader1', ${userHash}, '部门主管', 'leader', 'active', ${techDept?.id || null}),
        ('hr1', ${userHash}, 'HR主管', 'leader', 'active', ${hrDept?.id || null})
      ON CONFLICT (username) DO NOTHING
    `;
    console.log('✓ 测试用户创建完成 (testuser/test123)');

    // 创建示例任务
    const adminUser = await sql`SELECT id FROM users WHERE username = 'admin'`;
    if (adminUser.length > 0) {
      await sql`
        INSERT INTO tasks (title, description, deadline, status, passing_score, enable_quiz, created_by)
        VALUES
          ('安全培训课程', '企业信息安全基础知识培训', NOW() + INTERVAL '7 days', 'published', 80, true, ${adminUser[0].id}),
          ('新员工入职培训', '公司文化和工作流程介绍', NOW() + INTERVAL '14 days', 'published', 70, false, ${adminUser[0].id}),
          ('技术技能提升', '高级技术技能培训', NOW() + INTERVAL '30 days', 'draft', 85, true, ${adminUser[0].id})
        ON CONFLICT DO NOTHING
      `;
      console.log('✓ 示例任务创建完成');
    }

    console.log('\n数据库初始化完成！');
    console.log('\n登录信息:');
    console.log('  管理员: admin / admin123');
    console.log('  测试用户: testuser / test123');

  } catch (error) {
    console.error('初始化失败:', error);
    throw error;
  }
}

seed().catch(console.error);
