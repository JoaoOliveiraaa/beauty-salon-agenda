import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/expenses - Fetching expenses")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30"

    const supabase = createSupabaseAdminClient()

    let query = supabase.from("despesas").select("*").order("data", { ascending: false })

    if (period !== "all") {
      const days = Number.parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("data", startDate.toISOString().split("T")[0])
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching expenses:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Expenses fetched successfully:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error in GET /api/expenses:", error)
    return NextResponse.json({ error: "Erro ao buscar despesas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/expenses - Creating expense")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const { descricao, valor, categoria, data, observacoes } = body

    if (!descricao || !valor || !categoria || !data) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: expense, error } = await supabase
      .from("despesas")
      .insert({
        descricao,
        valor: Number.parseFloat(valor),
        categoria,
        data,
        observacoes,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating expense:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Expense created successfully:", expense.id)
    return NextResponse.json(expense)
  } catch (error) {
    console.error("[v0] Error in POST /api/expenses:", error)
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("[v0] PUT /api/expenses - Updating expense")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const { id, descricao, valor, categoria, data, observacoes } = body

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: expense, error } = await supabase
      .from("despesas")
      .update({
        descricao,
        valor: Number.parseFloat(valor),
        categoria,
        data,
        observacoes,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating expense:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Expense updated successfully:", id)
    return NextResponse.json(expense)
  } catch (error) {
    console.error("[v0] Error in PUT /api/expenses:", error)
    return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("[v0] DELETE /api/expenses - Deleting expense")

    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { error } = await supabase.from("despesas").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting expense:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Expense deleted successfully:", id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/expenses:", error)
    return NextResponse.json({ error: "Erro ao deletar despesa" }, { status: 500 })
  }
}
