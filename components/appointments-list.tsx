"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Check, X, Download } from "lucide-react"

interface AppointmentsListProps {
  appointments: any[]
  isAdmin: boolean
}

export function AppointmentsList({ appointments, isAdmin }: AppointmentsListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const statusColors = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    confirmado: "bg-success/10 text-success border-success/20",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  }

  const statusLabels = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    cancelado: "Cancelado",
  }

  const updateStatus = async (id: string, status: string) => {
    setLoading(id)
    try {
      await supabase.from("agendamentos").update({ status }).eq("id", id)
      router.refresh()
    } catch (error) {
      console.error("Error updating status:", error)
    } finally {
      setLoading(null)
    }
  }

  const exportToCSV = () => {
    const headers = ["Data", "Hora", "Cliente", "Telefone", "Serviço", "Funcionário", "Status", "Preço"]
    const rows = appointments.map((apt) => [
      new Date(apt.data_agendamento).toLocaleDateString("pt-BR"),
      apt.hora_agendamento.slice(0, 5),
      apt.cliente_nome,
      apt.cliente_telefone,
      apt.servico?.nome_servico || "",
      apt.funcionario?.nome || "",
      statusLabels[apt.status as keyof typeof statusLabels],
      `R$ ${apt.servico?.preco?.toFixed(2) || "0.00"}`,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `agendamentos-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  if (appointments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado</p>
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="p-4 bg-card rounded-lg border border-border shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{appointment.cliente_nome}</h3>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusColors[appointment.status as keyof typeof statusColors])}
                  >
                    {statusLabels[appointment.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Data:</span>{" "}
                    {new Date(appointment.data_agendamento).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Hora:</span>{" "}
                    {appointment.hora_agendamento.slice(0, 5)}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Telefone:</span> {appointment.cliente_telefone}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Serviço:</span> {appointment.servico?.nome_servico}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Funcionário:</span> {appointment.funcionario?.nome}
                  </p>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Preço:</span> R${" "}
                    {appointment.servico?.preco?.toFixed(2)}
                  </p>
                </div>
              </div>

              {appointment.status === "pendente" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-success/10 hover:bg-success/20 text-success border-success/20"
                    onClick={() => updateStatus(appointment.id, "confirmado")}
                    disabled={loading === appointment.id}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20"
                    onClick={() => updateStatus(appointment.id, "cancelado")}
                    disabled={loading === appointment.id}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
