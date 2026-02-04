'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface Task {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: string
}

export default function TaskEditor({ taskId }: { taskId: string }) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(res => res.json())
      .then(data => {
        setTask(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [taskId])

  const handleSave = async () => {
    setSaving(true)
    // Save logic
    setSaving(false)
  }

  if (loading) return <div className="p-4">加载中...</div>
  if (!task) return <div className="p-4">任务不存在</div>

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

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">标题</label>
            <Input
              value={task.title}
              onChange={e => setTask({...task, title: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">描述</label>
            <Textarea
              value={task.description || ''}
              onChange={e => setTask({...task, description: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">截止时间</label>
            <Input
              type="datetime-local"
              value={task.deadline ? task.deadline.slice(0, 16) : ''}
              onChange={e => setTask({...task, deadline: e.target.value})}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
