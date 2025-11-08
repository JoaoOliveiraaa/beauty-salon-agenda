import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createSupabaseAdminClient } from "@/lib/supabase-server"

const expenseSchema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor: z.coerce.number({ invalid_type_error: "Valor deve ser numérico" }).nonnegative("Valor inválido"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  data: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Data inválida" })
    .transform((value) => value.split("T")[0]),
  observacoes: z.string().max(500).optional().nullable(),
})

const idSchema = z.object({
  id: z.string().uuid("ID inválido"),
})

const validPeriods = new Set(["7", "30", "90", "all"])

async function requireAdminSession() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  }

  if (session.tipo_usuario !== "admin") {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) }
  }

  return { session }
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdminSession()
    if (error) return error

    const period = request.nextUrl.searchParams.get("period") ?? "30"
    if (!validPeriods.has(period)) {
      return NextResponse.json({ error: "Período inválido" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    let query = supabase.from("despesas").select("*").order("data", { ascending: false })

    if (period !== "all") {
      const days = Number.parseInt(period, 10)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte("data", startDate.toISOString().split("T")[0])
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      logger.error("expenses.fetch_error", { error: fetchError, period })
      return NextResponse.json({ error: "Erro ao buscar despesas" }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    logger.error("expenses.unexpected_error_get", { error })
    return NextResponse.json({ error: "Erro ao buscar despesas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdminSession()
    if (error) return error

    const body = await request.json()
    const parsed = expenseSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { data, error: insertError } = await supabase
      .from("despesas")
      .insert(parsed.data)
      .select()
      .single()

    if (insertError) {
      logger.error("expenses.insert_error", { error: insertError })
      return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error("expenses.unexpected_error_post", { error })
    return NextResponse.json({ error: "Erro ao criar despesa" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { error } = await requireAdminSession()
    if (error) return error

    const body = await request.json()
    const combinedSchema = idSchema.merge(expenseSchema)
    const parsed = combinedSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { id, ...payload } = parsed.data
    const supabase = createSupabaseAdminClient()

    const { data, error: updateError } = await supabase
      .from("despesas")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      logger.error("expenses.update_error", { error: updateError, id })
      return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error("expenses.unexpected_error_put", { error })
    return NextResponse.json({ error: "Erro ao atualizar despesa" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAdminSession()
    if (error) return error

    const idResult = idSchema.safeParse({ id: request.nextUrl.searchParams.get("id") })
    if (!idResult.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const { id } = idResult.data

    const supabase = createSupabaseAdminClient()

    const { error: deleteError } = await supabase.from("despesas").delete().eq("id", id)

    if (deleteError) {
      logger.error("expenses.delete_error", { error: deleteError, id })
      return NextResponse.json({ error: "Erro ao deletar despesa" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("expenses.unexpected_error_delete", { error })
    return NextResponse.json({ error: "Erro ao deletar despesa" }, { status: 500 })
  }
}

