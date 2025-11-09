import { getSupabaseServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"
import {
  secureLog,
  isValidUUID,
  sanitizeString,
  isValidPhone,
  isValidDate,
  normalizeTime,
  verifyWebhookAuth,
  checkRateLimit,
  getClientIp,
  genericError,
} from "@/lib/security"

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

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    if (!verifyWebhookAuth(request)) {
      secureLog("warn", "Tentativa de acesso não autorizado ao webhook")
      return NextResponse.json(genericError("Não autorizado"), { status: 401 })
    }

    // Rate limiting
    const clientIp = getClientIp(request)
    if (!checkRateLimit(`webhook:${clientIp}`, 30, 60000)) {
      secureLog("warn", "Rate limit excedido", { ip: clientIp })
      return NextResponse.json(genericError("Muitas requisições. Tente novamente mais tarde."), { status: 429 })
    }

    const searchParams = request.nextUrl.searchParams
    let data: WhatsAppWebhookData

    secureLog("info", "Webhook request recebido")

    if (searchParams.has("cliente_nome") || searchParams.has("Nome completo do cliente")) {
      data = {
        cliente_nome: sanitizeString(
          searchParams.get("cliente_nome") || searchParams.get("Nome completo do cliente") || "",
          100,
        ),
        cliente_telefone: sanitizeString(
          searchParams.get("cliente_telefone") || searchParams.get("Telefone com DDD") || "",
          20,
        ),
        funcionario_nome: sanitizeString(
          searchParams.get("funcionario_nome") || searchParams.get("Nome do funcionário (busca parcial)") || "",
          100,
        ) || undefined,
        funcionario_id: sanitizeString(
          searchParams.get("funcionario_id") || searchParams.get("ID do funcionário (UUID)") || "",
          36,
        ) || undefined,
        servico_nome: sanitizeString(
          searchParams.get("servico_nome") || searchParams.get("Nome do serviço (busca parcial)") || "",
          100,
        ) || undefined,
        servico_id: sanitizeString(
          searchParams.get("servico_id") || searchParams.get("ID do serviço (UUID)") || "",
          36,
        ) || undefined,
        data_agendamento: sanitizeString(
          searchParams.get("data_agendamento") || searchParams.get("Formato: YYYY-MM-DD") || "",
          10,
        ),
        hora_agendamento: sanitizeString(
          searchParams.get("hora_agendamento") || searchParams.get("Formato: HH:MM") || "",
          5,
        ),
      }
      secureLog("info", "Data source: Query Parameters")
    } else {
      const rawBody = await request.text()
      if (rawBody.length > 10000) {
        return NextResponse.json(genericError("Payload muito grande"), { status: 413 })
      }
      
      try {
        const parsed = JSON.parse(rawBody)
        data = {
          cliente_nome: sanitizeString(parsed.cliente_nome, 100),
          cliente_telefone: sanitizeString(parsed.cliente_telefone, 20),
          funcionario_nome: sanitizeString(parsed.funcionario_nome, 100) || undefined,
          funcionario_id: sanitizeString(parsed.funcionario_id, 36) || undefined,
          servico_nome: sanitizeString(parsed.servico_nome, 100) || undefined,
          servico_id: sanitizeString(parsed.servico_id, 36) || undefined,
          data_agendamento: sanitizeString(parsed.data_agendamento, 10),
          hora_agendamento: sanitizeString(parsed.hora_agendamento, 5),
        }
        secureLog("info", "Data source: JSON Body")
      } catch (parseError) {
        return NextResponse.json(genericError("JSON inválido"), { status: 400 })
      }
    }

    secureLog("info", "Dados recebidos validados")

    // Validar campos obrigatórios
    if (!data.cliente_nome || data.cliente_nome.trim() === "" || data.cliente_nome.length < 3) {
      return NextResponse.json(genericError("Nome do cliente inválido"), { status: 400 })
    }

    if (!isValidPhone(data.cliente_telefone)) {
      return NextResponse.json(genericError("Telefone do cliente inválido"), { status: 400 })
    }

    if (!isValidDate(data.data_agendamento)) {
      return NextResponse.json(genericError("Data de agendamento inválida"), { status: 400 })
    }

    const normalizedTime = normalizeTime(data.hora_agendamento)
    if (!normalizedTime) {
      return NextResponse.json(genericError("Horário inválido. Use formato HH:MM"), { status: 400 })
    }
    data.hora_agendamento = normalizedTime

    // Validar se a data não é no passado
    const appointmentDate = new Date(data.data_agendamento)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (appointmentDate < today) {
      return NextResponse.json(genericError("Data de agendamento não pode ser no passado"), { status: 400 })
    }

    const [hours] = data.hora_agendamento.split(":").map(Number)
    if (hours < 8 || hours >= 20) {
      return NextResponse.json({ error: "Horário fora do expediente (08:00-20:00)" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    let servicoId = data.servico_id

    if (servicoId) {
      if (!isValidUUID(servicoId)) {
        secureLog("info", "UUID do serviço inválido, buscando por nome")
        servicoId = undefined
      } else {
        const { data: serviceExists } = await supabase.from("servicos").select("id").eq("id", servicoId).single()

        if (!serviceExists) {
          secureLog("info", "Serviço não encontrado com UUID fornecido")
          servicoId = undefined
        }
      }
    }

    if (!servicoId && data.servico_nome) {
      // Sanitizar nome do serviço para busca segura
      const safeServiceName = sanitizeString(data.servico_nome, 100)
      const { data: servico } = await supabase
        .from("servicos")
        .select("id")
        .ilike("nome_servico", `%${safeServiceName}%`)
        .limit(1)
        .single()

      if (servico) {
        servicoId = servico.id
      }
    }

    if (!servicoId) {
      const { data: firstService } = await supabase.from("servicos").select("id").limit(1).single()
      if (firstService) {
        servicoId = firstService.id
      }
    }

    if (!servicoId) {
      return NextResponse.json(genericError("Nenhum serviço encontrado"), { status: 400 })
    }

    let funcionarioId = data.funcionario_id

    if (funcionarioId) {
      if (!isValidUUID(funcionarioId)) {
        secureLog("info", "UUID do funcionário inválido, buscando por nome")
        funcionarioId = undefined
      } else {
        const { data: employeeExists } = await supabase
          .from("users")
          .select("id")
          .eq("id", funcionarioId)
          .eq("tipo_usuario", "funcionario")
          .single()

        if (!employeeExists) {
          secureLog("info", "Funcionário não encontrado com UUID fornecido")
          funcionarioId = undefined
        }
      }
    }

    if (!funcionarioId && data.funcionario_nome) {
      const { data: employeeServices } = await supabase
        .from("funcionario_servicos")
        .select("funcionario_id")
        .eq("servico_id", servicoId)

      const employeeIds = employeeServices?.map((es) => es.funcionario_id) || []

      if (employeeIds.length > 0) {
        // Sanitizar nome do funcionário para busca segura
        const safeEmployeeName = sanitizeString(data.funcionario_nome, 100)
        const { data: funcionario } = await supabase
          .from("users")
          .select("id")
          .eq("tipo_usuario", "funcionario")
          .in("id", employeeIds)
          .ilike("nome", `%${safeEmployeeName}%`)
          .limit(1)
          .single()

        if (funcionario) {
          funcionarioId = funcionario.id
        }
      }
    }

    if (funcionarioId && servicoId) {
      const { data: canPerformService } = await supabase
        .from("funcionario_servicos")
        .select("*")
        .eq("funcionario_id", funcionarioId)
        .eq("servico_id", servicoId)
        .single()

      if (!canPerformService) {
        return NextResponse.json(genericError("Funcionário não habilitado para este serviço"), { status: 400 })
      }
    }

    if (!funcionarioId && servicoId) {
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
        }
      } else {
        return NextResponse.json(genericError("Nenhum funcionário habilitado para este serviço"), { status: 400 })
      }
    }

    if (!funcionarioId || !servicoId) {
      return NextResponse.json(genericError("Não foi possível determinar funcionário ou serviço"), { status: 400 })
    }

    const appointmentDate = new Date(data.data_agendamento)
    const dayOfWeek = appointmentDate.getDay()

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
        return NextResponse.json(genericError("Funcionário não disponível neste horário"), { status: 409 })
      }
    }

    const { data: existingAppointment } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("funcionario_id", funcionarioId)
      .eq("data_agendamento", data.data_agendamento)
      .eq("hora_agendamento", data.hora_agendamento)
      .neq("status", "cancelado")
      .single()

    if (existingAppointment) {
      return NextResponse.json(genericError("Horário já agendado"), { status: 409 })
    }

    secureLog("info", "Criando agendamento")

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
      secureLog("error", "Erro ao criar agendamento", error)
      return NextResponse.json(genericError("Erro ao criar agendamento"), { status: 500 })
    }

    secureLog("info", "Agendamento criado com sucesso")

    return NextResponse.json(
      {
        success: true,
        message: "Agendamento criado com sucesso",
        appointment: {
          id: appointment.id,
          status: appointment.status,
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    secureLog("error", "Erro no webhook", error)
    return NextResponse.json(genericError("Erro interno do servidor"), { status: 500 })
  }
}

// GET endpoint for testing and documentation
export async function GET(request: NextRequest) {
  // Em produção, pode-se desabilitar ou proteger este endpoint
  if (process.env.NODE_ENV === "production" && !verifyWebhookAuth(request)) {
    return NextResponse.json(genericError("Não autorizado"), { status: 401 })
  }

  return NextResponse.json({
    message: "WhatsApp Webhook Endpoint",
    usage: "POST to this endpoint with appointment data from n8n",
    authentication: {
      header: "x-api-key or Authorization: Bearer <token>",
      note: "Set WEBHOOK_API_KEY environment variable",
    },
    methods: {
      query_params: "Send data as URL query parameters (for n8n)",
      json_body: "Send data as JSON in request body",
    },
    required_fields: ["cliente_nome", "cliente_telefone", "data_agendamento", "hora_agendamento"],
    optional_fields: ["funcionario_nome", "funcionario_id", "servico_nome", "servico_id"],
    validation: {
      cliente_nome: "Min 3 chars, max 100 chars",
      cliente_telefone: "Brazilian phone format (10-11 digits)",
      data_agendamento: "YYYY-MM-DD format, not in the past",
      hora_agendamento: "HH:MM format, between 08:00-20:00",
    },
    rate_limit: "30 requests per minute per IP",
    example: {
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 99999-9999",
      data_agendamento: "2025-01-20",
      hora_agendamento: "14:00",
      servico_nome: "Corte",
      funcionario_nome: "Maria",
    },
  })
}
