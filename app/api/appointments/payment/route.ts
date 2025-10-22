import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function PATCH(request: NextRequest) {
  try {
    console.log("[v0] Payment update request received")

    const session = await getSession()
    if (!session) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { appointmentId, pago } = await request.json()
    console.log("[v0] Updating payment status:", { appointmentId, pago })

    if (!appointmentId || typeof pago !== "boolean") {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update payment status
    const { data, error } = await supabase
      .from("agendamentos")
      .update({ pago })
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating payment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Payment status updated successfully")
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error in payment update:", error)
    return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 })
  }
}
