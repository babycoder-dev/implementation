'use client'

import { LogOut, User } from 'lucide-react'

export function AdminHeader() {
  return (
    <header className="fixed top-0 right-0 z-40 h-16 w-[calc(100%-16rem)] bg-white border-b border-gray-200">
      <div className="flex h-full items-center justify-between px-6">
        {/* Page Title - dynamically set */}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">管理后台</h1>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">admin</span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
