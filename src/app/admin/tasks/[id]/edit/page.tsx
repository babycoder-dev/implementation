import { AdminLayout } from '@/components/layout/AdminLayout'
import TaskEditor from '../TaskEditor'

export default function TaskEditPage({ params }: { params: { id: string } }) {
  return (
    <AdminLayout>
      <TaskEditor taskId={params.id} />
    </AdminLayout>
  )
}
