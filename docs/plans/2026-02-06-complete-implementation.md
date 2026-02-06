# 企业学习管理系统 - 全面实施计划

> **工作流**: superpowers:executing-plans
> **实施顺序**: 按功能模块

**参考文档**: `docs/plans/2026-02-03-learning-system-design.md`

---

## 实施顺序

1. **Phase 1: 基础修复** - 修复现有 bug
2. **Phase 2: 任务管理** - 文件上传、任务分配
3. **Phase 3: 学习跟踪** - PDF预览、视频播放、行为记录
4. **Phase 4: 测验系统** - 题目管理、在线答题
5. **Phase 5: 报表系统** - 数据看板、导出报表

---

## Phase 1: 基础修复

### Task 1.1: 修复任务列表不显示

**文件**: `src/app/admin/tasks/TaskList.tsx`
**问题**: API 返回 `data.tasks`，但代码读取 `data.data`
**修复**: 改为 `data.tasks`

---

### Task 1.2: 修复用户列表不显示

**文件**: `src/app/admin/users/page.tsx`
**检查**: 类似问题

---

## Phase 2: 任务管理

### Task 2.1: 文件上传前端

**文件**:
- `src/app/admin/tasks/create/page.tsx` - 添加文件上传组件
- `src/components/FileUploader.tsx` - 新建上传组件

**功能**:
- 支持 PDF、Office、视频文件
- 显示上传进度
- 上传到 MinIO

**验收标准**:
- ✅ 能够选择并上传文件
- ✅ 显示上传进度
- ✅ 文件存储到 MinIO

---

### Task 2.2: 任务分配前端

**文件**:
- `src/app/admin/tasks/create/page.tsx` - 添加用户选择器
- `src/components/UserSelector.tsx` - 新建用户选择组件

**功能**:
- 显示用户列表
- 多选必学人员
- 保存到 `task_assignments` 表

**验收标准**:
- ✅ 能够选择多个用户
- ✅ 保存分配记录

---

### Task 2.3: 任务详情页面

**文件**:
- `src/app/admin/tasks/[id]/page.tsx` - 显示任务文件列表

**功能**:
- 任务基本信息
- 文件列表（可预览/下载）
- 参与人员列表

---

## Phase 3: 学习跟踪

### Task 3.1: PDF 在线预览

**文件**:
- `src/components/PDFViewer.tsx` - 新建 PDF 预览组件
- `src/app/(learner)/tasks/[id]/page.tsx` - 集成预览

**依赖**:
- PDF.js 2.5.x（Chrome 109 兼容）

**功能**:
- 显示 PDF 文件
- 记录翻页行为
- 记录停留时长

**验收标准**:
- ✅ PDF 正常显示
- ✅ 翻页时上报日志

---

### Task 3.2: 视频播放

**文件**:
- `src/components/VideoPlayer.tsx` - 新建视频播放器
- `src/app/(learner)/tasks/[id]/page.tsx` - 集成播放器

**功能**:
- 播放视频文件
- 记录播放进度
- 记录播放行为（播放/暂停/拖拽）

**验收标准**:
- ✅ 视频正常播放
- ✅ 上报播放日志

---

### Task 3.3: 学习行为记录

**API 路由**:
- `src/app/api/learning/log/route.ts` - 记录 PDF 行为
- `src/app/api/learning/video/log/route.ts` - 记录视频行为

**功能**:
- POST /api/learning/log - PDF 翻页、打开、完成
- POST /api/learning/video/log - 播放、暂停、完成

**验收标准**:
- ✅ 行为数据写入数据库

---

## Phase 4: 测验系统

### Task 4.1: 题目管理前端

**文件**:
- `src/app/admin/tasks/[id]/QuizManager.tsx` - 新建题目管理组件

**功能**:
- 添加题目（单选）
- 设置选项和正确答案
- 保存到 `quiz_questions` 表

**验收标准**:
- ✅ 能够添加题目
- ✅ 能够编辑/删除题目

---

### Task 4.2: 在线答题

**文件**:
- `src/app/(learner)/tasks/[id]/QuizClient.tsx` - 新建答题组件
- `src/app/(learner)/tasks/[id]/quiz/page.tsx` - 答题页面

**API 路由**:
- `src/app/api/quiz/submit/route.ts` - 提交答案

**功能**:
- 显示题目和选项
- 收集用户答案
- 自动判分

**验收标准**:
- ✅ 能够完成答题
- ✅ 显示得分和正确答案

---

## Phase 5: 报表系统

### Task 5.1: 数据看板完善

**文件**:
- `src/app/admin/page.tsx` - 管理员首页

**功能**:
- 任务完成统计
- 用户学习进度
- 近期活动

---

### Task 5.2: 任务详情报表

**文件**:
- `src/app/admin/tasks/[id]/page.tsx` - 添加报表

**功能**:
- 每人学习进度
- 答题情况统计

---

### Task 5.3: 个人学习记录

**文件**:
- `src/app/dashboard/page.tsx` - 用户首页

**功能**:
- 待学习任务列表
- 已完成任务记录
- 学习统计

---

### Task 5.4: 导出报表

**功能**:
- 导出 Excel 格式
- 包含任务完成情况

---

## 验证命令

```bash
# 构建验证
npm run build

# 测试验证
npm test -- --run

# 启动服务
docker-compose up -d
```

---

## 提交历史

1. `fix: 修复任务列表不显示`
2. `feat: 添加文件上传功能`
3. `feat: 添加任务分配功能`
4. `feat: 实现 PDF 在线预览`
5. `feat: 实现视频播放`
6. `feat: 实现学习行为记录`
7. `feat: 实现题目管理前端`
8. `feat: 实现在线答题`
9. `feat: 完善数据看板`
10. `feat: 添加个人学习记录`
