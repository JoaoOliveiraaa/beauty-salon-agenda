import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, isValidUUID, sanitizeString, genericError } from "@/lib/security"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de acesso não autorizado a despesas")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30"

    // Validação do período
    const validPeriods = ["7", "30", "90", "365", "all"]
    if (!validPeriods.includes(period)) {
      return NextResponse.json(genericError("Período inválido"), { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    let query = supabase.from("despesas").select("*").order("data", { ascending: false })

    if (period !== "all") {
      const days = Number.parseInt(period)
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(genericError("Período inválido"), { status: 400 })
      }
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("data", startDate.toISOString().split("T")[0])
    }

    const { data, error } = await query

    if (error) {
      secureLog("error", "Erro ao buscar despesas", error)
      return NextResponse.json(genericError("Erro ao buscar despesas"), { status: 500 })
    }

    secureLog("info", "Despesas buscadas com sucesso")
    return NextResponse.json(data || [])
  } catch (error) {
    secureLog("error", "Erro na API de despesas GET", error)
    return NextResponse.json(genericError("Erro ao buscar despesas"), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de criar despesa sem permissão")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const body = await request.json()
    const { descricao, valor, categoria, data, observacoes } = body

    // Validação de campos obrigatórios
    if (!descricao || !valor || !categoria || !data) {
      return NextResponse.json(genericError("Campos obrigatórios faltando"), { status: 400 })
    }

    // Sanitização e validação
    const sanitizedDescricao = sanitizeString(descricao, 255)
    const sanitizedCategoria = sanitizeString(categoria, 100)
    const sanitizedObservacoes = observacoes ? sanitizeString(observacoes, 500) : null

    if (sanitizedDescricao.length < 3) {
      return NextResponse.json(genericError("Descrição muito curta"), { status: 400 })
    }

    const valorNum = Number.parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0 || valorNum > 1000000) {
      return NextResponse.json(genericError("Valor inválido"), { status: 400 })
    }

    // Validar formato de data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json(genericError("Data inválida"), { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: expense, error } = await supabase
      .from("despesas")
      .insert({
        descricao: sanitizedDescricao,
        valor: valorNum,
        categoria: sanitizedCategoria,
        data,
        observacoes: sanitizedObservacoes,
      })
      .select()
      .single()

    if (error) {
      secureLog("error", "Erro ao criar despesa", error)
      return NextResponse.json(genericError("Erro ao criar despesa"), { status: 500 })
    }

    secureLog("info", "Despesa criada com sucesso")
    return NextResponse.json(expense)
  } catch (error) {
    secureLog("error", "Erro na API de despesas POST", error)
    return NextResponse.json(genericError("Erro ao criar despesa"), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de atualizar despesa sem permissão")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const body = await request.json()
    const { id, descricao, valor, categoria, data, observacoes } = body

    if (!id || !isValidUUID(id)) {
      return NextResponse.json(genericError("ID inválido"), { status: 400 })
    }

    // Validação de campos
    if (!descricao || !valor || !categoria || !data) {
      return NextResponse.json(genericError("Campos obrigatórios faltando"), { status: 400 })
    }

    // Sanitização
    const sanitizedDescricao = sanitizeString(descricao, 255)
    const sanitizedCategoria = sanitizeString(categoria, 100)
    const sanitizedObservacoes = observacoes ? sanitizeString(observacoes, 500) : null

    if (sanitizedDescricao.length < 3) {
      return NextResponse.json(genericError("Descrição muito curta"), { status: 400 })
    }

    const valorNum = Number.parseFloat(valor)
    if (isNaN(valorNum) || valorNum <= 0 || valorNum > 1000000) {
      return NextResponse.json(genericError("Valor inválido"), { status: 400 })
    }

    // Validar formato de data
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return NextResponse.json(genericError("Data inválida"), { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: expense, error } = await supabase
      .from("despesas")
      .update({
        descricao: sanitizedDescricao,
        valor: valorNum,
        categoria: sanitizedCategoria,
        data,
        observacoes: sanitizedObservacoes,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      secureLog("error", "Erro ao atualizar despesa", error)
      return NextResponse.json(genericError("Erro ao atualizar despesa"), { status: 500 })
    }

    secureLog("info", "Despesa atualizada com sucesso")
    return NextResponse.json(expense)
  } catch (error) {
    secureLog("error", "Erro na API de despesas PUT", error)
    return NextResponse.json(genericError("Erro ao atualizar despesa"), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.tipo_usuario !== "admin") {
      secureLog("warn", "Tentativa de deletar despesa sem permissão")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get("id")

    if (!id || !isValidUUID(id)) {
      return NextResponse.json(genericError("ID inválido"), { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("despesas").delete().eq("id", id)

    if (error) {
      secureLog("error", "Erro ao deletar despesa", error)
      return NextResponse.json(genericError("Erro ao deletar despesa"), { status: 500 })
    }

    secureLog("info", "Despesa deletada com sucesso")
    return NextResponse.json({ success: true })
  } catch (error) {
    secureLog("error", "Erro na API de despesas DELETE", error)
    return NextResponse.json(genericError("Erro ao deletar despesa"), { status: 500 })
  }
}
