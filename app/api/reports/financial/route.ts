import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = await getSupabaseServerClient()

    let query = supabase
      .from("agendamentos")
      .select(`
        *,
        funcionario:usuarios!agendamentos_funcionario_id_fkey(nome),
        servico:servicos(nome_servico, preco)
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
      console.error("[v0] Error fetching appointments:", error)
      return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
    }

    // Generate CSV with payment status
    const csvRows = [
      ["Data", "Hora", "Cliente", "Telefone", "Serviço", "Funcionário", "Valor", "Status", "Pago"].join(","),
    ]

    appointments?.forEach((apt: any) => {
      csvRows.push(
        [
          apt.data_agendamento,
          apt.hora_agendamento,
          `"${apt.cliente_nome}"`,
          apt.cliente_telefone,
          `"${apt.servico?.nome_servico || ""}"`,
          `"${apt.funcionario?.nome || ""}"`,
          apt.servico?.preco || 0,
          apt.status,
          apt.pago ? "Sim" : "Não",
        ].join(","),
      )
    })

    const csv = csvRows.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio-financeiro-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error generating CSV:", error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}
