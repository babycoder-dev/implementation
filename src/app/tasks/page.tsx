'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'completed' | 'archived';
  passingScore: number | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  myProgress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    score?: number;
    completedAt?: string;
  };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10 });
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed'>('all');

  const fetchTasks = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (data.success) {
        // Add mock progress for demonstration
        const tasksWithProgress = data.data.map((task: Task, index: number) => ({
          ...task,
          myProgress: index % 3 === 0
            ? { status: 'completed', score: 85, completedAt: '2024-01-10' }
            : index % 3 === 1
            ? { status: 'in_progress' }
            : { status: 'not_started' },
        }));
        setTasks(tasksWithProgress);
        setMeta(data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getFilteredTasks = () => {
    if (activeTab === 'all') return tasks;
    return tasks.filter((task) => {
      if (activeTab === 'in_progress') return task.myProgress?.status === 'in_progress';
      if (activeTab === 'completed') return task.myProgress?.status === 'completed';
      return task.myProgress?.status === 'not_started';
    });
  };

  const getProgressBadge = (progress?: { status: string; score?: number; completedAt?: string }) => {
    if (!progress) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">未开始</span>;
    }

    if (progress.status === 'completed') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
          已完成 {progress.score && `· ${progress.score}分`}
        </span>
      );
    }

    if (progress.status === 'in_progress') {
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">学习中</span>;
    }

    return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">未开始</span>;
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const isOverdue = deadlineDate < now;
    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (isOverdue) {
      return <span className="text-red-600 text-xs font-medium">已过期</span>;
    }

    if (daysLeft <= 3) {
      return <span className="text-orange-500 text-xs font-medium">{daysLeft}天后截止</span>;
    }

    return <span className="text-gray-500 text-xs">截止: {deadlineDate.toLocaleDateString()}</span>;
  };

  const getActionButton = (task: Task) => {
    const progress = task.myProgress;

    if (!progress || progress.status === 'not_started') {
      return (
        <Link
          href={`/tasks/${task.id}/learn`}
          className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          开始学习
        </Link>
      );
    }

    if (progress.status === 'in_progress') {
      return (
        <Link
          href={`/tasks/${task.id}/learn`}
          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          继续学习
        </Link>
      );
    }

    // Completed
    return (
      <div className="flex gap-2">
        <Link
          href={`/tasks/${task.id}/quiz`}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          查看测验
        </Link>
        <Link
          href={`/tasks/${task.id}/learn`}
          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
        >
          复习
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">我的学习任务</h1>
            <div className="text-sm text-gray-500">
              {tasks.filter((t) => t.myProgress?.status === 'completed').length} / {tasks.length} 已完成
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {(['all', 'in_progress', 'completed'] as const).map((tab) => {
              const count = tab === 'all'
                ? tasks.length
                : tasks.filter((t) => t.myProgress?.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'all' ? '全部任务' : tab === 'in_progress' ? '学习中' : '已完成'}
                  <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">{count}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Task Cards */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : getFilteredTasks().length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-500">
              {activeTab === 'all' ? '等待管理员分配学习任务' : activeTab === 'in_progress' ? '没有正在进行的任务' : '没有完成的任务'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredTasks().map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                      {getProgressBadge(task.myProgress)}
                    </div>
                    {task.description && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>创建人: {task.createdByName || '-'}</span>
                      {getDeadlineStatus(task.deadline)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getActionButton(task)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta.total > meta.limit && (
          <div className="mt-6 bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              共 {meta.total} 条，第 {meta.page} / {Math.ceil(meta.total / meta.limit)} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTasks(meta.page - 1)}
                disabled={meta.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                上一页
              </button>
              <button
                onClick={() => fetchTasks(meta.page + 1)}
                disabled={meta.page * meta.limit >= meta.total}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
