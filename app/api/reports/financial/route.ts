import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, isValidDate, genericError } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de acesso não autorizado a relatórios financeiros")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Validar datas se fornecidas
    if (startDate && !isValidDate(startDate)) {
      return NextResponse.json(genericError("Data inicial inválida"), { status: 400 })
    }

    if (endDate && !isValidDate(endDate)) {
      return NextResponse.json(genericError("Data final inválida"), { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("agendamentos")
      .select(`
        id,
        data_agendamento,
        hora_agendamento,
        cliente_nome,
        cliente_telefone,
        status,
        pago,
        funcionario_id,
        servico_id
      `)
      .eq("status", "concluido")
      .order("data_agendamento", { ascending: false })

    if (startDate) {
      query = query.gte("data_agendamento", startDate)
    }
    if (endDate) {
      query = query.lte("data_agendamento", endDate)
    }

    const { data: appointments, error } = await query

    if (error) {
      secureLog("error", "Erro ao buscar agendamentos para relatório", error)
      return NextResponse.json(genericError("Erro ao buscar dados"), { status: 500 })
    }

    // Buscar dados de funcionários e serviços separadamente para melhor controle
    const funcionarioIds = [...new Set(appointments?.map(a => a.funcionario_id))]
    const servicoIds = [...new Set(appointments?.map(a => a.servico_id))]

    const { data: funcionarios } = await supabase
      .from("users")
      .select("id, nome")
      .in("id", funcionarioIds)

    const { data: servicos } = await supabase
      .from("servicos")
      .select("id, nome_servico, preco")
      .in("id", servicoIds)

    const funcionariosMap = new Map(funcionarios?.map(f => [f.id, f.nome]))
    const servicosMap = new Map(servicos?.map(s => [s.id, { nome: s.nome_servico, preco: s.preco }]))

    const appointmentsWithDetails = appointments?.map(apt => ({
      ...apt,
      funcionario_nome: funcionariosMap.get(apt.funcionario_id) || "",
      servico_nome: servicosMap.get(apt.servico_id)?.nome || "",
      servico_preco: servicosMap.get(apt.servico_id)?.preco || 0
    }))

    // Generate CSV with payment status
    const csvRows = [
      ["Data", "Hora", "Cliente", "Telefone", "Serviço", "Funcionário", "Valor", "Status", "Pago"].join(","),
    ]

    appointmentsWithDetails?.forEach((apt: any) => {
      csvRows.push(
        [
          apt.data_agendamento,
          apt.hora_agendamento,
          `"${apt.cliente_nome.replace(/"/g, '""')}"`, // Escape aspas duplas
          apt.cliente_telefone,
          `"${apt.servico_nome.replace(/"/g, '""')}"`,
          `"${apt.funcionario_nome.replace(/"/g, '""')}"`,
          apt.servico_preco || 0,
          apt.status,
          apt.pago ? "Sim" : "Não",
        ].join(","),
      )
    })

    const csv = csvRows.join("\n")

    secureLog("info", "Relatório financeiro gerado com sucesso")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-financeiro-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    secureLog("error", "Erro ao gerar relatório CSV", error)
    return NextResponse.json(genericError("Erro ao gerar relatório"), { status: 500 })
  }
}
