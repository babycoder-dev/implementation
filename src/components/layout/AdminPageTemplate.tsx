import { ReactNode } from 'react'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  showBack?: boolean
  backHref?: string
  backText?: string
}

export function PageHeader({ title, description, showBack, backHref, backText }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {showBack && backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {backText || '返回'}
        </Link>
      )}
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description && <p className="text-slate-500 mt-1">{description}</p>}
    </div>
  )
}

interface ContentSectionProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function ContentSection({ title, children, action }: ContentSectionProps) {
  return (
    <Card>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  )
}

interface FormPageProps {
  title: string
  description?: string
  showBack?: boolean
  backHref?: string
  backText?: string
  children: ReactNode
}

export function FormPage({ title, description, showBack, backHref, backText, children }: FormPageProps) {
  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title={title}
          description={description}
          showBack={showBack}
          backHref={backHref}
          backText={backText}
        />
        <Card>
          <CardContent className="p-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

interface ListPageProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function ListPage({ title, description, action, children }: ListPageProps) {
  return (
    <AdminLayout>
      <PageHeader title={title} description={description} />
      <div className="space-y-4">
        {action && <div className="flex justify-end">{action}</div>}
        {children}
      </div>
    </AdminLayout>
  )
}
