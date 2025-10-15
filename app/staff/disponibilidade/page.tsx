import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AvailabilityManager } from "@/components/availability-manager"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

async function getStaffAvailability(userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: availability } = await supabase
    .from("disponibilidades")
    .select("*")
    .eq("funcionario_id", userId)
    .order("dia_semana", { ascending: true })
    .order("hora_inicio", { ascending: true })

  return availability || []
}

export default async function DisponibilidadePage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const availability = await getStaffAvailability(session.id)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Horários Indisponíveis</h1>
        <p className="text-muted-foreground mt-1">
          Marque os horários em que você NÃO estará disponível para trabalhar
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Bloquear Horários</CardTitle>
        </CardHeader>
        <CardContent>
          <AvailabilityManager userId={session.id} initialAvailability={availability} />
        </CardContent>
      </Card>
    </div>
  )
}
