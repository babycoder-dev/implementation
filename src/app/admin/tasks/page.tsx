'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: 'draft' | 'published' | 'completed' | 'archived';
  passingScore: number | null;
  createdByName: string | null;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10 });
  const [filters, setFilters] = useState({ status: '' });
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const fetchTasks = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(activeTab !== 'all' && { status: activeTab }),
      });
      const res = await fetch(`/api/tasks?${params}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
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
  }, [activeTab]);

  const handleDelete = async (taskId: string) => {
    if (!confirm('确定要删除该任务吗？')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchTasks(meta.page);
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('删除失败');
    }
  };

  const handlePublish = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks(meta.page);
      }
    } catch (error) {
      console.error('Failed to publish task:', error);
    }
  };

  const handleArchive = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks(meta.page);
      }
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '草稿' },
      published: { bg: 'bg-green-100', text: 'text-green-800', label: '已发布' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: '已完成' },
      archived: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '已归档' },
    };
    const s = styles[status] || styles.draft;
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const getDeadlineStatus = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const isOverdue = deadlineDate < now;
    return isOverdue ? (
      <span className="text-red-600 text-xs">已过期</span>
    ) : (
      <span className="text-gray-500 text-xs">
        截止: {deadlineDate.toLocaleDateString()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">返回</Link>
              <h1 className="text-2xl font-bold text-gray-900">任务管理</h1>
            </div>
            <Link
              href="/admin/tasks/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              创建任务
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-8">
            {(['all', 'published', 'draft', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'all' ? '全部' : tab === 'published' ? '已发布' : tab === 'draft' ? '草稿' : '已归档'}
              </button>
            ))}
          </nav>
        </div>

        {/* Task Grid */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-500 mb-6">创建第一个学习任务吧</p>
            <Link
              href="/admin/tasks/create"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              创建任务
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{task.title}</h3>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(task.status)}
                      {getDeadlineStatus(task.deadline)}
                    </div>
                  </div>
                </div>

                {task.description && (
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
                  <span>创建人: {task.createdByName || '-'}</span>
                  <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Link
                    href={`/admin/tasks/${task.id}`}
                    className="flex-1 text-center py-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-sm"
                  >
                    查看
                  </Link>
                  <Link
                    href={`/admin/tasks/${task.id}/edit`}
                    className="flex-1 text-center py-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-sm"
                  >
                    编辑
                  </Link>
                  {task.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(task.id)}
                      className="flex-1 py-2 text-green-600 hover:bg-green-50 rounded transition-colors text-sm"
                    >
                      发布
                    </button>
                  )}
                  {task.status === 'published' && (
                    <button
                      onClick={() => handleArchive(task.id)}
                      className="flex-1 py-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors text-sm"
                    >
                      归档
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="py-2 text-red-600 hover:bg-red-50 rounded transition-colors text-sm px-3"
                  >
                    删除
                  </button>
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
