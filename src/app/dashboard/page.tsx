import { Metadata } from 'next'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: '学习管理系统 - 仪表盘',
}

export default function DashboardPage() {
  return <DashboardClient />
}
