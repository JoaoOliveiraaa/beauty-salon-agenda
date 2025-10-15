"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Clock, Scissors, Plus } from "lucide-react"
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
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-balance">Agende Beauty</h1>
            <p className="text-xs text-muted-foreground">{userName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary hover:text-secondary-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <LogoutButton />
      </div>
    </div>
  )
}
