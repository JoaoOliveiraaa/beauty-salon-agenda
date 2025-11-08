import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      logger.warn("reports.business-metrics.permission_denied", { userId: session?.id })
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const supabase = createSupabaseAdminClient()

    // Get date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const dateFilter = thirtyDaysAgo.toISOString().split("T")[0]

    // Get completed appointments with services
    const { data: completedAppointments, error: completedError } = await supabase
      .from("agendamentos")
      .select(`
        cliente_telefone,
        servicos (
          preco
        )
      `)
      .eq("status", "concluido")
      .gte("data_agendamento", dateFilter)

    if (completedError) {
      logger.error("reports.business-metrics.completed_fetch_error", { error: completedError })
      return NextResponse.json({ error: completedError.message }, { status: 500 })
    }

    // Get cancelled appointments
    const { data: cancelledAppointments, error: cancelledError } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("status", "cancelado")
      .gte("data_agendamento", dateFilter)

    if (cancelledError) {
      logger.error("reports.business-metrics.cancelled_fetch_error", { error: cancelledError })
      return NextResponse.json({ error: cancelledError.message }, { status: 500 })
    }

    // Get all appointments for cancellation rate
    const { data: allAppointments, error: allError } = await supabase
      .from("agendamentos")
      .select("id")
      .gte("data_agendamento", dateFilter)

    if (allError) {
      logger.error("reports.business-metrics.total_fetch_error", { error: allError })
      return NextResponse.json({ error: allError.message }, { status: 500 })
    }

    // Calculate metrics
    const uniqueClients = new Set(completedAppointments?.map((a) => a.cliente_telefone) || []).size
    const totalAtendimentos = completedAppointments?.length || 0
    const totalCancelamentos = cancelledAppointments?.length || 0
    const totalAppointments = allAppointments?.length || 0

    const prices = completedAppointments?.map((a) => a.servicos?.preco || 0) || []
    const ticketMedio = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    const taxaCancelamento =
      totalAppointments > 0 ? ((totalCancelamentos / totalAppointments) * 100).toFixed(2) : "0.00"

    // Get peak hours
    const { data: appointmentsForHours, error: hoursError } = await supabase
      .from("agendamentos")
      .select("hora_agendamento")
      .eq("status", "concluido")
      .gte("data_agendamento", dateFilter)

    if (hoursError) {
      logger.error("reports.business-metrics.hours_fetch_error", { error: hoursError })
    }

    const hourCounts: Record<number, number> = {}
    appointmentsForHours?.forEach((apt) => {
      const hour = Number.parseInt(apt.hora_agendamento.split(":")[0])
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const peakHours = Object.entries(hourCounts)
      .map(([hora, total]) => ({ hora: Number.parseInt(hora), total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Get peak days
    const { data: appointmentsForDays, error: daysError } = await supabase
      .from("agendamentos")
      .select("data_agendamento")
      .eq("status", "concluido")
      .gte("data_agendamento", dateFilter)

    if (daysError) {
      logger.error("reports.business-metrics.days_fetch_error", { error: daysError })
    }

    const dayCounts: Record<number, number> = {}
    appointmentsForDays?.forEach((apt) => {
      const dayOfWeek = new Date(apt.data_agendamento).getDay()
      dayCounts[dayOfWeek] = (dayCounts[dayOfWeek] || 0) + 1
    })

    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
    const peakDays = Object.entries(dayCounts)
      .map(([day, total]) => ({ dia_semana: dayNames[Number.parseInt(day)], total }))
      .sort((a, b) => b.total - a.total)

    const response = {
      metrics: {
        clientes_atendidos: uniqueClients,
        total_atendimentos: totalAtendimentos,
        ticket_medio: ticketMedio,
        total_cancelamentos: totalCancelamentos,
        taxa_cancelamento: taxaCancelamento,
      },
      peakHours,
      peakDays,
    }

    logger.info("reports.business-metrics.success", {
      clientesAtendidos: uniqueClients,
      totalAtendimentos,
      totalCancelamentos,
    })
    return NextResponse.json(response)
  } catch (error) {
    logger.error("reports.business-metrics.unexpected_error", { error })
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
