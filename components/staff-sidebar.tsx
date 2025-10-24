"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Clock, Plus } from "lucide-react"
import { LogoutButton } from "./logout-button"

const menuItems = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/agendamentos", label: "Meus Agendamentos", icon: Calendar },
  { href: "/staff/novo-agendamento", label: "Novo Agendamento", icon: Plus },
  { href: "/staff/disponibilidade", label: "Disponibilidade", icon: Clock },
]

export function StaffSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-4 md:p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm text-sidebar-foreground">Agende Beauty</h1>
            <p className="text-xs text-muted-foreground truncate">{userName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 md:p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md transition-all text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent",
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-2 md:p-3 border-t border-sidebar-border">
        <LogoutButton />
      </div>
    </div>
  )
}
