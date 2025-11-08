import { NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createSupabaseAdminClient } from "@/lib/supabase-server"

const periodSchema = z.enum(["week", "month", "all"])

function resolveDateFilter(period: z.infer<typeof periodSchema>) {
  switch (period) {
    case "week":
      return 7
    case "all":
      return 36500
    case "month":
    default:
      return 30
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get("period") ?? "month"

    const parsedPeriod = periodSchema.safeParse(periodParam)
    if (!parsedPeriod.success) {
      return NextResponse.json({ error: "Período inválido" }, { status: 400 })
    }

    const daysAgo = resolveDateFilter(parsedPeriod.data)
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - daysAgo)
    const dateString = dateFilter.toISOString().split("T")[0]

    const supabase = createSupabaseAdminClient()

    const [{ data: employees, error: empError }, { data: appointments, error: aptError }] = await Promise.all([
      supabase.from("users").select("id, nome").eq("tipo_usuario", "funcionario"),
      supabase
        .from("agendamentos")
        .select(
          `
            funcionario_id,
            status,
            pago,
            servicos (
              preco
            )
          `,
        )
        .gte("data_agendamento", dateString),
    ])

    if (empError) {
      logger.error("reports.employee-revenue.fetch_employees_error", { error: empError })
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    if (aptError) {
      logger.error("reports.employee-revenue.fetch_appointments_error", { error: aptError })
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    const appointmentsByEmployee = new Map<
      string,
      Array<{
        status: string | null
        pago: boolean | null
        servicos: { preco: number | null } | null
      }>
    >()

    for (const appointment of appointments ?? []) {
      if (!appointment.funcionario_id) continue

      const employeeAppointments = appointmentsByEmployee.get(appointment.funcionario_id) ?? []
      employeeAppointments.push(appointment)
      appointmentsByEmployee.set(appointment.funcionario_id, employeeAppointments)
    }

    const response = (employees ?? []).map((employee) => {
      const employeeAppointments = appointmentsByEmployee.get(employee.id) ?? []

      let totalAtendimentos = 0
      let faturamentoRealizado = 0
      let faturamentoPendente = 0
      let cancelamentos = 0

      for (const appointment of employeeAppointments) {
        const price = appointment.servicos?.preco ?? 0
        switch (appointment.status) {
          case "concluido":
            totalAtendimentos += 1
            if (appointment.pago) {
              faturamentoRealizado += price
            } else {
              faturamentoPendente += price
            }
            break
          case "confirmado":
            faturamentoPendente += price
            break
          case "cancelado":
            cancelamentos += 1
            break
          default:
            break
        }
      }

      return {
        id: employee.id,
        nome: employee.nome,
        total_atendimentos: totalAtendimentos,
        faturamento_realizado: faturamentoRealizado,
        faturamento_pendente: faturamentoPendente,
        cancelamentos,
      }
    })

    response.sort((a, b) => b.faturamento_realizado - a.faturamento_realizado)

    return NextResponse.json(response)
  } catch (error) {
    logger.error("reports.employee-revenue.unexpected_error", { error })
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

