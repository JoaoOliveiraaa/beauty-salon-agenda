import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, genericError } from "@/lib/security"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de acesso não autorizado a receita por funcionário")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    // Validar período
    const validPeriods = ["week", "month", "all"]
    if (!validPeriods.includes(period)) {
      return NextResponse.json(genericError("Período inválido"), { status: 400 })
    }

    let daysAgo = 30
    if (period === "week") daysAgo = 7
    else if (period === "all") daysAgo = 36500 // ~100 years

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - daysAgo)
    const dateString = dateFilter.toISOString().split("T")[0]

    const supabase = await getSupabaseServerClient()

    const { data: employees, error: empError } = await supabase
      .from("users")
      .select("id, nome")
      .eq("tipo_usuario", "funcionario")

    if (empError) {
      secureLog("error", "Erro ao buscar funcionários", empError)
      return NextResponse.json(genericError("Erro ao buscar receita"), { status: 500 })
    }

    // Get appointments for each employee
    const employeeRevenue = await Promise.all(
      (employees || []).map(async (emp) => {
        const { data: appointments, error: aptError } = await supabase
          .from("agendamentos")
          .select(`
            status,
            pago,
            servicos (
              preco
            )
          `)
          .eq("funcionario_id", emp.id)
          .gte("data_agendamento", dateString)

        if (aptError) {
          secureLog("error", "Erro ao buscar agendamentos do funcionário", aptError)
          return {
            id: emp.id,
            nome: emp.nome,
            total_atendimentos: 0,
            faturamento_realizado: 0,
            faturamento_pendente: 0,
            cancelamentos: 0,
          }
        }

        const totalAtendimentos = appointments?.filter((a) => a.status === "concluido").length || 0
        const faturamentoRealizado =
          appointments
            ?.filter((a) => a.status === "concluido" && a.pago)
            .reduce((sum, a) => sum + ((a.servicos as any)?.preco || 0), 0) || 0
        const faturamentoPendente =
          appointments
            ?.filter((a) => (a.status === "concluido" && !a.pago) || a.status === "confirmado")
            .reduce((sum, a) => sum + ((a.servicos as any)?.preco || 0), 0) || 0
        const cancelamentos = appointments?.filter((a) => a.status === "cancelado").length || 0

        return {
          id: emp.id,
          nome: emp.nome,
          total_atendimentos: totalAtendimentos,
          faturamento_realizado: faturamentoRealizado,
          faturamento_pendente: faturamentoPendente,
          cancelamentos,
        }
      }),
    )

    const sortedRevenue = employeeRevenue.sort((a, b) => b.faturamento_realizado - a.faturamento_realizado)

    secureLog("info", "Receita por funcionário obtida com sucesso")
    return NextResponse.json(sortedRevenue)
  } catch (error) {
    secureLog("error", "Erro ao buscar receita por funcionário", error)
    return NextResponse.json(genericError("Erro interno do servidor"), { status: 500 })
  }
}
