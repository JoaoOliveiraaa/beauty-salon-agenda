import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { createSession } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log("[v0] Login attempt for email:", email)

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Get user from database
    const { data: user, error } = await supabase.from("users").select("*").eq("email", email).single()

    console.log("[v0] User found:", !!user)
    console.log("[v0] User data:", user ? { email: user.email, senha_length: user.senha?.length } : null)

    if (error || !user) {
      console.log("[v0] User not found or error:", error)
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    // Compare password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.senha)

    console.log("[v0] Password comparison:", {
      input: password,
      storedHash: user.senha?.substring(0, 20) + "...",
      match: isValidPassword,
    })

    if (!isValidPassword) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 })
    }

    // Create session
    await createSession({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
    })

    console.log("[v0] Session created successfully")

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
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Erro ao fazer login" }, { status: 500 })
  }
}
