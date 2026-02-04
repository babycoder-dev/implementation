'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function CreateTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          deadline: form.deadline || null
        })
      })

      if (res.ok) {
        router.push('/admin/tasks')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">创建任务</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">标题 *</label>
              <Input
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="输入任务标题"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="输入任务描述"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">截止时间</label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={e => setForm({...form, deadline: e.target.value})}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={loading || !form.title}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? '创建中...' : '创建任务'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
