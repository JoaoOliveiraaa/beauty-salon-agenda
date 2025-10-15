"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

interface AvailabilityManagerProps {
  userId: string
  initialAvailability: any[]
}

const diasSemana = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
]

export function AvailabilityManager({ userId, initialAvailability }: AvailabilityManagerProps) {
  const [availability, setAvailability] = useState(initialAvailability)
  const [diaSemana, setDiaSemana] = useState("")
  const [horaInicio, setHoraInicio] = useState("")
  const [horaFim, setHoraFim] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    setAvailability(initialAvailability)
  }, [initialAvailability])

  const addAvailability = async () => {
    if (!diaSemana || !horaInicio || !horaFim) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("disponibilidades")
        .insert({
          funcionario_id: userId,
          dia_semana: Number.parseInt(diaSemana),
          hora_inicio: horaInicio,
          hora_fim: horaFim,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setAvailability([...availability, data])
      }

      setDiaSemana("")
      setHoraInicio("")
      setHoraFim("")
    } catch (error) {
      console.error("Error adding availability:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeAvailability = async (id: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.from("disponibilidades").delete().eq("id", id)

      if (error) throw error

      setAvailability(availability.filter((slot) => slot.id !== id))
    } catch (error) {
      console.error("Error removing availability:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-4">
        <h3 className="font-semibold">Adicionar Horário Indisponível</h3>
        <p className="text-sm text-muted-foreground">Selecione o dia e o período em que você NÃO poderá trabalhar</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Dia da Semana</Label>
            <Select value={diaSemana} onValueChange={setDiaSemana}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {diasSemana.map((dia) => (
                  <SelectItem key={dia.value} value={dia.value}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hora Início</Label>
            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hora Fim</Label>
            <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={addAvailability} disabled={loading} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Bloquear
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {availability.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum horário bloqueado. Você está disponível em todos os horários.
          </p>
        ) : (
          availability.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
            >
              <div>
                <p className="font-semibold">{diasSemana.find((d) => d.value === slot.dia_semana.toString())?.label}</p>
                <p className="text-sm text-muted-foreground">
                  Indisponível: {slot.hora_inicio.slice(0, 5)} - {slot.hora_fim.slice(0, 5)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAvailability(slot.id)}
                disabled={loading}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
