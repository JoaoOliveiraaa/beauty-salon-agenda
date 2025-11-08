import { z } from "zod"

const envSchema = z.object({
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long"),
  WHATSAPP_WEBHOOK_SECRET: z.string().min(1).optional(),
})

export const env = envSchema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET,
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET,
})


