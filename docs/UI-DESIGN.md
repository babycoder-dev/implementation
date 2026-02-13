# 学习管理系统 - UI/UX 设计规范

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档名称 | UI/UX 设计规范 |
| 版本 | v1.0 |
| 状态 | 待确认 |

---

## 目录

1. [设计原则](#1-设计原则)
2. [色彩系统](#2-色彩系统)
3. [字体规范](#3-字体规范)
4. [组件库](#4-组件库)
5. [图表组件](#5-图表组件)
6. [页面布局](#6-页面布局)
7. [响应式设计](#7-响应式设计)
8. [交互规范](#8-交互规范)

---

## 1. 设计原则

### 1.1 核心设计理念

- **简洁**：界面清晰，减少认知负担
- **一致**：组件、交互、术语保持统一
- **高效**：用户能快速完成操作
- **可访问**：符合 WCAG 2.1 AA 标准

### 1.2 设计风格

| 属性 | 值 |
|-----|-----|
| 风格 | 现代简洁 / Clean Modern |
| 圆角 | 8px (中等圆角) |
| 阴影 | 柔和投影 |
| 间距 | 4px 基础栅格 |
| 图标 | Lucide Icons |

---

## 2. 色彩系统

### 2.1 主色调

| 角色 | 色值 | 用途 |
|-----|------|------|
| 主色 | `#2563eb` (Blue 600) | 主要按钮、链接、选中状态 |
| 主色悬停 | `#1d4ed8` (Blue 700) | 主按钮悬停 |
| 主色点击 | `#1e40af` (Blue 800) | 主按钮点击 |

### 2.2 功能色

| 角色 | 色值 | 用途 |
|-----|------|------|
| 成功 | `#22c55e` (Green 500) | 完成、通过、成功 |
| 警告 | `#eab308` (Yellow 500) | 提醒、待处理 |
| 错误 | `#ef4444` (Red 500) | 失败、错误、删除 |
| 信息 | `#3b82f6` (Blue 500) | 信息提示 |

### 2.3 中性色

| 角色 | 色值 | 用途 |
|-----|------|------|
| 背景 | `#f8fafc` (Slate 50) | 页面背景 |
| 卡片 | `#ffffff` (White) | 卡片、对话框背景 |
| 边框 | `#e2e8f0` (Slate 200) | 边框、分隔线 |
| 次要文字 | `#64748b` (Slate 500) | 次要说明文字 |
| 主要文字 | `#0f172a` (Slate 900) | 主要文字 |

### 2.4 语义色

| 状态 | 色值 | 用途 |
|-----|------|------|
| 进行中 | `#3b82f6` (Blue) | 任务进行中 |
| 已完成 | `#22c55e` (Green) | 任务已完成 |
| 未开始 | `#94a3b8` (Slate 400) | 未开始状态 |
| 已过期 | `#f59e0b` (Amber) | 过期任务 |

---

## 3. 字体规范

### 3.1 字体家族

| 类型 | 字体 | 用途 |
|-----|------|------|
| 主要字体 | Inter | 界面文字、正文 |
| 等宽字体 | JetBrains Mono | 代码、数字 |

### 3.2 字号规范

| 用途 | 字号 | 字重 | 行高 |
|-----|------|-----|------|
| 大标题 | 32px (2rem) | Bold | 1.2 |
| 中标题 | 24px (1.5rem) | Bold | 1.3 |
| 小标题 | 20px (1.25rem) | Semibold | 1.4 |
| 正文大 | 16px (1rem) | Regular | 1.5 |
| 正文小 | 14px (0.875rem) | Regular | 1.5 |
| 辅助文字 | 12px (0.75rem) | Regular | 1.4 |
| 标签文字 | 11px (0.6875rem) | Medium | 1.3 |

---

## 4. 组件库

### 4.1 shadcn/ui 组件

系统使用 [shadcn/ui](https://ui.shadcn.com/) 作为基础组件库。

**已安装组件**：

| 组件 | 用途 |
|-----|------|
| Button | 按钮 |
| Card | 卡片容器 |
| Input | 文本输入 |
| Textarea | 多行文本 |
| Label | 表单标签 |
| Select | 下拉选择 |
| Table | 数据表格 |
| Dialog | 对话框 |
| DropdownMenu | 下拉菜单 |
| Badge | 状态标签 |
| Progress | 进度条 |
| Avatar | 头像 |
| Tabs | 选项卡 |
| Form | 表单（含验证） |
| Skeleton | 骨架屏加载 |
| Toast | 轻提示 |
| ScrollArea | 滚动区域 |

### 4.2 自定义组件

| 组件名称 | 用途 | 基于 |
|---------|------|------|
| TaskCard | 任务卡片 | Card |
| FileList | 文件列表 | Table |
| UserAvatar | 用户头像 |Badge | 状态 Avatar |
| Status标签 | Badge |

---

## 5. 图表组件

### 5.1 使用 shadcn/ui Charts

系统使用 shadcn/ui 的图表组件，基于 [Recharts](https://recharts.org/) 实现。

**安装方式**：

```bash
npx shadcn@latest add chart
```

### 5.2 可用图表类型

#### 5.2.1 柱状图 (Bar Chart)

**用途**：任务完成率、部门对比

```tsx
<ChartContainer config={chartConfig}>
  <BarChart data={data}>
    <XAxis dataKey="name" />
    <YAxis />
    <Bar dataKey="completion" fill="var(--color-success)" />
  </BarChart>
</ChartContainer>
```

#### 5.2.2 折线图 (Line Chart)

**用途**：学习趋势、完成进度变化

```tsx
<ChartContainer config={chartConfig}>
  <LineChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Line type="monotone" dataKey="score" stroke="var(--color-primary)" />
  </LineChart>
</ChartContainer>
```

#### 5.2.3 饼图 (Pie Chart)

**用途**：任务完成/未完成占比

```tsx
<ChartContainer config={chartConfig}>
  <PieChart>
    <Pie data={data} cx="50%" cy="50%" />
    <Pie data={data2} cx="50%" cy="50%" />
  </PieChart>
</ChartContainer>
```

#### 5.2.4 面积图 (Area Chart)

**用途**：学习时长分布

```tsx
<ChartContainer config={chartConfig}>
  <AreaChart data={data}>
    <XAxis dataKey="time" />
    <YAxis />
    <Area type="monotone" dataKey="duration" />
  </AreaChart>
</ChartContainer>
```

### 5.3 图表配色

| 图表类型 | 默认色值 | 说明 |
|---------|---------|------|
| 主数据 | `#2563eb` | Blue 600 |
| 成功数据 | `#22c55e` | Green 500 |
| 警告数据 | `#eab308` | Yellow 500 |
| 错误数据 | `#ef4444` | Red 500 |
| 辅助数据 | `#94a3b8` | Slate 400 |

### 5.4 图表配置示例

```tsx
const chartConfig = {
  completed: {
    label: "已完成",
    color: "hsl(142 76% 36%)",
  },
  inProgress: {
    label: "进行中",
    color: "hsl(221 83% 53%)",
  },
  pending: {
    label: "未开始",
    color: "hsl(215 20% 65%)",
  },
}
```

---

## 6. 页面布局

### 6.1 布局结构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         顶部导航栏 (Header)                          │
│  Logo    导航菜单          用户信息  通知                           │
├────────────┬───────────────────────────────────────────────────────┤
│            │                                                       │
│  侧边栏    │                    主内容区域                         │
│  (Sidebar)│                                                       │
│            │                                                       │
│  • 仪表盘  │              ┌─────────────────────────────────┐    │
│  • 任务管理│              │                                 │    │
│  • 用户管理│              │         页面内容               │    │
│  • 部门管理│              │                                 │    │
│  • 报表统计│              │                                 │    │
│            │              └─────────────────────────────────┘    │
│            │                                                       │
└────────────┴───────────────────────────────────────────────────────┘
```

### 6.2 间距规范

| 场景 | 间距 |
|-----|------|
| 页面边距 | 24px |
| 卡片内边距 | 20px |
| 卡片间距 | 16px |
| 元素间距 | 8px |
| 列表项间距 | 12px |

### 6.3 卡片规范

| 属性 | 值 |
|-----|-----|
| 背景色 | `#ffffff` |
| 边框 | `1px solid #e2e8f0` |
| 圆角 | 8px |
| 阴影 | `0 1px 3px 0 rgb(0 0 0 / 0.1)` |

---

## 7. 响应式设计

### 7.1 断点定义

| 断点 | 宽度 | 命名 |
|-----|------|------|
| sm | 640px | small |
| md | 768px | medium |
| lg | 1024px | large |
| xl | 1280px | extra large |
| 2xl | 1536px | double extra large |

### 7.2 响应式布局

| 屏幕宽度 | 侧边栏 | 主内容 |
|---------|--------|-------|
| < 1024px | 隐藏 | 全宽 |
| 1024px-1280px | 折叠 | 自适应 |
| > 1280px | 完全显示 | 自适应 |

---

## 8. 交互规范

### 8.1 按钮交互

| 状态 | 效果 |
|-----|------|
| 默认 | 主色填充，白字 |
| 悬停 | 主色加深 10% |
| 点击 | 主色更深 20% |
| 禁用 | 50% 透明度 |

### 8.2 过渡动画

| 场景 | 时长 | 缓动 |
|-----|------|-----|
| 按钮悬停 | 150ms | ease-in-out |
| 页面切换 | 200ms | ease-in-out |
| 弹窗显示 | 200ms | ease-out |
| 列表过滤 | 150ms | ease-in-out |

### 8.3 加载状态

| 类型 | 组件 | 用途 |
|-----|------|------|
| 骨架屏 | Skeleton | 内容加载中 |
| 加载中 | Spinner | 操作执行中 |
| 进度条 | Progress | 长时间操作 |

---

---

## 9. CSS 变量定义

### 9.1 亮色模式变量

```css
:root {
  /* 背景色 */
  --background: 0 0% 100%;
  --card: 0 0% 100%;
  --popover: 0 0% 100%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;

  /* 文字色 */
  --foreground: 222.2 84% 4.9%;
  --card-foreground: 222.2 84% 4.9%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary-foreground: 210 40% 98%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive-foreground: 210 40% 98%;

  /* 边框与输入 */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;

  /* 圆角 */
  --radius: 0.5rem;
}
```

### 9.2 使用示例

```tsx
// 按钮样式
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  按钮文字
</button>

// 卡片样式
<div className="bg-card text-card-foreground border rounded-lg">
  卡片内容
</div>
```

---

## 10. 动画规范

### 10.1 动画时长

| 场景 | 时长 | 缓动函数 |
|-----|------|---------|
| 按钮悬停 | 150ms | ease-out |
| 元素淡入 | 200ms | ease-out |
| 页面切换 | 300ms | ease-in-out |
| Modal 弹窗 | 200ms | ease-out |
| 下拉菜单 | 150ms | ease-out |
| 列表过滤 | 150ms | ease-in-out |
| 骨架屏 | - | - |

### 10.2 动画实现

```tsx
// 淡入动画
const fadeIn = cn(
  "animate-in fade-in duration-200",
  "data-[side=bottom]:slide-in-from-top-2",
  "data-[side=top]:slide-in-from-bottom-2"
)

// 缩放动画
const scaleIn = cn(
  "animate-in zoom-in-95 duration-200",
  "data-[state=open]:animate-out data-[state=open]:fade-in-0",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
)
```

### 10.3 动画原则

- 优先使用 CSS `transform/opacity`（性能好）
- 避免 layout thrashing：不使用 `width/height` 做动画
- 微妙而一致：不要过度使用动画

---

## 11. 图标规范

### 11.1 图标选择

| 类别 | 推荐图标 | 大小 |
|-----|---------|-----|
| 操作图标 | Lucide Icons | 20×20px |
| 状态图标 | Lucide Icons | 16×16px |
| 导航图标 | Lucide Icons | 24×24px |

### 11.2 图标使用规则

| 规则 | 正确做法 | 错误做法 |
|-----|---------|---------|
| UI 图标 | 使用 SVG（Lucide） | 使用 Emoji ❌ |
| 图标按钮 | 添加 aria-label | 无标签 ❌ |
| 图标大小 | 统一尺寸 | 混用不同尺寸 ❌ |

### 11.3 状态图标颜色

| 状态 | 图标颜色 | 示例类名 |
|-----|---------|---------|
| 成功 | Green 500 | `text-green-500` |
| 警告 | Yellow 500 | `text-yellow-500` |
| 错误 | Red 500 | `text-red-500` |
| 进行中 | Blue 500 | `text-blue-500` |
| 未开始 | Slate 400 | `text-slate-400` |

### 11.4 图标使用示例

```tsx
import { CheckCircle, AlertCircle, Clock, FileText, Play, Download } from "lucide-react"

// 图标按钮（带无障碍标签）
<IconButton aria-label="下载文件">
  <Download className="w-5 h-5" />
</IconButton>

// 带图标和文字的按钮
<Button>
  <Download className="w-4 h-4 mr-2" />
  下载文件
</Button>

// 状态图标
<CheckCircle className="w-5 h-5 text-green-500" />
<AlertCircle className="w-5 h-5 text-yellow-500" />
```

---

## 12. 表单设计规范

### 12.1 表单布局

| 字段数量 | 推荐布局 |
|---------|---------|
| 1-2 个 | 单列（登录、搜索） |
| 3-5 个 | 双列或卡片（用户信息） |
| >5 个 | 分步向导（新建任务4步） |

### 12.2 表单验证

| 验证时机 | 反馈方式 |
|---------|---------|
| 失去焦点 | 实时验证提示 |
| 提交前 | 汇总验证错误 |
| 提交时 | 加载状态 + 错误显示 |

### 12.3 错误反馈

```tsx
// 字段级错误
<FormField
  control={form.control}
  name="username"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>用户名</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// 错误状态样式
className={cn(
  "border-input",
  fieldState.error && "border-red-500 focus-visible:ring-red-500"
)}
```

### 12.4 常用表单组件

| 组件 | 用途 | 示例 |
|-----|-----|-----|
| Input | 文本输入 | 用户名、邮箱 |
| Select | 下拉选择 | 部门、角色 |
| Textarea | 多行文本 | 描述、备注 |
| Checkbox | 多选 | 权限、标签 |
| RadioGroup | 单选 | 选项组 |
| Switch | 开关 | 启用/禁用 |
| DatePicker | 日期选择 | 截止日期 |
| InputOTP | 验证码 | 4-6位验证码 |

---

## 13. 数据表格规范

### 13.1 表格结构

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>列标题</TableHead>
      <TableHead>列标题</TableHead>
      <TableHead className="text-right">操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id} className="hover:bg-muted/50">
        <TableCell>内容</TableCell>
        <TableCell>内容</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>编辑</DropdownMenuItem>
              <DropdownMenuItem>删除</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 13.2 表格交互

| 交互 | 实现方式 |
|-----|---------|
| 行悬停 | `hover:bg-muted/50` |
| 全选 | Checkbox in TableHead |
| 排序 | 点击 TableHead 切换 |
| 固定列 | `sticky left-0` |
| 滚动 | ScrollArea 包裹 |

### 13.3 空状态设计

```tsx
{data.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <FileText className="w-12 h-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-medium">暂无数据</h3>
    <p className="text-muted-foreground">尝试其他搜索条件</p>
  </div>
) : (
  <Table>{/* 表格内容 */}</Table>
)}
```

### 13.4 分页组件

| 元素 | 说明 |
|-----|-----|
| 每页条数 | 10 / 20 / 50 可选 |
| 页码显示 | 最多显示 5 个页码 |
| 快捷跳转 | 直接输入页码跳转 |

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">10</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

## 14. 状态显示规范

### 14.1 任务状态

| 状态 | 颜色 | 样式 | 用途 |
|-----|-----|-----|-----|
| 进行中 | Blue | `bg-blue-100 text-blue-700` | 学习中 |
| 已完成 | Green | `bg-green-100 text-green-700` | 完成 |
| 未开始 | Slate | `bg-slate-100 text-slate-700` | 未开始 |
| 已过期 | Amber | `bg-amber-100 text-amber-700` | 过期 |

### 14.2 Badge 组件使用

```tsx
// 状态 Badge
<Badge variant="secondary">进行中</Badge>
<Badge className="bg-green-100 text-green-700">已完成</Badge>
<Badge className="bg-amber-100 text-amber-700">已过期</Badge>

// 进度 Badge
<Badge variant="outline">
  <Clock className="w-3 h-3 mr-1" />
  3/5 文件
</Badge>
```

### 14.3 进度条

| 类型 | 用途 | 颜色 |
|-----|-----|-----|
| Determinate | 已知进度 | 主色填充 |
| Indeterminate | 加载中 | 动画效果 |
| Success | 成功完成 | 绿色 |
| Warning | 进度滞后 | 黄色 |

```tsx
// 进度条示例
<Progress value={66} className="w-full" />

// 带标签
<div className="flex items-center gap-2">
  <Progress value={80} className="flex-1" />
  <span className="text-sm font-medium">80%</span>
</div>
```

---

## 附录

### 相关文档

| 文档名称 | 描述 |
|---------|------|
| SRS-01-总体规格.md | 项目总体规格 |
| SRS-02-任务管理.md | 任务管理模块详细规格 |
| SRS-03-学习追踪.md | 学习追踪模块详细规格 |
| SRS-04-用户认证.md | 用户与认证模块详细规格 |
| SRS-05-测验考核.md | 测验考核模块详细规格 |
| SRS-06-报表统计.md | 报表统计模块详细规格 |

### 参考资源

- [shadcn/ui 官方文档](https://ui.shadcn.com/)
- [Recharts 图表库](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 9. MCP 工具使用指南

### 9.1 可用的 MCP 工具

项目配置了以下 MCP 工具，用于查阅组件使用和 API 文档：

| MCP 服务器 | 用途 | 使用场景 |
|-----------|------|---------|
| `plugin:context7` | 查阅 shadcn/ui、Next.js 等框架文档 | 查询组件 API、用法示例 |
| `mcp__shadcn__*` | shadcn/ui 组件搜索 | 查找组件、查看示例代码 |

### 9.2 Context7 MCP 使用方法

#### 9.2.1 查阅组件文档

**使用场景**：了解 shadcn/ui 组件的完整 API 和用法

**调用方式**：

```
查询格式：
- "shadcn button component usage"
- "shadcn dialog API documentation"
- "react hook form with shadcn form"
```

**示例**：

```bash
# 查阅 shadcn/ui Chart 组件使用方法
mcp__plugin__context7__resolve-library-id + mcp__plugin__context7__query-docs
```

#### 9.2.2 搜索组件示例

**使用场景**：查找特定组件的用法示例

**调用方式**：

```
mcp__shadcn__search_items_in_registries --query "dialog form"
mcp__shadcn__get_item_examples_from_registries --query "form validation"
```

### 9.3 shadcn/ui MCP 工具

#### 9.3.1 查看已安装组件

```bash
mcp__shadcn__get_project_registries
```

#### 9.3.2 搜索组件

```bash
# 搜索表单相关组件
mcp__shadcn__search_items_in_registries --query "form input"
```

#### 9.3.3 获取组件示例

```bash
# 获取 Dialog 组件示例
mcp__shadcn__get_item_examples_from_registries --query "dialog"
```

#### 9.3.4 安装新组件

```bash
# 获取安装命令
mcp__shadcn__get_add_command_for_items --items ["@shadcn/chart"]
```

### 9.4 常用查询示例

| 查询内容 | MCP 调用 |
|---------|---------|
| shadcn Button API | context7: "shadcn button component" |
| shadcn Form 用法 | context7: "shadcn form validation" |
| shadcn Table 组件 | context7: "shadcn table data display" |
| shadcn Dialog 弹窗 | context7: "shadcn dialog modal" |
| shadcn Chart 安装 | shadcn: get_add_command_for_items |
| shadcn Card 示例 | shadcn: get_item_examples_from_registries |

### 9.5 Next.js API 查阅

#### 9.5.1 查阅 Next.js API

```
查询格式：
- "Next.js 14 App Router API route"
- "Next.js server actions"
- "Next.js middleware authentication"
```

#### 9.5.2 查阅 React Hooks

```
查询格式：
- "React useState hook"
- "React useEffect hook"
- "React useFormStatus"
```

---

## 10. 开发建议

### 10.1 查阅文档流程

```
遇到组件使用问题
        │
        ▼
┌───────────────────┐
│ 使用 MCP 工具查询 │───── 成功 ────▶ 使用示例代码
│ (context7/shadcn) │
└─────────┬─────────┘
          │ 失败
          ▼
┌───────────────────┐
│  查阅官方文档     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  参考现有代码      │
└───────────────────┘
```

### 10.2 推荐实践

| 场景 | 推荐做法 |
|-----|---------|
| 新组件使用 | 先用 shadcn MCP 查示例 |
| API 集成 | 用 context7 查 Next.js API |
| 组件定制 | 参考官方文档修改 |
| 样式调整 | 查阅 Tailwind CSS 文档 |

---
