import UserEditor from './UserEditor'

export default function UserEditorPage({ params }: { params: { id: string } }) {
  return <UserEditor userId={params.id} />
}
