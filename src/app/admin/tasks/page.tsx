import { AdminLayout } from '@/components/layout/AdminLayout'
import TaskList from './TaskList'

export default function AdminTasksPage() {
  return (
    <AdminLayout>
      <TaskList />
    </AdminLayout>
  )
}
