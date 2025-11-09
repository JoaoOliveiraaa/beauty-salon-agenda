import { cookies } from "next/headers"

export interface User {
  id: string
  nome: string
  email: string
  tipo_usuario: "admin" | "funcionario"
}

export async function createSession(user: User) {
  const cookieStore = await cookies()
  const sessionData = JSON.stringify({
    id: user.id,
    nome: user.nome,
    email: user.email,
    tipo_usuario: user.tipo_usuario,
  })

  cookieStore.set("session", sessionData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")

    if (!session) return null

    return JSON.parse(session.value) as User
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
