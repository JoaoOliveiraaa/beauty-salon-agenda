"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Calendar } from "lucide-react"

interface BookingFormProps {
  staff: Array<{ id: string; nome: string }>
  services: Array<{ id: string; nome_servico: string; duracao_minutos: number }>
  userType: "admin" | "funcionario"
}

export function BookingForm({ staff, services, userType }: BookingFormProps) {
  const [clienteNome, setClienteNome] = useState("")
  const [clienteTelefone, setClienteTelefone] = useState("")
  const [funcionarioId, setFuncionarioId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [dataAgendamento, setDataAgendamento] = useState("")
  const [horaAgendamento, setHoraAgendamento] = useState("")
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const loadAvailableTimes = async () => {
    if (!funcionarioId || !dataAgendamento) return

    const date = new Date(dataAgendamento + "T00:00:00")
    const dayOfWeek = date.getDay()

    // Get staff blocked times for this day
    const { data: blockedTimes } = await supabase
      .from("disponibilidades")
      .select("*")
      .eq("funcionario_id", funcionarioId)
      .eq("dia_semana", dayOfWeek)

    // Get existing appointments for this day
    const { data: appointments } = await supabase
      .from("agendamentos")
      .select("hora_agendamento, servico:servicos(duracao_minutos)")
      .eq("funcionario_id", funcionarioId)
      .eq("data_agendamento", dataAgendamento)
      .neq("status", "cancelado")

    // Generate all possible time slots (8:00 - 20:00)
    const times: string[] = []
    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`

        // Check if this time is blocked
        const isBlocked = blockedTimes?.some((slot) => {
          const [startHour, startMin] = slot.hora_inicio.split(":").map(Number)
          const [endHour, endMin] = slot.hora_fim.split(":").map(Number)
          const currentTime = hour * 60 + min
          const blockStart = startHour * 60 + startMin
          const blockEnd = endHour * 60 + endMin
          return currentTime >= blockStart && currentTime < blockEnd
        })

        // Check if this time is already booked
        const isBooked = appointments?.some((apt: any) => {
          const aptTime = apt.hora_agendamento.slice(0, 5)
          return aptTime === timeStr
        })

        // Only add if not blocked and not booked
        if (!isBlocked && !isBooked) {
          times.push(timeStr)
        }
      }
    }

    setAvailableTimes(times)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    try {
      const { error } = await supabase.from("agendamentos").insert({
        cliente_nome: clienteNome,
        cliente_telefone: clienteTelefone,
        funcionario_id: funcionarioId,
        servico_id: servicoId,
        data_agendamento: dataAgendamento,
        hora_agendamento: horaAgendamento,
        status: "confirmado",
      })

      if (error) throw error

      setSuccess(true)
      setClienteNome("")
      setClienteTelefone("")
      setFuncionarioId("")
      setServicoId("")
      setDataAgendamento("")
      setHoraAgendamento("")
      setAvailableTimes([])

      setTimeout(() => {
        const redirectPath = userType === "admin" ? "/admin/agendamentos" : "/staff/agendamentos"
        router.push(redirectPath)
      }, 1500)
    } catch (error) {
      console.error("Error creating appointment:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clienteNome">Nome do Cliente</Label>
          <Input
            id="clienteNome"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            required
            placeholder="João Silva"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clienteTelefone">Telefone</Label>
          <Input
            id="clienteTelefone"
            value={clienteTelefone}
            onChange={(e) => setClienteTelefone(e.target.value)}
            required
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Funcionário</Label>
          <Select
            value={funcionarioId}
            onValueChange={(value) => {
              setFuncionarioId(value)
              setHoraAgendamento("")
              setAvailableTimes([])
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {staff.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Serviço</Label>
          <Select value={servicoId} onValueChange={setServicoId}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.nome_servico}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataAgendamento">Data</Label>
          <Input
            id="dataAgendamento"
            type="date"
            value={dataAgendamento}
            onChange={(e) => {
              setDataAgendamento(e.target.value)
              setHoraAgendamento("")
              setAvailableTimes([])
            }}
            required
            min={new Date().toISOString().split("T")[0]}
          />
        </div>
        <div className="space-y-2">
          <Label>Horário</Label>
          <div className="flex gap-2">
            <Select value={horaAgendamento} onValueChange={setHoraAgendamento} disabled={availableTimes.length === 0}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={availableTimes.length === 0 ? "Carregue os horários" : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={loadAvailableTimes}
              disabled={!funcionarioId || !dataAgendamento}
            >
              <Calendar className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-success/10 text-success rounded-lg text-sm">Agendamento criado com sucesso!</div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando..." : "Criar Agendamento"}
      </Button>
    </form>
  )
}
