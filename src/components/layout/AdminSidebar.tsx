'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Settings,
  Plus
} from 'lucide-react'

const navigation = [
  { name: '首页', href: '/admin', icon: LayoutDashboard },
  { name: '任务管理', href: '/admin/tasks', icon: FolderKanban },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '数据报表', href: '/admin/reports', icon: BarChart3 },
  { name: '设置', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-200">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        <span className="font-semibold text-lg text-slate-900">学习管理</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-primary-500' : 'text-slate-400')} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Quick Create Button */}
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          href="/admin/tasks/create"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建任务
        </Link>
      </div>
    </aside>
  )
}
