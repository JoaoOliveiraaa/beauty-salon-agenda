import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, genericError } from "@/lib/security"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de acesso não autorizado a desempenho de serviços")
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
    else if (period === "all") daysAgo = 36500

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - daysAgo)
    const dateString = dateFilter.toISOString().split("T")[0]

    const supabase = await getSupabaseServerClient()

    const { data: services, error: servError } = await supabase.from("servicos").select("id, nome_servico, preco")

    if (servError) {
      secureLog("error", "Erro ao buscar serviços", servError)
      return NextResponse.json(genericError("Erro ao buscar desempenho"), { status: 500 })
    }

    // Get appointments for each service
    const servicePerformance = await Promise.all(
      (services || []).map(async (service) => {
        const { data: appointments, error: aptError } = await supabase
          .from("agendamentos")
          .select("status")
          .eq("servico_id", service.id)
          .gte("data_agendamento", dateString)

        if (aptError) {
          secureLog("error", "Erro ao buscar agendamentos do serviço", aptError)
          return {
            id: service.id,
            nome_servico: service.nome_servico,
            preco: service.preco,
            total_vendas: 0,
            receita_total: 0,
            cancelamentos: 0,
            taxa_conversao: "0.00",
          }
        }

        const totalVendas = appointments?.filter((a) => a.status === "concluido").length || 0
        const receitaTotal = totalVendas * service.preco
        const cancelamentos = appointments?.filter((a) => a.status === "cancelado").length || 0
        const totalAppointments = appointments?.length || 0
        const taxaConversao = totalAppointments > 0 ? ((totalVendas / totalAppointments) * 100).toFixed(2) : "0.00"

        return {
          id: service.id,
          nome_servico: service.nome_servico,
          preco: service.preco,
          total_vendas: totalVendas,
          receita_total: receitaTotal,
          cancelamentos,
          taxa_conversao: taxaConversao,
        }
      }),
    )

    const sortedPerformance = servicePerformance.sort((a, b) => b.receita_total - a.receita_total)

    secureLog("info", "Desempenho de serviços obtido com sucesso")
    return NextResponse.json(sortedPerformance)
  } catch (error) {
    secureLog("error", "Erro ao buscar desempenho de serviços", error)
    return NextResponse.json(genericError("Erro interno do servidor"), { status: 500 })
  }
}
