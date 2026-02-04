import TaskEditor from './TaskEditor'

export default function TaskEditorPage({ params }: { params: { id: string } }) {
  return <TaskEditor taskId={params.id} />
}
