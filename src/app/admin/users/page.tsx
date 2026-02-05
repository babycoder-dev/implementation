import { AdminLayout } from '@/components/layout/AdminLayout'
import UserList from './UserList'

export default function AdminUsersPage() {
  return (
    <AdminLayout>
      <UserList />
    </AdminLayout>
  )
}
