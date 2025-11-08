import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createSupabaseAdminClient } from "@/lib/supabase-server"

const appointmentSchema = z
  .object({
    appointmentId: z.string().uuid("ID do agendamento inválido"),
    status: z.enum(["pendente", "confirmado", "concluido", "cancelado"]).optional(),
    pago: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.pago !== undefined, {
    message: "Status ou pagamento devem ser informados",
    path: ["status"],
  })

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = appointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const { appointmentId, status, pago } = parsed.data

    const supabase = createSupabaseAdminClient()

    if (session.tipo_usuario === "funcionario") {
      const { data: appointmentOwner, error: ownerError } = await supabase
        .from("agendamentos")
        .select("funcionario_id")
        .eq("id", appointmentId)
        .single()

      if (ownerError || !appointmentOwner || appointmentOwner.funcionario_id !== session.id) {
        return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (pago !== undefined) updateData.pago = pago

    const { data, error } = await supabase
      .from("agendamentos")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) {
      logger.error("appointments.update.database_error", { error, appointmentId })
      return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error("appointments.update.unexpected_error", { error })
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 })
  }
}

