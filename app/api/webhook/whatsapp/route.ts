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

export async function POST(request: NextRequest) {
  try {
    const data: WhatsAppWebhookData = await request.json()

    console.log("[v0] Received WhatsApp webhook data:", data)

    // Validate required fields
    if (!data.cliente_nome || !data.cliente_telefone || !data.data_agendamento || !data.hora_agendamento) {
      return NextResponse.json(
        { error: "Missing required fields: cliente_nome, cliente_telefone, data_agendamento, hora_agendamento" },
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
export async function GET() {
  return NextResponse.json({
    message: "WhatsApp Webhook Endpoint",
    usage: "POST to this endpoint with appointment data from n8n",
    required_fields: ["cliente_nome", "cliente_telefone", "data_agendamento", "hora_agendamento"],
    optional_fields: ["funcionario_nome", "funcionario_id", "servico_nome", "servico_id"],
    example: {
      cliente_nome: "João Silva",
      cliente_telefone: "(11) 99999-9999",
      funcionario_nome: "Maria",
      servico_nome: "Corte",
      data_agendamento: "2025-01-20",
      hora_agendamento: "14:00",
    },
  })
}
