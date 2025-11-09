import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

async function getAllAvailability() {
  const supabase = await getSupabaseServerClient()

  const { data: availability } = await supabase
    .from("disponibilidades")
    .select("*, funcionario:users(nome)")
    .order("funcionario_id", { ascending: true })
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true })

  return availability || []
}

const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default async function DisponibilidadesPage() {
  const availability = await getAllAvailability()

  // Group by staff member
  const groupedByStaff = availability.reduce(
    (acc, slot) => {
      const staffId = slot.funcionario_id
      if (!acc[staffId]) {
        acc[staffId] = {
          nome: slot.funcionario?.nome || "Unknown",
          slots: [],
        }
      }
      acc[staffId].slots.push(slot)
      return acc
    },
    {} as Record<string, { nome: string; slots: any[] }>,
  )

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Disponibilidades</h1>
        <p className="text-muted-foreground mt-1">Visualize os horários disponíveis de todos os funcionários</p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByStaff).map(([staffId, data]) => (
          <Card key={staffId} className="shadow-sm">
            <CardHeader>
              <CardTitle>{data.nome}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.slots.map((slot) => (
                  <div key={slot.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                    <Badge variant="outline" className="mb-2">
                      {diasSemana[slot.dia_semana]}
                    </Badge>
                    <p className="text-sm font-medium">
                      {slot.hora_inicio.slice(0, 5)} - {slot.hora_fim.slice(0, 5)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
