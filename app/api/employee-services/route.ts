import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Employee services API called")

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie) {
      console.log("[v0] No session cookie found")
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const session = JSON.parse(sessionCookie.value)
    console.log("[v0] Session data:", { email: session.email, tipo_usuario: session.tipo_usuario })

    if (session.tipo_usuario !== "admin") {
      console.log("[v0] User is not admin, denying access")
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { employeeId, serviceIds } = await request.json()
    console.log("[v0] Request data:", { employeeId, serviceIdsCount: serviceIds?.length })

    if (!employeeId || !Array.isArray(serviceIds)) {
      console.log("[v0] Invalid request data")
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Delete existing associations
    console.log("[v0] Deleting existing services for employee:", employeeId)
    const { error: deleteError } = await supabase.from("funcionario_servicos").delete().eq("funcionario_id", employeeId)

    if (deleteError) {
      console.error("[v0] Error deleting employee services:", deleteError)
      throw deleteError
    }

    // Insert new associations
    if (serviceIds.length > 0) {
      const insertData = serviceIds.map((serviceId: string) => ({
        funcionario_id: employeeId,
        servico_id: serviceId,
      }))

      console.log("[v0] Inserting new services:", insertData)
      const { error: insertError } = await supabase.from("funcionario_servicos").insert(insertData)

      if (insertError) {
        console.error("[v0] Error inserting employee services:", insertError)
        throw insertError
      }
    }

    console.log("[v0] Employee services updated successfully:", { employeeId, serviceCount: serviceIds.length })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in employee-services API:", error)
    return NextResponse.json({ error: "Erro ao atualizar serviços" }, { status: 500 })
  }
}
