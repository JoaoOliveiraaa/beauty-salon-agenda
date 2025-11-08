import { NextResponse, type NextRequest } from "next/server"

import { getSession } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get("session")?.value
  const user = await getSession({ cookieValue: sessionCookie })

  if (!user && !pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && pathname.startsWith("/login")) {
    const target = user.tipo_usuario === "admin" ? "/admin" : "/staff"
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (user && pathname.startsWith("/admin") && user.tipo_usuario !== "admin") {
    return NextResponse.redirect(new URL("/staff", request.url))
  }

  if (user && pathname.startsWith("/staff") && user.tipo_usuario !== "funcionario") {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

