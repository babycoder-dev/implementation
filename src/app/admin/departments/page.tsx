'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  user_count: string;
  children?: Department[];
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
  });

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/departments?tree=${viewMode === 'tree'}`);
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [viewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        resetForm();
        fetchDepartments();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('Failed to save department:', error);
      alert('操作失败');
    }
  };

  const handleDelete = async (deptId: string) => {
    if (!confirm('确定要删除该部门吗？子部门也会被删除。')) return;

    try {
      const res = await fetch(`/api/departments/${deptId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchDepartments();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', parent_id: '' });
    setEditingDept(null);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      parent_id: dept.parent_id || '',
    });
    setShowModal(true);
  };

  const renderTreeNode = (dept: Department, level = 0) => (
    <div key={dept.id} className="ml-4">
      <div className="flex items-center gap-3 py-3 px-4 bg-white border rounded-lg mb-2 hover:shadow-md transition-shadow">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{dept.name}</span>
            <span className="text-xs text-gray-500">({dept.user_count} 人)</span>
          </div>
          {dept.description && (
            <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(dept)}
            className="text-indigo-600 hover:text-indigo-900 text-sm"
          >
            编辑
          </button>
          <button
            onClick={() => handleDelete(dept.id)}
            className="text-red-600 hover:text-red-900 text-sm"
          >
            删除
          </button>
        </div>
      </div>
      {dept.children && dept.children.length > 0 && (
        <div className="border-l-2 border-gray-200 ml-4 pl-4">
          {dept.children.map((child) => renderTreeNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">部门名称</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">人数</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">上级部门</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {departments.map((dept) => (
            <tr key={dept.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.name}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{dept.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.user_count}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.parent_id ? '有' : '顶级'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  onClick={() => openEditModal(dept)}
                  className="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">返回</Link>
              <h1 className="text-2xl font-bold text-gray-900">部门管理</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('tree')}
                  className={`px-3 py-1 rounded-md text-sm ${viewMode === 'tree' ? 'bg-white shadow' : ''}`}
                >
                  树形
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  列表
                </button>
              </div>
              <button
                onClick={() => { resetForm(); setShowModal(true); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                新增部门
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : viewMode === 'tree' ? (
          <div className="space-y-2">
            {departments.map((dept) => renderTreeNode(dept))}
          </div>
        ) : (
          renderList()
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingDept ? '编辑部门' : '新增部门'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">部门名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">上级部门</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">顶级部门</option>
                  {departments
                    .filter((d) => d.id !== editingDept?.id)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
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
