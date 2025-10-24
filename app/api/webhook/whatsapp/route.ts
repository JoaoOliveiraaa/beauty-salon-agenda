import { getSupabaseServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

interface WhatsAppWebhookData {
  cliente_nome: string
  cliente_telefone: string
  funcionario_nome?: string
  funcionario_id?: string
  servico_nome?: string
  servico_id?: string
  data_agendamento: string
  hora_agendamento: string
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

function normalizeTimeFormat(time: string): string | null {
  if (!time) return null
  time = time.trim()
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return time
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time)) return time.substring(0, 5)
  if (/^[0-9]:[0-5][0-9]$/.test(time)) return `0${time}`
  if (/^[0-9]:[0-5][0-9]:[0-5][0-9]$/.test(time)) return `0${time.substring(0, 4)}`
  return null
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let data: WhatsAppWebhookData

    console.log("[v0] === WEBHOOK REQUEST DEBUG ===")

    if (searchParams.has("cliente_nome") || searchParams.has("Nome completo do cliente")) {
      data = {
        cliente_nome: searchParams.get("cliente_nome") || searchParams.get("Nome completo do cliente") || "",
        cliente_telefone: searchParams.get("cliente_telefone") || searchParams.get("Telefone com DDD") || "",
        funcionario_nome:
          searchParams.get("funcionario_nome") || searchParams.get("Nome do funcionário (busca parcial)") || undefined,
        funcionario_id: searchParams.get("funcionario_id") || searchParams.get("ID do funcionário (UUID)") || undefined,
        servico_nome:
          searchParams.get("servico_nome") || searchParams.get("Nome do serviço (busca parcial)") || undefined,
        servico_id: searchParams.get("servico_id") || searchParams.get("ID do serviço (UUID)") || undefined,
        data_agendamento: searchParams.get("data_agendamento") || searchParams.get("Formato: YYYY-MM-DD") || "",
        hora_agendamento: searchParams.get("hora_agendamento") || searchParams.get("Formato: HH:MM") || "",
      }
      console.log("[v0] Data source: Query Parameters")
    } else {
      const rawBody = await request.text()
      console.log("[v0] Raw body:", rawBody)
      try {
        data = JSON.parse(rawBody)
        console.log("[v0] Data source: JSON Body")
      } catch (parseError) {
        return NextResponse.json({ error: "Invalid JSON in request body", received: rawBody }, { status: 400 })
      }
    }

    console.log("[v0] Parsed data:", JSON.stringify(data, null, 2))

    const hasClienteNome = data.cliente_nome && data.cliente_nome.trim() !== "" && !data.cliente_nome.includes("{{")
    const hasClienteTelefone =
      data.cliente_telefone && data.cliente_telefone.trim() !== "" && !data.cliente_telefone.includes("{{")
    const hasDataAgendamento =
      data.data_agendamento && data.data_agendamento.trim() !== "" && !data.data_agendamento.includes("{{")
    const hasHoraAgendamento =
      data.hora_agendamento && data.hora_agendamento.trim() !== "" && !data.hora_agendamento.includes("{{")

    if (!hasClienteNome || !hasClienteTelefone || !hasDataAgendamento || !hasHoraAgendamento) {
      const missingFields = []
      if (!hasClienteNome) missingFields.push("cliente_nome")
      if (!hasClienteTelefone) missingFields.push("cliente_telefone")
      if (!hasDataAgendamento) missingFields.push("data_agendamento")
      if (!hasHoraAgendamento) missingFields.push("hora_agendamento")
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}`, received: data },
        { status: 400 },
      )
    }

    const normalizedTime = normalizeTimeFormat(data.hora_agendamento)
    if (!normalizedTime) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM", received: data.hora_agendamento },
        { status: 400 },
      )
    }
    data.hora_agendamento = normalizedTime

    const [hours] = data.hora_agendamento.split(":").map(Number)
    if (hours < 8 || hours >= 20) {
      return NextResponse.json({ error: "Horário fora do expediente (08:00-20:00)" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    let servicoId = data.servico_id

    if (servicoId) {
      if (!isValidUUID(servicoId)) {
        console.log("[v0] Invalid servico_id UUID, will search by name instead:", servicoId)
        servicoId = undefined
      } else {
        console.log("[v0] Valid servico_id UUID:", servicoId)
        // Verify the service exists
        const { data: serviceExists } = await supabase.from("servicos").select("id").eq("id", servicoId).single()

        if (!serviceExists) {
          console.log("[v0] Service UUID not found in database:", servicoId)
          servicoId = undefined
        }
      }
    }

    if (!servicoId && data.servico_nome) {
      console.log("[v0] Looking up servico by name:", data.servico_nome)
      const { data: servico, error } = await supabase
        .from("servicos")
        .select("id")
        .ilike("nome_servico", `%${data.servico_nome}%`)
        .limit(1)
        .single()

      if (error) console.log("[v0] Error finding servico:", error)
      if (servico) {
        servicoId = servico.id
        console.log("[v0] Found servico_id:", servicoId)
      }
    }

    if (!servicoId) {
      console.log("[v0] No servico specified, getting first available")
      const { data: firstService } = await supabase.from("servicos").select("id").limit(1).single()
      if (firstService) {
        servicoId = firstService.id
        console.log("[v0] Using first servico_id:", servicoId)
      }
    }

    if (!servicoId) {
      return NextResponse.json({ error: "Nenhum serviço encontrado" }, { status: 400 })
    }

    let funcionarioId = data.funcionario_id

    if (funcionarioId) {
      if (!isValidUUID(funcionarioId)) {
        console.log("[v0] Invalid funcionario_id UUID, will search by name instead:", funcionarioId)
        funcionarioId = undefined
      } else {
        console.log("[v0] Valid funcionario_id UUID:", funcionarioId)
        // Verify the employee exists
        const { data: employeeExists } = await supabase
          .from("users")
          .select("id")
          .eq("id", funcionarioId)
          .eq("tipo_usuario", "funcionario")
          .single()

        if (!employeeExists) {
          console.log("[v0] Employee UUID not found in database:", funcionarioId)
          funcionarioId = undefined
        }
      }
    }

    if (!funcionarioId && data.funcionario_nome) {
      console.log("[v0] Looking up funcionario by name:", data.funcionario_nome)

      const { data: employeeServices } = await supabase
        .from("funcionario_servicos")
        .select("funcionario_id")
        .eq("servico_id", servicoId)

      const employeeIds = employeeServices?.map((es) => es.funcionario_id) || []
      console.log("[v0] Employees who can perform service:", employeeIds)

      if (employeeIds.length > 0) {
        const { data: funcionario, error } = await supabase
          .from("users")
          .select("id")
          .eq("tipo_usuario", "funcionario")
          .in("id", employeeIds)
          .ilike("nome", `%${data.funcionario_nome}%`)
          .limit(1)
          .single()

        if (error) console.log("[v0] Error finding funcionario:", error)
        if (funcionario) {
          funcionarioId = funcionario.id
          console.log("[v0] Found funcionario_id:", funcionarioId)
        }
      }
    }

    if (funcionarioId && servicoId) {
      console.log("[v0] Validating funcionario can perform service")
      const { data: canPerformService } = await supabase
        .from("funcionario_servicos")
        .select("*")
        .eq("funcionario_id", funcionarioId)
        .eq("servico_id", servicoId)
        .single()

      if (!canPerformService) {
        return NextResponse.json(
          {
            error: "Funcionário não habilitado para este serviço",
            funcionario_id: funcionarioId,
            servico_id: servicoId,
          },
          { status: 400 },
        )
      }
    }

    if (!funcionarioId && servicoId) {
      console.log("[v0] Finding funcionario who can perform service")
      const { data: employeeServices } = await supabase
        .from("funcionario_servicos")
        .select("funcionario_id")
        .eq("servico_id", servicoId)

      const employeeIds = employeeServices?.map((es) => es.funcionario_id) || []

      if (employeeIds.length > 0) {
        const { data: firstStaff } = await supabase
          .from("users")
          .select("id")
          .eq("tipo_usuario", "funcionario")
          .in("id", employeeIds)
          .limit(1)
          .single()

        if (firstStaff) {
          funcionarioId = firstStaff.id
          console.log("[v0] Using first available funcionario_id:", funcionarioId)
        }
      } else {
        return NextResponse.json(
          { error: "Nenhum funcionário habilitado para este serviço", servico_id: servicoId },
          { status: 400 },
        )
      }
    }

    if (!funcionarioId || !servicoId) {
      return NextResponse.json({ error: "Não foi possível determinar funcionário ou serviço" }, { status: 400 })
    }

    const dayOfWeek = new Date(data.data_agendamento).toLocaleDateString("pt-BR", { weekday: "long" })
    const { data: blockedTimes } = await supabase
      .from("disponibilidades")
      .select("*")
      .eq("funcionario_id", funcionarioId)
      .eq("dia_semana", dayOfWeek)

    if (blockedTimes && blockedTimes.length > 0) {
      const requestedTime = data.hora_agendamento
      const isBlocked = blockedTimes.some((blocked) => {
        return requestedTime >= blocked.hora_inicio && requestedTime < blocked.hora_fim
      })

      if (isBlocked) {
        return NextResponse.json({ error: "Funcionário não disponível neste horário" }, { status: 409 })
      }
    }

    const { data: existingAppointment } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("funcionario_id", funcionarioId)
      .eq("data_agendamento", data.data_agendamento)
      .eq("hora_agendamento", data.hora_agendamento)
      .neq("status", "cancelado")
      .single()

    if (existingAppointment) {
      return NextResponse.json({ error: "Horário já agendado" }, { status: 409 })
    }

    console.log("[v0] Creating appointment with:", {
      funcionario_id: funcionarioId,
      servico_id: servicoId,
      cliente_nome: data.cliente_nome,
      data: data.data_agendamento,
      hora: data.hora_agendamento,
    })

    const { data: appointment, error } = await supabase
      .from("agendamentos")
      .insert({
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        funcionario_id: funcionarioId,
        servico_id: servicoId,
        data_agendamento: data.data_agendamento,
        hora_agendamento: data.hora_agendamento,
        status: "pendente",
        pago: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating appointment:", error)
      return NextResponse.json(
        {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          funcionario_id: funcionarioId,
          servico_id: servicoId,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Appointment created successfully:", appointment)
    console.log("[v0] === END WEBHOOK REQUEST ===")

    return NextResponse.json(
      {
        success: true,
        message: "Agendamento criado com sucesso",
        appointment,
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// GET endpoint for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const params = Object.fromEntries(searchParams.entries())

  return NextResponse.json({
    message: "WhatsApp Webhook Endpoint",
    usage: "POST to this endpoint with appointment data from n8n",
    methods: {
      query_params: "Send data as URL query parameters (for n8n)",
      json_body: "Send data as JSON in request body",
    },
    required_fields: ["cliente_nome", "cliente_telefone", "data_agendamento", "hora_agendamento"],
    optional_fields: ["funcionario_nome", "funcionario_id", "servico_nome", "servico_id"],
    uuid_handling: {
      note: "UUIDs can be sent as strings. The system will validate and convert them automatically.",
      fallback: "If UUID is invalid, the system will try to find by name (funcionario_nome or servico_nome)",
    },
    example_with_uuids: {
      funcionario_id: "550e8400-e29b-41d4-a716-446655440000",
      servico_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 99999-9999",
      data_agendamento: "2025-01-20",
      hora_agendamento: "14:00",
    },
    example_with_names: {
      funcionario_nome: "Maria",
      servico_nome: "Corte",
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 99999-9999",
      data_agendamento: "2025-01-20",
      hora_agendamento: "14:00",
    },
    received_params: params,
  })
}
