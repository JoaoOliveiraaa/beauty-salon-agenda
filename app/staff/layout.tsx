import type React from "react"
import { StaffSidebar } from "@/components/staff-sidebar"
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
      <aside className="w-64 flex-shrink-0">
        <StaffSidebar userName={user.nome} />
      </aside>
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  )
}
