"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash,
  Users,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  user_count: number;
  children?: Department[];
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments?tree=true");
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setIsCreateDialogOpen(false);
        setFormData({ name: "", description: "", parent_id: "" });
        fetchDepartments();
      } else {
        alert(data.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating department:", error);
      alert("创建失败");
    }
  };

  const handleUpdate = async () => {
    if (!editingDepartment) return;

    try {
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setEditingDepartment(null);
        setFormData({ name: "", description: "", parent_id: "" });
        fetchDepartments();
      } else {
        alert(data.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating department:", error);
      alert("更新失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除该部门吗？")) return;

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchDepartments();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting department:", error);
      alert("删除失败");
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || "",
      parent_id: department.parent_id || "",
    });
  };

  const renderDepartmentRow = (
    department: Department,
    level: number = 0
  ): React.ReactNode => {
    const hasChildren = department.children && department.children.length > 0;
    const isExpanded = expandedIds.has(department.id);

    return (
      <>
        <TableRow key={department.id}>
          <TableCell>
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${level * 24 + 8}px` }}
            >
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => toggleExpand(department.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <span className="w-5" />
              )}
              <Building2 className="h-4 w-4 text-gray-500" />
              {department.name}
            </div>
          </TableCell>
          <TableCell className="max-w-md truncate">
            {department.description || "-"}
          </TableCell>
          <TableCell>{department.user_count}</TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openEditDialog(department)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(department.id)}
                  className="text-red-600"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && (
          <>
            {department.children!.map((child) =>
              renderDepartmentRow(child, level + 1)
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">部门管理</h1>
          <p className="text-gray-500 mt-1">管理组织架构和部门信息</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingDepartment(null);
                setFormData({ name: "", description: "", parent_id: "" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加部门
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDepartment ? "编辑部门" : "添加新部门"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">部门名称</Label>
                <Input
                  id="name"
                  placeholder="请输入部门名称"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">部门描述</Label>
                <Input
                  id="description"
                  placeholder="请输入部门描述（可选）"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_id">上级部门</Label>
                <select
                  id="parent_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.parent_id}
                  onChange={(e) =>
                    setFormData({ ...formData, parent_id: e.target.value })
                  }
                >
                  <option value="">无（顶级部门）</option>
                  {departments
                    .filter((d) => d.id !== editingDepartment?.id)
                    .map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingDepartment(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={editingDepartment ? handleUpdate : handleCreate}
                  disabled={!formData.name.trim()}
                >
                  {editingDepartment ? "更新" : "创建"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">部门名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead className="w-32">用户数</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Users className="h-8 w-8" />
                      <p>暂无部门</p>
                      <p className="text-sm">点击「添加部门」创建第一个部门</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => renderDepartmentRow(dept))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
