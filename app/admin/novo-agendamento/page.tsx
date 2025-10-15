import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookingForm } from "@/components/booking-form"

async function getBookingData() {
  const supabase = await getSupabaseServerClient()

  const { data: staff } = await supabase
    .from("users")
    .select("id, nome")
    .eq("tipo_usuario", "funcionario")
    .order("nome", { ascending: true })

  const { data: services } = await supabase.from("servicos").select("*").order("nome_servico", { ascending: true })

  return {
    staff: staff || [],
    services: services || [],
  }
}

export default async function NovoAgendamentoPage() {
  const data = await getBookingData()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-balance">Novo Agendamento</h1>
        <p className="text-muted-foreground mt-1">Crie um agendamento manualmente</p>
      </div>

      <Card className="shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle>Informações do Agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingForm staff={data.staff} services={data.services} userType="admin" />
        </CardContent>
      </Card>
    </div>
  )
}
