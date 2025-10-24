import type React from "react"
import { AdminSidebar } from "@/components/admin-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 flex-shrink-0">
        <AdminSidebar />
      </aside>
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
