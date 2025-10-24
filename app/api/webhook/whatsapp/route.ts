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

  // Remove extra whitespace
  time = time.trim()

  // If already in HH:MM format, return as is
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return time
  }

  // If in HH:MM:SS format, remove seconds
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time)) {
    return time.substring(0, 5)
  }

  // If in H:MM format (single digit hour), add leading zero
  if (/^[0-9]:[0-5][0-9]$/.test(time)) {
    return `0${time}`
  }

  // If in H:MM:SS format, normalize
  if (/^[0-9]:[0-5][0-9]:[0-5][0-9]$/.test(time)) {
    return `0${time.substring(0, 4)}`
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let data: WhatsAppWebhookData

    console.log("[v0] === WEBHOOK REQUEST DEBUG ===")
    console.log("[v0] Method:", request.method)
    console.log("[v0] URL:", request.url)
    console.log("[v0] Headers:", Object.fromEntries(request.headers.entries()))
    console.log("[v0] Query Params:", Object.fromEntries(searchParams.entries()))

    // Try to get data from query parameters first (for n8n)
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
      // Fall back to JSON body
      const rawBody = await request.text()
      console.log("[v0] Raw body:", rawBody)

      try {
        data = JSON.parse(rawBody)
        console.log("[v0] Data source: JSON Body")
      } catch (parseError) {
        console.error("[v0] JSON parse error:", parseError)
        return NextResponse.json(
          {
            error: "Invalid JSON in request body",
            received: rawBody,
            hint: "Make sure you're sending valid JSON with Content-Type: application/json",
          },
          { status: 400 },
        )
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

    console.log("[v0] Field validation:", {
      hasClienteNome,
      hasClienteTelefone,
      hasDataAgendamento,
      hasHoraAgendamento,
    })

    // Validate required fields
    if (!hasClienteNome || !hasClienteTelefone || !hasDataAgendamento || !hasHoraAgendamento) {
      const missingFields = []
      if (!hasClienteNome) missingFields.push("cliente_nome")
      if (!hasClienteTelefone) missingFields.push("cliente_telefone")
      if (!hasDataAgendamento) missingFields.push("data_agendamento")
      if (!hasHoraAgendamento) missingFields.push("hora_agendamento")

      return NextResponse.json(
        {
          error: `Missing or invalid required fields: ${missingFields.join(", ")}`,
          received: data,
          hint: "Check if n8n expressions like {{ $json.nome }} are being evaluated correctly. They should contain actual values, not the expression syntax.",
        },
        { status: 400 },
      )
    }

    const normalizedTime = normalizeTimeFormat(data.hora_agendamento)

    if (!normalizedTime) {
      return NextResponse.json(
        {
          error: "Invalid time format. Use HH:MM format (e.g., 14:00)",
          received: data.hora_agendamento,
          hint: "Accepted formats: HH:MM, HH:MM:SS, H:MM",
        },
        { status: 400 },
      )
    }

    data.hora_agendamento = normalizedTime

    const [hours] = data.hora_agendamento.split(":").map(Number)
    if (hours < 8 || hours >= 20) {
      return NextResponse.json(
        { error: "Horário fora do expediente. Horário de funcionamento: 08:00 às 20:00" },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseServerClient()

    let servicoId = data.servico_id

    // Validate UUID format if provided
    if (servicoId && !isValidUUID(servicoId)) {
      console.log("[v0] Invalid servico_id UUID format:", servicoId)
      servicoId = undefined // Will try to find by name instead
    }

    if (!servicoId && data.servico_nome) {
      console.log("[v0] Looking up servico by name:", data.servico_nome)
      const { data: servico, error } = await supabase
        .from("servicos")
        .select("id")
        .ilike("nome_servico", `%${data.servico_nome}%`)
        .limit(1)
        .single()

      if (error) {
        console.log("[v0] Error finding servico:", error)
      }

      if (servico) {
        servicoId = servico.id
        console.log("[v0] Found servico_id:", servicoId)
      }
    }

    // If no servico specified, get the first one
    if (!servicoId) {
      console.log("[v0] No servico specified, getting first available")
      const { data: firstService } = await supabase.from("servicos").select("id").limit(1).single()

      if (firstService) {
        servicoId = firstService.id
        console.log("[v0] Using first servico_id:", servicoId)
      }
    }

    if (!servicoId) {
      return NextResponse.json(
        {
          error: "Nenhum serviço encontrado",
          hint: "Cadastre serviços no painel admin ou forneça um servico_id válido",
        },
        { status: 400 },
      )
    }

    let funcionarioId = data.funcionario_id

    // Validate UUID format if provided
    if (funcionarioId && !isValidUUID(funcionarioId)) {
      console.log("[v0] Invalid funcionario_id UUID format:", funcionarioId)
      funcionarioId = undefined // Will try to find by name instead
    }

    // If funcionario_nome is provided but not funcionario_id, look it up
    if (!funcionarioId && data.funcionario_nome) {
      console.log("[v0] Looking up funcionario by name:", data.funcionario_nome)

      // First get employees who can perform this service
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

        if (error) {
          console.log("[v0] Error finding funcionario:", error)
        }

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
            error: "O funcionário selecionado não está habilitado para realizar este serviço",
            funcionario_id: funcionarioId,
            servico_id: servicoId,
            hint: "Configure os serviços do funcionário no painel admin em Funcionários > Gerenciar Serviços",
          },
          { status: 400 },
        )
      }
    }

    // If no funcionario specified, find one who can perform the service
    if (!funcionarioId && servicoId) {
      console.log("[v0] No funcionario specified, finding one who can perform service")
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
          {
            error: "Nenhum funcionário está habilitado para realizar este serviço",
            servico_id: servicoId,
            hint: "Configure os serviços dos funcionários no painel admin",
          },
          { status: 400 },
        )
      }
    }

    if (!funcionarioId || !servicoId) {
      return NextResponse.json(
        {
          error: "Não foi possível determinar funcionário ou serviço",
          funcionario_id: funcionarioId,
          servico_id: servicoId,
        },
        { status: 400 },
      )
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
        return NextResponse.json(
          { error: "Funcionário não está disponível neste horário (horário bloqueado)" },
          { status: 409 },
        )
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
      return NextResponse.json(
        { error: "Já existe um agendamento para este funcionário neste horário" },
        { status: 409 },
      )
    }

    // Create the appointment
    const { data: appointment, error } = await supabase
      .from("agendamentos")
      .insert({
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        funcionario_id: funcionarioId, // Supabase will cast string to UUID
        servico_id: servicoId, // Supabase will cast string to UUID
        data_agendamento: data.data_agendamento,
        hora_agendamento: data.hora_agendamento,
        status: "pendente",
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
    example_query_params:
      "?cliente_nome=João Silva&cliente_telefone=(11) 99999-9999&data_agendamento=2025-01-20&hora_agendamento=14:00",
    example_json_body: {
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 99999-9999",
      funcionario_nome: "Maria",
      servico_nome: "Corte",
      data_agendamento: "2025-01-20",
      hora_agendamento: "14:00",
    },
    received_params: params,
  })
}
