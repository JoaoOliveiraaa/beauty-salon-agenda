import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    console.log("[v0] Employee revenue API called")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      console.log("[v0] Permission denied")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    let daysAgo = 30
    if (period === "week") daysAgo = 7
    else if (period === "all") daysAgo = 36500 // ~100 years

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - daysAgo)
    const dateString = dateFilter.toISOString().split("T")[0]

    const supabase = createSupabaseAdminClient()

    const { data: employees, error: empError } = await supabase
      .from("users")
      .select("id, nome")
      .eq("tipo_usuario", "funcionario")

    if (empError) {
      console.error("[v0] Error fetching employees:", empError.message)
      return NextResponse.json({ error: empError.message }, { status: 500 })
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
          console.error(`[v0] Error fetching appointments for ${emp.nome}:`, aptError.message)
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
            .reduce((sum, a) => sum + (a.servicos?.preco || 0), 0) || 0
        const faturamentoPendente =
          appointments
            ?.filter((a) => (a.status === "concluido" && !a.pago) || a.status === "confirmado")
            .reduce((sum, a) => sum + (a.servicos?.preco || 0), 0) || 0
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

    console.log("[v0] Employee revenue fetched:", sortedRevenue.length, "employees")
    return NextResponse.json(sortedRevenue)
  } catch (error) {
    console.error("[v0] Error fetching employee revenue:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
