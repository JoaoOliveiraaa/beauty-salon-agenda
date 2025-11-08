import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const paymentSchema = z.object({
  appointmentId: z.string().uuid("ID do agendamento inválido"),
  pago: z.boolean(),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (session.tipo_usuario !== "admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = paymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("agendamentos")
      .update({ pago: parsed.data.pago })
      .eq("id", parsed.data.appointmentId)
      .select()
      .single()

    if (error) {
      logger.error("appointments.payment.database_error", {
        error,
        appointmentId: parsed.data.appointmentId,
      })
      return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    logger.error("appointments.payment.unexpected_error", { error })
    return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 })
  }
}

