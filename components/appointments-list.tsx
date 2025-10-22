"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { Check, X, Download, DollarSign, CheckCircle2, Clock, Calendar, Phone, User, Scissors } from "lucide-react"

interface AppointmentsListProps {
  appointments: any[]
  isAdmin: boolean
}

export function AppointmentsList({ appointments, isAdmin }: AppointmentsListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const statusColors = {
    pendente: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    confirmado: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    concluido: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    cancelado: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  }

  const statusLabels = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  }

  const updateAppointment = async (id: string, updates: { status?: string; pago?: boolean }) => {
    setLoading(id)
    try {
      console.log("[v0] Updating appointment:", id, updates)
      const response = await fetch("/api/appointments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id, ...updates }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error("[v0] Error response:", error)
        throw new Error(error.error || "Erro ao atualizar")
      }

      console.log("[v0] Appointment updated successfully")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error updating appointment:", error)
      alert("Erro ao atualizar agendamento")
    } finally {
      setLoading(null)
    }
  }

  const exportToCSV = () => {
    const headers = ["Data", "Hora", "Cliente", "Telefone", "Serviço", "Funcionário", "Status", "Pago", "Preço"]
    const rows = appointments.map((apt) => [
      new Date(apt.data_agendamento).toLocaleDateString("pt-BR"),
      apt.hora_agendamento.slice(0, 5),
      apt.cliente_nome,
      apt.cliente_telefone,
      apt.servico?.nome_servico || "",
      apt.funcionario?.nome || "",
      statusLabels[apt.status as keyof typeof statusLabels],
      apt.pago ? "Sim" : "Não",
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
    return <p className="text-muted-foreground text-center py-12 text-sm">Nenhum agendamento encontrado</p>
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="p-5 bg-card rounded-lg border border-border hover:border-border/80 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Main info */}
              <div className="flex-1 space-y-3">
                {/* Header with name and badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base">{appointment.cliente_nome}</h3>
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-medium", statusColors[appointment.status as keyof typeof statusColors])}
                  >
                    {statusLabels[appointment.status as keyof typeof statusLabels]}
                  </Badge>
                  {appointment.pago && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Pago
                    </Badge>
                  )}
                  {!appointment.pago && appointment.status === "concluido" && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium bg-amber-500/10 text-amber-700 border-amber-500/20"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Aguardando Pagamento
                    </Badge>
                  )}
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(appointment.data_agendamento).toLocaleDateString("pt-BR")} às{" "}
                      {appointment.hora_agendamento.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{appointment.cliente_telefone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scissors className="w-4 h-4" />
                    <span>{appointment.servico?.nome_servico}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{appointment.funcionario?.nome}</span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 pt-1">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-base">R$ {appointment.servico?.preco?.toFixed(2)}</span>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex flex-col gap-2">
                {appointment.status === "pendente" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 border-blue-500/20"
                      onClick={() => updateAppointment(appointment.id, { status: "confirmado" })}
                      disabled={loading === appointment.id}
                    >
                      <Check className="w-4 h-4" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 border-rose-500/20"
                      onClick={() => updateAppointment(appointment.id, { status: "cancelado" })}
                      disabled={loading === appointment.id}
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </Button>
                  </>
                )}

                {appointment.status === "confirmado" && (
                  <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateAppointment(appointment.id, { status: "concluido", pago: true })}
                    disabled={loading === appointment.id}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir e Marcar Pago
                  </Button>
                )}

                {appointment.status === "concluido" && !appointment.pago && (
                  <Button
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => updateAppointment(appointment.id, { pago: true })}
                    disabled={loading === appointment.id}
                  >
                    <DollarSign className="w-4 h-4" />
                    Marcar como Pago
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
