import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

async function getStaffDashboardData(userId: string) {
  const supabase = await getSupabaseServerClient()

  const today = new Date().toISOString().split("T")[0]

  // Get today's appointments for this staff member
  const { data: todayAppointments } = await supabase
    .from("agendamentos")
    .select("*, servico:servicos(nome_servico)")
    .eq("funcionario_id", userId)
    .eq("data_agendamento", today)
    .order("hora_agendamento", { ascending: true })

  // Get upcoming appointments (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { data: upcomingAppointments } = await supabase
    .from("agendamentos")
    .select("*, servico:servicos(nome_servico)")
    .eq("funcionario_id", userId)
    .gte("data_agendamento", today)
    .lte("data_agendamento", nextWeek.toISOString().split("T")[0])
    .order("data_agendamento", { ascending: true })
    .order("hora_agendamento", { ascending: true })

  // Get confirmed appointments count
  const { count: confirmedCount } = await supabase
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("funcionario_id", userId)
    .eq("status", "confirmado")
    .gte("data_agendamento", today)

  return {
    todayAppointments: (todayAppointments as any[]) || [],
    upcomingAppointments: (upcomingAppointments as any[]) || [],
    confirmedCount: confirmedCount || 0,
  }
}

export default async function StaffDashboard() {
  const user = await getSession()

  if (!user) return null

  const supabase = await getSupabaseServerClient()

  const stats = await getStaffDashboardData(user.id)

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

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden h-48 mb-8">
        <img src="/beauty-salon-workspace-hairdresser-station-soft-na.jpg" alt="Salon workspace" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-accent/80 to-primary/60 flex items-center px-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-primary-foreground text-balance mb-2">
              Olá, {user.nome}
            </h1>
            <p className="text-primary-foreground/90 text-lg">Seus agendamentos e estatísticas</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoje</CardTitle>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.todayAppointments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">agendamentos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos 7 Dias</CardTitle>
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {stats.upcomingAppointments.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">agendamentos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmados</CardTitle>
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-success">{stats.confirmedCount}</div>
            <p className="text-xs text-muted-foreground mt-2">futuros</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Agendamentos de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.todayAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.todayAppointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-secondary/50 to-accent/5 rounded-xl border border-border/50 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{appointment.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {appointment.servico?.nome_servico} • {appointment.cliente_telefone}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-lg text-primary">
                      {appointment.hora_agendamento.slice(0, 5)}
                    </span>
                    <span
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium border",
                        statusColors[appointment.status as keyof typeof statusColors],
                      )}
                    >
                      {statusLabels[appointment.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-serif">Próximos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.upcomingAppointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nenhum agendamento próximo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingAppointments.slice(0, 5).map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-5 bg-gradient-to-r from-secondary/50 to-accent/5 rounded-xl border border-border/50 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{appointment.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {appointment.servico?.nome_servico} • {appointment.cliente_telefone}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(appointment.data_agendamento).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-sm text-muted-foreground">{appointment.hora_agendamento.slice(0, 5)}</p>
                    </div>
                    <span
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium border",
                        statusColors[appointment.status as keyof typeof statusColors],
                      )}
                    >
                      {statusLabels[appointment.status as keyof typeof statusLabels]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
