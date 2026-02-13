"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Home, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LearnerLayoutProps {
  children: React.ReactNode;
}

export default function LearnerLayout({ children }: LearnerLayoutProps) {
  const pathname = usePathname();

  // 检查是否是学员专属页面（不是管理员页面）
  const isLearnerSection = !pathname.startsWith("/admin");

  const navigation = [
    { name: "仪表盘", href: "/", icon: Home },
    { name: "我的学习", href: "/tasks", icon: BookOpen },
    { name: "个人中心", href: "/profile", icon: User },
  ];

  // 只在学员区域显示侧边栏
  if (!isLearnerSection) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r shadow-sm">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <BookOpen className="w-6 h-6 text-primary mr-2" />
            <span className="text-lg font-semibold">学习管理系统</span>
          </div>

          {/* 导航 */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* 用户信息 */}
          <div className="p-4 border-t">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  张三
                </p>
                <p className="text-xs text-gray-500 truncate">学员</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
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
