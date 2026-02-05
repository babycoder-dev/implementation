import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Clock, Trophy, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-semibold">学习管理系统</h1>
          </div>
          <Link href="/login">
            <Button variant="primary" size="sm">
              登录
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            欢迎使用学习管理系统
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            高效管理学习任务，跟踪进度，提升学习效果
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2">
              开始学习
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid gap-8 md:grid-cols-3 mt-16">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="bg-indigo-100 p-3 rounded-lg w-fit mb-4">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">任务管理</h3>
            <p className="text-slate-600">
              清晰的任务列表，帮助您有序安排学习计划
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">进度跟踪</h3>
            <p className="text-slate-600">
              实时跟踪学习进度，了解自己的成长轨迹
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="bg-yellow-100 p-3 rounded-lg w-fit mb-4">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">成就激励</h3>
            <p className="text-slate-600">
              完成任务的成就感，激励您持续进步
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          学习管理系统 - 让学习更高效
        </div>
      </footer>
    </div>
  )
}
