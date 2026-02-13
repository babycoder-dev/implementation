"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  department_id: string | null;
  department_name: string | null;
  created_at: string;
}

interface UsersTableProps {
  searchQuery: string;
}

export function UsersTable({ searchQuery }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "管理员";
      default:
        return "普通用户";
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("确定要删除该用户吗？")) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("删除失败");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>姓名</TableHead>
            <TableHead>部门</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                {user.department_name || <span className="text-gray-400">-</span>}
              </TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {getRoleText(user.role)}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(user.created_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {filteredUsers.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          暂无用户数据
        </div>
      )}
    </div>
  );
}
