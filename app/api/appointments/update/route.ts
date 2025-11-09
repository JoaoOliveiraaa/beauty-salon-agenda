import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, genericError } from "@/lib/security"
import { updateAppointmentSchema } from "@/lib/schemas"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      secureLog("warn", "Tentativa de atualização sem autenticação")
      return NextResponse.json(genericError("Não autenticado"), { status: 401 })
    }

    const body = await request.json()

    // Validação com Zod
    const validationResult = updateAppointmentSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Dados inválidos"
      return NextResponse.json(genericError(errorMessage), { status: 400 })
    }

    const { appointmentId, status, pago } = validationResult.data

    const supabase = await getSupabaseServerClient()

    // Verificar se o agendamento existe e se o usuário tem permissão
    const { data: appointment } = await supabase
      .from("agendamentos")
      .select("funcionario_id")
      .eq("id", appointmentId)
      .single()

    if (!appointment) {
      return NextResponse.json(genericError("Agendamento não encontrado"), { status: 404 })
    }

    // Staff só pode atualizar seus próprios agendamentos
    if (session.tipo_usuario === "funcionario" && appointment.funcionario_id !== session.id) {
      secureLog("warn", "Funcionário tentou atualizar agendamento de outro")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    // Build update object
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (pago !== undefined) updateData.pago = pago

    const { data, error } = await supabase
      .from("agendamentos")
      .update(updateData)
      .eq("id", appointmentId)
      .select("id, status, pago")
      .single()

    if (error) {
      secureLog("error", "Erro ao atualizar agendamento", error)
      return NextResponse.json(genericError("Erro ao atualizar agendamento"), { status: 500 })
    }

    secureLog("info", "Agendamento atualizado com sucesso")
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    secureLog("error", "Erro na API de atualização", error)
    return NextResponse.json(genericError("Erro ao atualizar agendamento"), { status: 500 })
  }
}
