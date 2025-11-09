import { z } from "zod"

/**
 * Schemas de validação usando Zod para todas as APIs
 */

// Schema para UUID
export const uuidSchema = z.string().uuid("UUID inválido")

// Schema para email
export const emailSchema = z
  .string()
  .email("Email inválido")
  .max(255, "Email muito longo")

// Schema para telefone brasileiro
export const phoneSchema = z
  .string()
  .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone inválido")
  .transform((val) => val.replace(/\D/g, ""))

// Schema para data YYYY-MM-DD
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)")
  .refine((date) => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime())
  }, "Data inválida")

// Schema para horário HH:MM
export const timeSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Horário inválido (use HH:MM)")

// Schema para status de agendamento
export const appointmentStatusSchema = z.enum(
  ["pendente", "confirmado", "cancelado", "concluido"],
  { errorMap: () => ({ message: "Status inválido" }) }
)

// Schema para tipo de usuário
export const userTypeSchema = z.enum(["admin", "funcionario"], {
  errorMap: () => ({ message: "Tipo de usuário inválido" }),
})

// Schema de Login
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(3, "Senha muito curta")
    .max(100, "Senha muito longa"),
})

// Schema de agendamento via webhook
export const webhookAppointmentSchema = z.object({
  cliente_nome: z
    .string()
    .min(3, "Nome do cliente muito curto")
    .max(100, "Nome do cliente muito longo"),
  cliente_telefone: phoneSchema,
  data_agendamento: dateSchema,
  hora_agendamento: timeSchema,
  funcionario_nome: z.string().max(100).optional(),
  funcionario_id: uuidSchema.optional(),
  servico_nome: z.string().max(100).optional(),
  servico_id: uuidSchema.optional(),
})

// Schema de atualização de agendamento
export const updateAppointmentSchema = z.object({
  appointmentId: uuidSchema,
  status: appointmentStatusSchema.optional(),
  pago: z.boolean().optional(),
})

// Schema de atualização de pagamento
export const updatePaymentSchema = z.object({
  appointmentId: uuidSchema,
  pago: z.boolean(),
})

// Schema de despesa
export const expenseSchema = z.object({
  descricao: z
    .string()
    .min(3, "Descrição muito curta")
    .max(255, "Descrição muito longa"),
  valor: z
    .number()
    .positive("Valor deve ser positivo")
    .max(1000000, "Valor muito alto"),
  categoria: z.string().min(2).max(100),
  data: dateSchema,
  observacoes: z.string().max(500).optional().nullable(),
})

// Schema de atualização de despesa
export const updateExpenseSchema = expenseSchema.extend({
  id: uuidSchema,
})

// Schema de serviços de funcionário
export const employeeServicesSchema = z.object({
  employeeId: uuidSchema,
  serviceIds: z
    .array(uuidSchema)
    .max(50, "Muitos serviços selecionados")
    .optional()
    .default([]),
})

// Schema para relatórios
export const reportDateRangeSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

// Schema de período para despesas
export const expensePeriodSchema = z.object({
  period: z.enum(["7", "30", "90", "365", "all"]).default("30"),
})

