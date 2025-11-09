import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSession } from "@/lib/auth"
import { secureLog, isValidUUID, genericError } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      secureLog("warn", "Tentativa de atualizar serviços sem autenticação")
      return NextResponse.json(genericError("Não autenticado"), { status: 401 })
    }

    if (session.tipo_usuario !== "admin") {
      secureLog("warn", "Usuário não-admin tentou atualizar serviços de funcionário")
      return NextResponse.json(genericError("Sem permissão"), { status: 403 })
    }

    const { employeeId, serviceIds } = await request.json()

    // Validação de entrada
    if (!employeeId || !isValidUUID(employeeId)) {
      return NextResponse.json(genericError("ID do funcionário inválido"), { status: 400 })
    }

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json(genericError("Lista de serviços inválida"), { status: 400 })
    }

    // Validar todos os IDs de serviço
    if (serviceIds.length > 0) {
      const allValid = serviceIds.every((id) => typeof id === "string" && isValidUUID(id))
      if (!allValid) {
        return NextResponse.json(genericError("IDs de serviço inválidos"), { status: 400 })
      }

      // Limitar número de serviços por funcionário
      if (serviceIds.length > 50) {
        return NextResponse.json(genericError("Muitos serviços selecionados"), { status: 400 })
      }
    }

    const supabase = await getSupabaseServerClient()

    // Verificar se o funcionário existe
    const { data: employee } = await supabase
      .from("users")
      .select("id")
      .eq("id", employeeId)
      .eq("tipo_usuario", "funcionario")
      .single()

    if (!employee) {
      return NextResponse.json(genericError("Funcionário não encontrado"), { status: 404 })
    }

    // Delete existing associations
    const { error: deleteError } = await supabase.from("funcionario_servicos").delete().eq("funcionario_id", employeeId)

    if (deleteError) {
      secureLog("error", "Erro ao deletar serviços do funcionário", deleteError)
      return NextResponse.json(genericError("Erro ao atualizar serviços"), { status: 500 })
    }

    // Insert new associations
    if (serviceIds.length > 0) {
      const insertData = serviceIds.map((serviceId: string) => ({
        funcionario_id: employeeId,
        servico_id: serviceId,
      }))

      const { error: insertError } = await supabase.from("funcionario_servicos").insert(insertData)

      if (insertError) {
        secureLog("error", "Erro ao inserir serviços do funcionário", insertError)
        return NextResponse.json(genericError("Erro ao atualizar serviços"), { status: 500 })
      }
    }

    secureLog("info", "Serviços do funcionário atualizados com sucesso")
    return NextResponse.json({ success: true })
  } catch (error) {
    secureLog("error", "Erro na API employee-services", error)
    return NextResponse.json(genericError("Erro ao atualizar serviços"), { status: 500 })
  }
}
