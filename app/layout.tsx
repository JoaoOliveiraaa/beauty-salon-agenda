import type React from "react"
import { StaffSidebar } from "@/components/staff-sidebar"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  if (!user) {
    redirect("/login")
  }

  if (user.tipo_usuario !== "funcionario") {
    redirect("/admin")
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <StaffSidebar userName={user.nome} />
      </aside>

      {/* Mobile Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <MobileSidebar>
          <StaffSidebar userName={user.nome} />
        </MobileSidebar>
        <h1 className="font-semibold text-sm">Agende Beauty</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">{children}</main>
    </div>
  )
}
