import { NextRequest } from "next/server"

// Logger seguro que não expõe dados sensíveis em produção
export function secureLog(level: "info" | "warn" | "error", message: string, data?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[${level.toUpperCase()}] ${message}`, data || "")
  } else if (level === "error") {
    // Em produção, apenas logar erros (sem dados sensíveis)
    console.error(`[ERROR] ${message}`)
  }
}

// Validação de UUID
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== "string") return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Sanitização de strings para prevenir SQL injection
export function sanitizeString(str: string, maxLength: number = 255): string {
  if (!str || typeof str !== "string") return ""
  
  // Remove caracteres perigosos e limita o tamanho
  return str
    .trim()
    .replace(/[<>\"'\\]/g, "") // Remove caracteres perigosos
    .slice(0, maxLength)
}

// Validação de email
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Validação de telefone brasileiro
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, "")
  // Aceita entre 10 e 11 dígitos (com ou sem DDD)
  return cleaned.length >= 10 && cleaned.length <= 11
}

// Validação de data no formato YYYY-MM-DD
export function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateStr)) return false
  
  const date = new Date(dateStr)
  return date instanceof Date && !isNaN(date.getTime())
}

// Validação de horário no formato HH:MM
export function isValidTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== "string") return false
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(timeStr)
}

// Normalização de horário
export function normalizeTime(time: string): string | null {
  if (!time) return null
  time = time.trim()
  
  // HH:MM
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    const [hours, minutes] = time.split(":")
    return `${hours.padStart(2, "0")}:${minutes}`
  }
  
  // HH:MM:SS
  if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(time)) {
    const [hours, minutes] = time.split(":")
    return `${hours.padStart(2, "0")}:${minutes}`
  }
  
  return null
}

// Verificação de API key para webhook
export function verifyWebhookAuth(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "")
  const expectedKey = process.env.WEBHOOK_API_KEY
  
  // Em desenvolvimento, permite sem API key
  if (process.env.NODE_ENV === "development" && !expectedKey) {
    secureLog("warn", "Webhook sem autenticação em desenvolvimento")
    return true
  }
  
  return apiKey === expectedKey && !!expectedKey
}

// Rate limiting simples em memória (para produção, usar Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxRequests) {
    return false
  }
  
  record.count++
  return true
}

// Limpar registros antigos de rate limit periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Limpar a cada minuto

// Obter IP do cliente (considerando proxies)
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIp) {
    return realIp.trim()
  }
  
  return "unknown"
}

// Validação de status de agendamento
export function isValidAppointmentStatus(status: string): boolean {
  return ["pendente", "confirmado", "cancelado", "concluido"].includes(status)
}

// Mensagem de erro genérica para não expor detalhes
export function genericError(message: string = "Erro ao processar solicitação"): { error: string } {
  return { error: message }
}

