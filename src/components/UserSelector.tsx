'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface User {
  id: string
  username: string
  name: string | null
  role: string
  createdAt: Date
}

interface UserSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function UserSelector({ selectedIds, onChange, disabled }: UserSelectorProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(async (res) => {
        if (!res.ok) throw new Error('获取用户列表失败')
        const data = await res.json()
        if (data.success) {
          setUsers(data.data || [])
        } else {
          throw new Error(data.error || '获取用户列表失败')
        }
      })
      .catch((err) => {
        console.error('获取用户列表失败:', err)
        setError('加载失败，请刷新重试')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleToggle = (userId: string, checked: boolean | 'indeterminate') => {
    if (disabled) return

    const isChecked = checked === true
    if (isChecked) {
      onChange([...selectedIds, userId])
    } else {
      onChange(selectedIds.filter((id) => id !== userId))
    }
  }

  if (loading) {
    return <div className="p-4 text-gray-500">加载用户列表中...</div>
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">必学人员</Label>
        <span className="text-sm text-gray-500">
          已选择 {selectedIds.length} 人
        </span>
      </div>
      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
        {users.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无用户</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center gap-3">
              <Checkbox
                id={`user-${user.id}`}
                checked={selectedIds.includes(user.id)}
                onChange={(e) => handleToggle(user.id, e.target.checked)}
                disabled={disabled}
              />
              <Label
                htmlFor={`user-${user.id}`}
                className="flex-1 cursor-pointer"
              >
                <span className="font-medium">{user.username}</span>
                {user.name && (
                  <span className="text-gray-500 ml-2">({user.name})</span>
                )}
              </Label>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
