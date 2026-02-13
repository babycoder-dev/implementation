'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled';
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 10 });
  const [filters, setFilters] = useState({ role: '', status: '' });
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user' as 'admin' | 'user',
    department_id: '',
  });

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
      });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setMeta(data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        resetForm();
        fetchUsers(meta.page);
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('操作失败');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('确定要删除该用户吗？')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchUsers(meta.page);
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('删除失败');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: user.status === 'active' ? 'disabled' : 'active' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers(meta.page);
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', name: '', role: 'user', department_id: '' });
    setEditingUser(null);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      department_id: user.department_id || '',
    });
    setShowModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors = role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors}`}>{role === 'admin' ? '管理员' : '用户'}</span>;
  };

  const getStatusBadge = (status: string) => {
    const colors = status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors}`}>{status === 'active' ? '正常' : '禁用'}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">返回</Link>
              <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              新增用户
            </button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部角色</option>
              <option value="admin">管理员</option>
              <option value="user">普通用户</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        {user.status === 'active' ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {meta.total > meta.limit && (
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-gray-700">
                共 {meta.total} 条，第 {meta.page} / {Math.ceil(meta.total / meta.limit)} 页
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchUsers(meta.page - 1)}
                  disabled={meta.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  上一页
                </button>
                <button
                  onClick={() => fetchUsers(meta.page + 1)}
                  disabled={meta.page * meta.limit >= meta.total}
                  className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingUser ? '编辑用户' : '新增用户'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? '新密码（留空不修改）' : '密码'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  {...(!editingUser && { required: true })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
