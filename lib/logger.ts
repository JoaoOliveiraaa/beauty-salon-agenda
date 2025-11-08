type Primitive = string | number | boolean | null | undefined

const SENSITIVE_KEYS = new Set([
  "senha",
  "password",
  "token",
  "secret",
  "authorization",
  "session",
  "cookie",
  "email",
  "telefone",
  "phone",
])

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]"
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    }
  }

  if (value === null || typeof value !== "object") {
    return value as Primitive
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1))
  }

  const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      return [key, "[REDACTED]"] as const
    }

    return [key, sanitizeValue(nested, depth + 1)] as const
  })

  return Object.fromEntries(entries)
}

function formatContext(context?: Record<string, unknown>) {
  if (!context) return undefined
  return sanitizeValue(context)
}

function log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>) {
  const payload = formatContext(context)
  const time = new Date().toISOString()

  if (payload) {
    // eslint-disable-next-line no-console
    console[level](`[${time}] ${message}`, payload)
  } else {
    // eslint-disable-next-line no-console
    console[level](`[${time}] ${message}`)
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    log("info", message, context)
  },
  warn(message: string, context?: Record<string, unknown>) {
    log("warn", message, context)
  },
  error(message: string, context?: Record<string, unknown>) {
    log("error", message, context)
  },
}


