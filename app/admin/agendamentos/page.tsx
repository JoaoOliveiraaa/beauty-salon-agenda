"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AppointmentsList } from "@/components/appointments-list"

interface Staff {
  id: string
  nome: string
}

export default function AgendamentosPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadData()
  }, [selectedStaff])

  async function loadData() {
    setLoading(true)

    // Load staff members
    const { data: staffData } = await supabase
      .from("users")
      .select("id, nome")
      .eq("tipo_usuario", "funcionario")
      .order("nome", { ascending: true })

    setStaff(staffData || [])

    // Load appointments with optional filter
    let query = supabase
      .from("agendamentos")
      .select("*, funcionario:users(nome), servico:servicos(nome_servico, preco)")
      .order("data_agendamento", { ascending: false })
      .order("hora_agendamento", { ascending: false })

    if (selectedStaff !== "all") {
      query = query.eq("funcionario_id", selectedStaff)
    }

    const { data: appointmentsData } = await query
    setAppointments(appointmentsData || [])
    setLoading(false)
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Agendamentos</h1>
        <p className="text-muted-foreground mt-1">Gerencie todos os agendamentos</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Todos os Agendamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Filtrar por Funcionário</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos os Funcionários</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : (
            <AppointmentsList appointments={appointments} isAdmin={true} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
