# 学习管理系统设计规范

> 基于 ui-ux-pro-max 重构后的设计风格

## 设计原则

1. **一致性** - 所有页面使用统一的布局和组件
2. **简洁性** - 避免不必要的装饰，聚焦功能
3. **可访问性** - 清晰的视觉层次和交互反馈

---

## 布局规范

### Admin 页面布局

所有 `/admin` 下的页面必须使用 `AdminLayout`：

```tsx
import { AdminLayout } from '@/components/layout/AdminLayout'

export default function AdminPage() {
  return (
    <AdminLayout>
      {/* 页面内容 */}
    </AdminLayout>
  )
}
```

### 页面结构

```
┌─────────────────────────────────────────────┐
│  Sidebar  │  Header                        │
├───────────┼────────────────────────────────┤
│           │                                │
│           │  ┌─────────────────────────┐  │
│           │  │   Page Header            │  │
│           │  │   - 页面标题             │  │
│           │  │   - 简短描述             │  │
│           │  └─────────────────────────┘  │
│           │                                │
│           │  ┌─────────────────────────┐  │
│           │  │   Main Content         │  │
│           │  │   (Cards, Tables, etc) │  │
│           │  └─────────────────────────┘  │
│           │                                │
└───────────┴────────────────────────────────┘
```

---

## 配色方案

### 主色调

| 用途 | 色值 | 示例 |
|------|------|------|
| 主要按钮 | `bg-primary-500` | 提交、保存按钮 |
| 强调文字 | `text-primary-600` | 链接、图标 |
| 背景高亮 | `bg-primary-100` | 徽章、标签 |

### 文字颜色

| 用途 | 色值 | 示例 |
|------|------|------|
| 标题 | `text-slate-900` | 页面标题、卡片标题 |
| 正文 | `text-slate-700` | 主要内容 |
| 辅助文字 | `text-slate-500` | 描述、次要信息 |
| 提示文字 | `text-slate-400` | 占位符、禁用状态 |

### 状态颜色

| 状态 | 颜色 | 示例 |
|------|------|------|
| 成功 | `text-green-600`, `bg-green-100` | 完成状态 |
| 警告 | `text-amber-600`, `bg-amber-100` | 待处理 |
| 错误 | `text-red-600`, `bg-red-50` | 错误提示 |

---

## 组件规范

### Card 组件

所有主要内容区块使用 Card 组件：

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
</Card>
```

### Button 组件

| 变体 | 用途 | 类名 |
|------|------|------|
| Primary | 主要操作（提交、保存） | `variant="default"` |
| Outline | 次要操作（取消、返回） | `variant="outline"` |
| Ghost | 轻微操作（查看详情） | `variant="ghost"` |
| Secondary | 辅助操作 | `variant="secondary"` |

### Badge 组件

| 状态 | 变体 | 示例 |
|------|------|------|
| 进行中 | `variant="default"` | `<Badge>进行中</Badge>` |
| 已完成 | `variant="secondary"` | `<Badge variant="secondary">已完成</Badge>` |
| 草稿 | `variant="outline"` | `<Badge variant="outline">草稿</Badge>` |

---

## 表单规范

### Input 组件

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-2">
  <Label htmlFor="field">字段标签</Label>
  <Input
    id="field"
    value={value}
    onChange={e => setValue(e.target.value)}
    placeholder="占位文字"
    disabled={loading}
  />
</div>
```

### Textarea 组件

```tsx
import { Textarea } from '@/components/ui/textarea'

<Textarea
  value={value}
  onChange={e => setValue(e.target.value)}
  placeholder="多行输入"
  rows={4}
  disabled={loading}
/>
```

---

## 页面标题规范

### 标准页面头部

```tsx
<div className="mb-6">
  <h1 className="text-2xl font-bold text-slate-900">页面标题</h1>
  <p className="text-slate-500 mt-1">简短描述（可选）</p>
</div>
```

### 带返回链接

```tsx
<div className="mb-6">
  <Link
    href="/admin/parent-page"
    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
  >
    <ArrowLeft className="w-4 h-4" />
    返回列表
  </Link>
</div>
```

---

## 表格规范

### 列表页面使用表格或卡片列表

```tsx
<div className="space-y-4">
  {items.map(item => (
    <Card key={item.id}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{item.title}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">编辑</Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-500">{item.description}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 加载状态

### 骨架屏

```tsx
if (!mounted) {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    </AdminLayout>
  )
}
```

### 加载中

```tsx
<div className="flex items-center justify-center h-64">
  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
  <span className="ml-2">加载中...</span>
</div>
```

---

## 错误处理

### 错误提示

```tsx
{error && (
  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
    {error}
  </div>
)}
```

### 空状态

```tsx
{items.length === 0 && (
  <div className="text-center py-8 text-slate-500">
    暂无数据
  </div>
)}
```

---

## 图标使用

使用 Lucide React 图标库：

```tsx
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'

// 图标大小规范
- 小图标: w-4 h-4 (按钮内、表格)
- 中图标: w-5 h-5 (卡片头部、列表项)
- 大图标: w-6 h-6 或 w-8 h-8 (页面装饰)
```

---

## 页面清单

### 需要统一设计的页面

| 优先级 | 页面 | 文件 | 状态 |
|--------|------|------|------|
| P0 | 创建任务 | `src/app/admin/tasks/create/page.tsx` | 需添加 AdminLayout |
| P0 | 编辑任务 | `src/app/admin/tasks/[id]/TaskEditor.tsx` | 需添加 AdminLayout |
| P1 | 创建用户 | `src/app/admin/users/create/page.tsx` | 需检查 |
| P2 | 报表页面 | `src/app/admin/reports/page.tsx` | 占位符 |
| P2 | 设置页面 | `src/app/admin/settings/page.tsx` | 占位符 |

### 已完成的页面

- ✅ 管理主页 `/admin`
- ✅ 任务列表 `/admin/tasks`
- ✅ 用户列表 `/admin/users`
- ✅ 编辑用户 `/admin/users/[id]`

---

## 实施顺序

1. **P0** - 修复创建任务和编辑任务页面的 AdminLayout
2. **P1** - 检查并修复创建用户页面
3. **P2** - 实现报表页面和设置页面的完整设计
