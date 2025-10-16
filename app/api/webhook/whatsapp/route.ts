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
    } else {
      // Fall back to JSON body
      data = await request.json()
    }

    console.log("[v0] Received WhatsApp webhook data:", data)

    // Validate required fields
    if (!data.cliente_nome || !data.cliente_telefone || !data.data_agendamento || !data.hora_agendamento) {
      return NextResponse.json(
        { error: "Missing required fields: cliente_nome, cliente_telefone, data_agendamento, hora_agendamento" },
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

    // If funcionario_nome is provided but not funcionario_id, look it up
    let funcionarioId = data.funcionario_id
    if (!funcionarioId && data.funcionario_nome) {
      const { data: funcionario } = await supabase
        .from("users")
        .select("id")
        .eq("tipo_usuario", "funcionario")
        .ilike("nome", `%${data.funcionario_nome}%`)
        .single()

      if (funcionario) {
        funcionarioId = funcionario.id
      }
    }

    // If servico_nome is provided but not servico_id, look it up
    let servicoId = data.servico_id
    if (!servicoId && data.servico_nome) {
      const { data: servico } = await supabase
        .from("servicos")
        .select("id")
        .ilike("nome_servico", `%${data.servico_nome}%`)
        .single()

      if (servico) {
        servicoId = servico.id
      }
    }

    // If no funcionario specified, get the first available one
    if (!funcionarioId) {
      const { data: firstStaff } = await supabase
        .from("users")
        .select("id")
        .eq("tipo_usuario", "funcionario")
        .limit(1)
        .single()

      if (firstStaff) {
        funcionarioId = firstStaff.id
      }
    }

    // If no servico specified, get the first one
    if (!servicoId) {
      const { data: firstService } = await supabase.from("servicos").select("id").limit(1).single()

      if (firstService) {
        servicoId = firstService.id
      }
    }

    if (!funcionarioId || !servicoId) {
      return NextResponse.json({ error: "Could not determine funcionario or servico" }, { status: 400 })
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
        funcionario_id: funcionarioId,
        servico_id: servicoId,
        data_agendamento: data.data_agendamento,
        hora_agendamento: data.hora_agendamento,
        status: "pendente",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating appointment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Appointment created successfully:", appointment)

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
