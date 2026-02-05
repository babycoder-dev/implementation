import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <AdminHeader />
      <main className="pl-64 pt-16">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
