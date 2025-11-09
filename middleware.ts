import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { secureLog } from "@/lib/security"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for API routes, static files, and Next.js internals
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next()
  }

  const user = await getSession()

  // Redirect to login if not authenticated and trying to access protected routes
  if (!user && !pathname.startsWith("/login")) {
    secureLog("info", "Redirecionando para login - não autenticado")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (user && pathname.startsWith("/login")) {
    if (user.tipo_usuario === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    } else {
      return NextResponse.redirect(new URL("/staff", request.url))
    }
  }

  // Role-based access control
  if (user && pathname.startsWith("/admin") && user.tipo_usuario !== "admin") {
    secureLog("warn", "Tentativa de acesso não autorizado à área admin")
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
