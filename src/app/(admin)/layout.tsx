/**
 * 管理后台布局 - SRS-04
 */

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  BookOpen,
  User,
  Building2,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        } else {
          // 未登录，跳转到登录页
          router.push('/auth/login');
        }
      })
      .catch(() => {
        router.push('/auth/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/auth/login');
    router.refresh();
  };

  // 导航菜单 - 根据角色显示
  const navigation = [
    { name: '数据看板', href: '/admin', icon: LayoutDashboard },
    ...(user?.role === 'admin' ? [
      { name: '部门管理', href: '/admin/departments', icon: Building2 },
      { name: '用户管理', href: '/admin/users', icon: Users },
      { name: '任务管理', href: '/admin/tasks', icon: FileText },
      { name: '报表统计', href: '/admin/reports', icon: BarChart },
    ] : []),
    ...(user?.role === 'leader' ? [
      { name: '报表统计', href: '/admin/reports', icon: BarChart },
    ] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-slate-800">
            <BookOpen className="w-6 h-6 text-blue-500 mr-2" />
            <span className="text-lg font-semibold">管理后台</span>
          </div>

          {/* 导航 */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* 用户信息 */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-500" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || '用户'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.role === 'admin' ? '管理员' : user?.role === 'leader' ? '部门主管' : '员工'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => router.push('/')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                学习首页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
