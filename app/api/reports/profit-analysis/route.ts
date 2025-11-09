import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/reports/profit-analysis - Fetching profit analysis")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30"

    const supabase = createSupabaseAdminClient()

    // Calculate date range
    let dateFilter = ""
    if (period !== "all") {
      const days = Number.parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      dateFilter = startDate.toISOString().split("T")[0]
    }

    // Get revenue (from paid appointments)
    let revenueQuery = supabase
      .from("agendamentos")
      .select(`
        servicos (preco),
        data_agendamento,
        pago
      `)
      .eq("pago", true)

    if (dateFilter) {
      revenueQuery = revenueQuery.gte("data_agendamento", dateFilter)
    }

    const { data: appointments, error: revenueError } = await revenueQuery

    if (revenueError) {
      console.error("[v0] Error fetching revenue:", revenueError)
      return NextResponse.json({ error: revenueError.message }, { status: 500 })
    }

    const totalRevenue =
      appointments?.reduce((sum, apt) => {
        return sum + (apt.servicos?.preco || 0)
      }, 0) || 0

    // Get expenses
    let expensesQuery = supabase.from("despesas").select("valor, categoria, data")

    if (dateFilter) {
      expensesQuery = expensesQuery.gte("data", dateFilter)
    }

    const { data: expenses, error: expensesError } = await expensesQuery

    if (expensesError) {
      console.error("[v0] Error fetching expenses:", expensesError)
      return NextResponse.json({ error: expensesError.message }, { status: 500 })
    }

    const totalExpenses = expenses?.reduce((sum, exp) => sum + Number.parseFloat(exp.valor.toString()), 0) || 0

    // Calculate expenses by category
    const expensesByCategory =
      expenses?.reduce(
        (acc, exp) => {
          const categoria = exp.categoria
          if (!acc[categoria]) {
            acc[categoria] = 0
          }
          acc[categoria] += Number.parseFloat(exp.valor.toString())
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    // Calculate profit
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Get daily data for chart (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return date.toISOString().split("T")[0]
    })

    const dailyData = last30Days.map((date) => {
      const dayRevenue =
        appointments
          ?.filter((apt) => apt.data_agendamento === date)
          .reduce((sum, apt) => sum + (apt.servicos?.preco || 0), 0) || 0

      const dayExpenses =
        expenses
          ?.filter((exp) => exp.data === date)
          .reduce((sum, exp) => sum + Number.parseFloat(exp.valor.toString()), 0) || 0

      return {
        date,
        revenue: dayRevenue,
        expenses: dayExpenses,
        profit: dayRevenue - dayExpenses,
      }
    })

    const result = {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      expensesByCategory,
      dailyData,
    }

    console.log("[v0] Profit analysis calculated:", result)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error in GET /api/reports/profit-analysis:", error)
    return NextResponse.json({ error: "Erro ao calcular análise de lucro" }, { status: 500 })
  }
}
