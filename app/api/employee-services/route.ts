import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createSupabaseAdminClient } from "@/lib/supabase-server"

const requestSchema = z.object({
  employeeId: z.string().uuid("ID do funcionário inválido"),
  serviceIds: z.array(z.string().uuid("ID de serviço inválido")).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    if (session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { employeeId, serviceIds } = parsed.data
    const uniqueServiceIds = Array.from(new Set(serviceIds))

    const supabase = createSupabaseAdminClient()

    const { error: deleteError } = await supabase.from("funcionario_servicos").delete().eq("funcionario_id", employeeId)

    if (deleteError) {
      logger.error("employee-services.delete_error", { error: deleteError, employeeId })
      return NextResponse.json({ error: "Erro ao atualizar serviços" }, { status: 500 })
    }

    if (uniqueServiceIds.length > 0) {
      const insertData = uniqueServiceIds.map((serviceId) => ({
        funcionario_id: employeeId,
        servico_id: serviceId,
      }))

      const { error: insertError } = await supabase.from("funcionario_servicos").insert(insertData)

      if (insertError) {
        logger.error("employee-services.insert_error", {
          error: insertError,
          employeeId,
          serviceCount: uniqueServiceIds.length,
        })
        return NextResponse.json({ error: "Erro ao atualizar serviços" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("employee-services.unexpected_error", { error })
    return NextResponse.json({ error: "Erro ao atualizar serviços" }, { status: 500 })
  }
}

