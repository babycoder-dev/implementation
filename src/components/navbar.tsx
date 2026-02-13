/**
 * 导航栏组件 - SRS-04
 */

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, User, Bell, LogOut, Menu, X, LayoutDashboard, Users, Building2, FileText, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'leader' | 'user';
  department_id: string | null;
  department_name?: string | null;
}

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/auth/login');
    router.refresh();
  };

  // 根据角色获取管理菜单
  const adminLinks = user?.role === 'admin' || user?.role === 'leader' ? [
    { href: '/admin', label: '仪表盘', icon: LayoutDashboard },
    ...(user.role === 'admin' ? [
      { href: '/admin/departments', label: '部门管理', icon: Building2 },
      { href: '/admin/users', label: '用户管理', icon: Users },
      { href: '/admin/tasks', label: '任务管理', icon: FileText },
      { href: '/admin/reports', label: '报表统计', icon: BarChart },
    ] : []),
  ] : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="hidden font-semibold text-gray-900 sm:inline-block">
                学习管理系统
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              我的学习
            </Link>
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="flex items-center gap-3">
            {!loading && user ? (
              <>
                {/* Notifications */}
                <button className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
                </button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="hidden sm:inline">{user.name}</span>
                      <span className="ml-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                        {user.role === 'admin' ? '管理员' : user.role === 'leader' ? '主管' : '员工'}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.username}</p>
                        {user.department_name && (
                          <p className="text-xs text-gray-500">{user.department_name}</p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      个人资料
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : !loading ? (
              <Link href="/auth/login">
                <Button size="sm">
                  登录
                </Button>
              </Link>
            ) : null}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 px-2 py-2 hover:bg-gray-50 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                我的学习
              </Link>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 px-2 py-2 hover:bg-gray-50 rounded flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
