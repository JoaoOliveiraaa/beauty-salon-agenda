import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"

export async function PATCH(request: NextRequest) {
  try {
    console.log("[v0] Updating appointment status/payment")

    const session = await getSession()
    if (!session) {
      console.log("[v0] No session found")
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { appointmentId, status, pago } = await request.json()
    console.log("[v0] Update data:", { appointmentId, status, pago })

    if (!appointmentId) {
      return NextResponse.json({ error: "ID do agendamento é obrigatório" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Build update object
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (pago !== undefined) updateData.pago = pago

    console.log("[v0] Updating with data:", updateData)

    const { data, error } = await supabase
      .from("agendamentos")
      .update(updateData)
      .eq("id", appointmentId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating appointment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Appointment updated successfully:", data)
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Error in update appointment:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
