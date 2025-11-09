import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log("[v0] Middleware checking path:", pathname)

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname.startsWith("/favicon.ico")) {
    console.log("[v0] Skipping middleware for:", pathname)
    return NextResponse.next()
  }

  const user = await getSession()
  console.log("[v0] Session user:", user ? `${user.email} (${user.tipo_usuario})` : "none")

  // Redirect to login if not authenticated and trying to access protected routes
  if (!user && !pathname.startsWith("/login")) {
    console.log("[v0] No session, redirecting to login")
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to dashboard if authenticated and trying to access login
  if (user && pathname.startsWith("/login")) {
    console.log("[v0] User logged in, redirecting to dashboard")
    if (user.tipo_usuario === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    } else {
      return NextResponse.redirect(new URL("/staff", request.url))
    }
  }

  if (user && pathname.startsWith("/admin") && user.tipo_usuario !== "admin") {
    console.log("[v0] Staff user trying to access admin route, blocking")
    return NextResponse.redirect(new URL("/staff", request.url))
  }

  if (user && pathname.startsWith("/staff") && user.tipo_usuario !== "funcionario") {
    console.log("[v0] Admin user trying to access staff route, blocking")
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
