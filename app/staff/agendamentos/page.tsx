import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppointmentsList } from "@/components/appointments-list"

async function getStaffAppointments(userId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: appointments } = await supabase
    .from("agendamentos")
    .select("*, funcionario:users(nome), servico:servicos(nome_servico, preco)")
    .eq("funcionario_id", userId)
    .order("data_agendamento", { ascending: false })
    .order("hora_agendamento", { ascending: false })

  return appointments || []
}

export default async function StaffAgendamentosPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const appointments = await getStaffAppointments(session.id)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Meus Agendamentos</h1>
        <p className="text-muted-foreground mt-1">Visualize todos os seus agendamentos</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Todos os Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <AppointmentsList appointments={appointments} isAdmin={false} />
        </CardContent>
      </Card>
    </div>
  )
}
