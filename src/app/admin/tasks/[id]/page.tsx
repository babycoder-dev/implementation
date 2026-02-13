'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface TaskForm {
  title: string
  description: string
  deadline: string
  passingScore: string
  status: string
}

export default function EditTaskPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<TaskForm>({
    title: '',
    description: '',
    deadline: '',
    passingScore: '60',
    status: 'pending'
  })

  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(`/api/tasks/${taskId}`)
        const data = await res.json()

        if (data.success) {
          const task = data.data
          setForm({
            title: task.title || '',
            description: task.description || '',
            deadline: task.deadline ? task.deadline.split('T')[0] : '',
            passingScore: String(task.passing_score || 60),
            status: task.status || 'pending'
          })
        } else {
          setError(data.error || '获取任务失败')
        }
      } catch (err) {
        setError('加载任务时出错')
        console.error(err)
      } finally {
        setFetching(false)
      }
    }

    if (taskId) {
      fetchTask()
    }
  }, [taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          deadline: form.deadline || null,
          passingScore: parseInt(form.passingScore) || 60,
          status: form.status
        })
      })

      const data = await res.json()

      if (data.success) {
        router.push('/admin/tasks')
      } else {
        setError(data.error || '更新失败')
      }
    } catch (err) {
      setError('更新任务时出错')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !form.title) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <p>{error}</p>
              <Button variant="link" onClick={() => router.back()} className="mt-4">
                返回
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">编辑任务</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">任务标题 *</label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="请输入任务标题"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">任务描述</label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="请输入任务描述"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">截止日期</label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">及格分数</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.passingScore}
                  onChange={e => setForm({ ...form, passingScore: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">状态</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                <option value="pending">待完成</option>
                <option value="active">进行中</option>
                <option value="completed">已完成</option>
                <option value="archived">已归档</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? '保存中...' : '保存'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
