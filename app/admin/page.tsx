import { cn } from "@/lib/utils"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Briefcase, Clock, DollarSign, TrendingUp } from "lucide-react"
import { RevenueChart } from "@/components/revenue-chart"
import { ExportCSVButton } from "@/components/export-csv-button"
import { EmployeeRevenueTable } from "@/components/employee-revenue-table"
import { ServicePerformanceTable } from "@/components/service-performance-table"
import { BusinessMetricsCards } from "@/components/business-metrics-cards"
import { ProfitAnalysisDashboard } from "@/components/profit-analysis-dashboard"

async function getDashboardStats() {
  const supabase = await getSupabaseServerClient()

  const today = new Date().toISOString().split("T")[0]

  // Today's appointments
  const { data: todayAppointments } = await supabase
    .from("agendamentos")
    .select("*, funcionario:users(nome), servico:servicos(nome_servico)")
    .eq("data_agendamento", today)
    .order("hora_agendamento", { ascending: true })

  // Staff count
  const { count: staffCount } = await supabase.from("users").select("*", { count: "exact", head: true })

  // Services count
  const { count: servicesCount } = await supabase.from("servicos").select("*", { count: "exact", head: true })

  // Pending count
  const { count: pendingCount } = await supabase
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendente")

  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  const { data: completedAppointments } = await supabase
    .from("agendamentos")
    .select("*, servico:servicos(preco)")
    .eq("status", "concluido")
    .gte("data_agendamento", firstDayOfMonth)

  const completedRevenue =
    completedAppointments?.reduce((sum: number, apt: any) => {
      return sum + (apt.servico?.preco || 0)
    }, 0) || 0

  const { data: confirmedAppointments } = await supabase
    .from("agendamentos")
    .select("*, servico:servicos(preco)")
    .eq("status", "confirmado")

  const pendingRevenue =
    confirmedAppointments?.reduce((sum: number, apt: any) => {
      return sum + (apt.servico?.preco || 0)
    }, 0) || 0

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const { data: last7DaysAppointments } = await supabase
    .from("agendamentos")
    .select("data_agendamento, servico:servicos(preco)")
    .eq("status", "concluido")
    .gte("data_agendamento", last7Days[0])

  const revenueByDay = last7Days.map((date) => {
    const dayRevenue =
      last7DaysAppointments
        ?.filter((apt: any) => apt.data_agendamento === date)
        .reduce((sum: number, apt: any) => sum + (apt.servico?.preco || 0), 0) || 0

    return {
      date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      revenue: dayRevenue,
    }
  })

  return {
    todayAppointments: (todayAppointments as any[]) || [],
    staffCount: staffCount || 0,
    servicesCount: servicesCount || 0,
    pendingCount: pendingCount || 0,
    completedRevenue,
    pendingRevenue,
    revenueByDay,
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const statusColors = {
    pendente: "bg-amber-50 text-amber-700 border-amber-200",
    confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    concluido: "bg-blue-50 text-blue-700 border-blue-200",
    cancelado: "bg-red-50 text-red-700 border-red-200",
  }

  const statusLabels = {
    pendente: "Pendente",
    confirmado: "Confirmado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral do seu salão</p>
        </div>
        <ExportCSVButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Agendamentos Hoje</CardTitle>
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{stats.todayAppointments.length}</div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Faturado (Mês)</CardTitle>
            <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-700">R$ {stats.completedRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">A Receber</CardTitle>
            <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-700">R$ {stats.pendingRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="border-border hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pendentes</CardTitle>
            <div className="w-8 h-8 rounded-md bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-700">{stats.pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      <BusinessMetricsCards />

      <ProfitAnalysisDashboard />

      <RevenueChart data={stats.revenueByDay} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmployeeRevenueTable />
        <ServicePerformanceTable />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Agendamentos de Hoje</CardTitle>
            <span className="text-xs text-muted-foreground">{stats.todayAppointments.length} total</span>
          </CardHeader>
          <CardContent>
            {stats.todayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.todayAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{appointment.cliente_nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {appointment.servico?.nome_servico} • {appointment.funcionario?.nome}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        {appointment.hora_agendamento.slice(0, 5)}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium border",
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

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Estatísticas Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Funcionários</p>
                  <p className="text-lg font-semibold text-foreground">{stats.staffCount}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Serviços Ativos</p>
                  <p className="text-lg font-semibold text-foreground">{stats.servicesCount}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-amber-700">Aguardando Confirmação</p>
                  <p className="text-lg font-semibold text-amber-700">{stats.pendingCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
