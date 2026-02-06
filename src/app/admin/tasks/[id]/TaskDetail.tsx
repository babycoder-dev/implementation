'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ContentSection, PageHeader } from '@/components/layout/AdminPageTemplate'
import QuizManager from './QuizManager'
import Link from 'next/link'
import {
  Edit,
  Trash2,
  FileText,
  Users,
  Calendar,
  Clock,
  ListChecks,
} from 'lucide-react'

interface TaskFile {
  id: string
  title: string
  fileUrl: string
  fileType: string
  fileSize: number
  order: number
}

interface AssignedUser {
  id: string
  name: string
  username: string
}

interface Task {
  id: string
  title: string
  description: string | null
  deadline: Date | null
  createdBy: string
  createdAt: Date
}

interface TaskDetailData {
  task: Task
  files: TaskFile[]
  assignedUsers: AssignedUser[]
}

export default function TaskDetail({ taskId }: { taskId: string }) {
  const [data, setData] = useState<TaskDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || '获取任务详情失败')
        }
        return res.json()
      })
      .then((response) => {
        if (response.success) {
          setData(response)
        } else {
          throw new Error(response.error || '获取任务详情失败')
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('获取任务详情失败:', err)
        setError(err.message || '加载失败，请刷新重试')
        setLoading(false)
      })
  }, [taskId])

  const handleDelete = async () => {
    if (!confirm('确定要删除此任务吗？此操作不可恢复。')) {
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })

      const result = await res.json()

      if (result.success) {
        window.location.href = '/admin/tasks'
      } else {
        alert(result.error || '删除失败')
      }
    } catch {
      console.error('删除任务失败')
      alert('删除失败，请重试')
    } finally {
      setDeleting(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return '未设置'
    return new Date(date).toLocaleString('zh-CN')
  }

  const getFileTypeIcon = (fileType: string): string => {
    switch (fileType) {
      case 'pdf':
        return 'PDF'
      case 'docx':
        return 'DOC'
      case 'xlsx':
        return 'XLS'
      case 'pptx':
        return 'PPT'
      case 'video':
        return '视频'
      default:
        return '文件'
    }
  }

  if (loading) {
    return (
      <div className="p-4">加载中...</div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">{error}</div>
        <Link href="/admin/tasks" className="text-primary-500 hover:underline mt-2 inline-block">
          返回任务列表
        </Link>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-4">
        <div className="text-red-500">任务不存在</div>
        <Link href="/admin/tasks" className="text-primary-500 hover:underline mt-2 inline-block">
          返回任务列表
        </Link>
      </div>
    )
  }

  const { task, files, assignedUsers } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="任务详情"
        showBack
        backHref="/admin/tasks"
        backText="返回任务列表"
      />

      {/* 基本信息 */}
      <ContentSection title="基本信息">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500">标题</h3>
            <p className="text-lg font-semibold text-slate-900 mt-1">{task.title}</p>
          </div>

          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-slate-500">描述</h3>
              <p className="text-slate-900 mt-1 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                截止时间
              </h3>
              <p className="text-slate-900 mt-1 flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />
                {formatDate(task.deadline)}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500">创建时间</h3>
              <p className="text-slate-900 mt-1">{formatDate(task.createdAt)}</p>
            </div>
          </div>
        </div>
      </ContentSection>

      {/* 附件列表 */}
      <ContentSection
        title="附件列表"
        action={
          files.length > 0 && (
            <Badge variant="secondary">{files.length} 个文件</Badge>
          )
        }
      >
        {files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.title}</p>
                    <p className="text-xs text-slate-500">
                      {getFileTypeIcon(file.fileType)} | {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-500 hover:underline"
                >
                  下载
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            暂无附件
          </div>
        )}
      </ContentSection>

      {/* 参与人员 */}
      <ContentSection
        title="参与人员"
        action={
          assignedUsers.length > 0 && (
            <Badge variant="secondary">{assignedUsers.length} 人</Badge>
          )
        }
      >
        {assignedUsers.length > 0 ? (
          <div className="space-y-3">
            {assignedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            暂无分配用户
          </div>
        )}
      </ContentSection>

      {/* 测验设置 */}
      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">基本信息</TabsTrigger>
          <TabsTrigger value="quiz">
            <ListChecks className="w-4 h-4 mr-2" />
            测验设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          {/* Existing content is preserved above */}
        </TabsContent>

        <TabsContent value="quiz">
          <QuizManager taskId={taskId} />
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex items-center gap-4 pt-4">
        <Link href={`/admin/tasks/${taskId}`}>
          <Button>
            <Edit className="w-4 h-4 mr-2" />
            编辑任务
          </Button>
        </Link>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? '删除中...' : '删除任务'}
        </Button>
      </div>
    </div>
  )
}
