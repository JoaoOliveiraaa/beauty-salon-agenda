import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingForm } from "@/components/booking-form"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"

async function getBookingData(currentUserId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: allStaff } = await supabase
    .from("users")
    .select("id, nome")
    .eq("tipo_usuario", "funcionario")
    .order("nome", { ascending: true })

  // Mark current user as "Você"
  const staff = (allStaff || []).map((person) => ({
    id: person.id,
    nome: person.id === currentUserId ? `Você (${person.nome})` : person.nome,
  }))

  const { data: services } = await supabase.from("servicos").select("*").order("nome_servico", { ascending: true })

  return {
    staff,
    services: services || [],
  }
}

export default async function StaffNovoAgendamentoPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const data = await getBookingData(session.id)

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Novo Agendamento</h1>
        <p className="text-muted-foreground mt-1">Crie um agendamento para você ou outro funcionário</p>
      </div>

      <Card className="shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle>Informações do Agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm staff={data.staff} services={data.services} userType="funcionario" />
        </CardContent>
      </Card>
    </div>
  )
}
