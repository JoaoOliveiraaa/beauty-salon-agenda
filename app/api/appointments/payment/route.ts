import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, isValidUUID, genericError } from "@/lib/security"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      secureLog("warn", "Tentativa de atualização de pagamento sem autenticação")
      return NextResponse.json(genericError("Não autorizado"), { status: 401 })
    }

    const { appointmentId, pago } = await request.json()

    // Validação de entrada
    if (!appointmentId || !isValidUUID(appointmentId)) {
      return NextResponse.json(genericError("ID do agendamento inválido"), { status: 400 })
    }

    if (typeof pago !== "boolean") {
      return NextResponse.json(genericError("Valor de pagamento inválido"), { status: 400 })
    }

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
      secureLog("warn", "Funcionário tentou atualizar pagamento de outro")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    // Update payment status
    const { data, error } = await supabase
      .from("agendamentos")
      .update({ pago })
      .eq("id", appointmentId)
      .select("id, pago")
      .single()

    if (error) {
      secureLog("error", "Erro ao atualizar pagamento", error)
      return NextResponse.json(genericError("Erro ao atualizar pagamento"), { status: 500 })
    }

    secureLog("info", "Pagamento atualizado com sucesso")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    secureLog("error", "Erro na API de pagamento", error)
    return NextResponse.json(genericError("Erro ao atualizar pagamento"), { status: 500 })
  }
}
