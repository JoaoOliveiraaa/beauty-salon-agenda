import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { createSession } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { secureLog, checkRateLimit, getClientIp, genericError } from "@/lib/security"
import { loginSchema } from "@/lib/schemas"

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    
    // Rate limiting: máximo 5 tentativas de login por minuto por IP
    if (!checkRateLimit(`login:${clientIp}`, 5, 60000)) {
      secureLog("warn", "Rate limit de login excedido", { ip: clientIp })
      return NextResponse.json(
        genericError("Muitas tentativas de login. Tente novamente em 1 minuto."), 
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validação com Zod
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Dados inválidos"
      return NextResponse.json(genericError(errorMessage), { status: 400 })
    }

    const { email, password } = validationResult.data

    secureLog("info", "Tentativa de login")

    const supabase = await getSupabaseServerClient()

    // Get user from database - apenas campos necessários
    const { data: user, error } = await supabase
      .from("users")
      .select("id, nome, email, senha, tipo_usuario")
      .eq("email", email)
      .single()

    if (error || !user) {
      secureLog("info", "Usuário não encontrado")
      // Usar mensagem genérica para não expor se o email existe
      return NextResponse.json(genericError("Credenciais inválidas"), { status: 401 })
    }

    // Check if password is bcrypt hash or plain text
    const isBcryptHash = user.senha?.startsWith("$2a$") || user.senha?.startsWith("$2b$")
    let isValidPassword = false

    if (isBcryptHash) {
      // Use bcrypt comparison for hashed passwords
      isValidPassword = await bcrypt.compare(password, user.senha)
    } else {
      // Fallback to plain text comparison (não recomendado em produção)
      isValidPassword = password === user.senha
    }

    if (!isValidPassword) {
      secureLog("info", "Senha inválida")
      return NextResponse.json(genericError("Credenciais inválidas"), { status: 401 })
    }

    // Create session
    await createSession({
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
    })

    secureLog("info", "Login realizado com sucesso")

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
    secureLog("error", "Erro no login", error)
    return NextResponse.json(genericError("Erro ao fazer login"), { status: 500 })
  }
}
