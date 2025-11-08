import { timingSafeEqual } from "node:crypto"

import bcrypt from "bcryptjs"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createSession } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createServerClient } from "@/lib/supabase-server"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
})

function isBcryptHash(value: string | null | undefined) {
  return typeof value === "string" && /^\$2[aby]\$/.test(value)
}

function safePlaintextCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)
  if (aBuffer.length !== bBuffer.length) {
    return false
  }
  return timingSafeEqual(aBuffer, bBuffer)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 400 })
    }

    const { email, password } = parsed.data

    const supabase = createServerClient()

    const { data: user, error } = await supabase
      .from("users")
      .select("id, nome, email, senha, tipo_usuario")
      .eq("email", email)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    const storedPassword = user.senha ?? ""

    let isValidPassword = false
    let shouldRehashPassword = false

    if (isBcryptHash(storedPassword)) {
      isValidPassword = await bcrypt.compare(password, storedPassword)
    } else if (storedPassword.length > 0 && safePlaintextCompare(password, storedPassword)) {
      isValidPassword = true
      shouldRehashPassword = true
    }

    if (!isValidPassword) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    if (shouldRehashPassword) {
      const newHash = await bcrypt.hash(password, 12)
      await supabase.from("users").update({ senha: newHash }).eq("id", user.id)
    }

    await createSession({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
      },
    })
  } catch (error) {
    logger.error("auth.login.unexpected_error", { error })
    return NextResponse.json({ error: "Erro ao fazer login" }, { status: 500 })
  }
}

