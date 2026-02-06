# Admin 页面设计规范实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**目标**：统一所有 Admin 页面的设计风格，遵循 `docs/design-system.md` 和模板组件 `src/components/layout/AdminPageTemplate.tsx`

**架构**：
1. 使用 `FormPage` 模板统一表单页面
2. 使用 `ListPage` 模板统一列表页面
3. 修复缺失的 AdminLayout 包装
4. 优化 Tab 导航样式

**技术栈**：Next.js 14, React, Tailwind CSS, Lucide Icons

---

## 任务清单

### Phase 1: P0 - 任务管理页面

#### Task 1: 修复创建任务页面

**文件**：
- 修改: `src/app/admin/tasks/create/page.tsx`

**验收标准**：
- 页面使用 `AdminLayout`
- 遵循 FormPage 模板结构
- 返回链接跳转到 `/admin/tasks`

**步骤**：
1. 导入 `FormPage` 模板
2. 使用 `FormPage` 包装表单
3. 验证页面在浏览器中正常显示

---

#### Task 2: 修复编辑任务页面

**文件**：
- 修改: `src/app/admin/tasks/[id]/TaskEditor.tsx`
- 修改: `src/app/admin/tasks/[id]/page.tsx`

**验收标准**：
- 页面使用 `AdminLayout`
- Tab 导航样式与设计规范一致
- 返回链接跳转到 `/admin/tasks`

**步骤**：
1. 在 `page.tsx` 中添加 `AdminLayout` 包装
2. 优化 TaskEditor 中的 Tab 导航样式
3. 验证页面在浏览器中正常显示

---

### Phase 2: P1 - 用户管理页面

#### Task 3: 修复创建用户页面

**文件**：
- 修改: `src/app/admin/users/create/page.tsx`

**验收标准**：
- 页面使用 `AdminLayout`
- 遵循 FormPage 模板结构
- 返回链接跳转到 `/admin/users`

---

### Phase 3: P2 - 报表和设置页面

#### Task 4: 实现报表页面

**文件**：
- 修改: `src/app/admin/reports/page.tsx`

**验收标准**：
- 页面使用 `AdminLayout`
- 包含基本的报表展示布局
- 遵循设计规范的颜色和间距

**步骤**：
1. 使用 `AdminLayout` 包装页面
2. 创建页面标题和描述
3. 添加基本的统计卡片布局

---

#### Task 5: 实现设置页面

**文件**：
- 修改: `src/app/admin/settings/page.tsx`

**验收标准**：
- 页面使用 `AdminLayout`
- 包含基本设置项的表单布局
- 遵循设计规范

---

## 快速参考

### FormPage 模板使用

```tsx
import { FormPage } from '@/components/layout/AdminPageTemplate'

export default function CreateTaskPage() {
  return (
    <FormPage
      title="创建任务"
      showBack
      backHref="/admin/tasks"
      backText="返回任务列表"
    >
      <form>
        {/* 表单内容 */}
      </form>
    </FormPage>
  )
}
```

### ContentSection 模板使用

```tsx
import { ContentSection } from '@/components/layout/AdminPageTemplate'

<ContentSection title="基本信息" action={<Button>操作</Button>}>
  {/* 内容 */}
</ContentSection>
```

### 标准颜色

- 标题: `text-slate-900`
- 正文: `text-slate-700`
- 辅助: `text-slate-500`
- 主色: `text-primary-600`

---

## 验证命令

```bash
# 构建验证
npm run build

# 测试验证
npm test -- --run
```

---

## 提交历史

计划完成后的提交：
1. `feat: 修复创建任务页面设计`
2. `feat: 修复编辑任务页面设计`
3. `feat: 修复创建用户页面设计`
4. `feat: 实现报表页面`
5. `feat: 实现设置页面`
