import { cookies } from "next/headers"
import { createHmac, timingSafeEqual } from "crypto"

import { env } from "@/lib/env"

export interface User {
  id: string
  nome: string
  email: string
  tipo_usuario: "admin" | "funcionario"
}

const SESSION_COOKIE_NAME = "session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

interface EncodedSession {
  user: User
  issuedAt: number
}

function signPayload(payload: string): string {
  return createHmac("sha256", env.SESSION_SECRET).update(payload).digest("base64url")
}

function encodeSessionValue(session: EncodedSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

function decodeSessionValue(value: string): User | null {
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null

  const expectedSignature = signPayload(payload)
  const signatureBuffer = Buffer.from(signature, "base64url")
  const expectedBuffer = Buffer.from(expectedSignature, "base64url")

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as EncodedSession
    return decoded.user
  } catch {
    return null
  }
}

async function readSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value
}

export async function createSession(user: User) {
  const cookieStore = await cookies()
  const sessionValue = encodeSessionValue({
    user,
    issuedAt: Date.now(),
  })

  cookieStore.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

export async function getSession(options?: { cookieValue?: string }): Promise<User | null> {
  try {
    const rawValue = options?.cookieValue ?? (await readSessionCookie())
    if (!rawValue) return null

    return decodeSessionValue(rawValue) ?? null
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
}

