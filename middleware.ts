import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

  // ============================================
  // CLASIFICAR EL TIPO DE RUTA
  // ============================================
  const isApiRoute = pathname.startsWith("/api/");
  const isLoginPage = pathname === "/login";
  const isRootPage = pathname === "/";

  // Rutas de API protegidas
  const protectedApiPaths = [
    "/api/profit/dashboard",
    "/api/usuarios",
    "/api/inventario",
    "/api/cuentas-pagar",
    "/api/cuentas-cobrar",
    "/api/notificaciones",
    "/api/config-stock",
  ];

  // Rutas de página protegidas
  const protectedPagePaths = ["/dashboard"];

  const isProtectedApi = protectedApiPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isProtectedPage = protectedPagePaths.some((path) =>
    pathname.startsWith(path)
  );

  // ============================================
  // VERIFICAR EL TOKEN
  // ============================================
  let isValidToken = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      isValidToken = true;
    } catch {
      isValidToken = false;
    }
  }

  // ============================================
  // CASO 1: Usuario autenticado visita /login
  // → Redirigir al dashboard (no tiene sentido ver el login si ya entraste)
  // ============================================
  if (isLoginPage && isValidToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ============================================
  // CASO 2: Ruta raíz (/)
  // → Redirigir según autenticación
  // ============================================
  if (isRootPage) {
    if (isValidToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ============================================
  // CASO 3: Página protegida sin token válido
  // → REDIRIGIR al login (NO devolver JSON)
  // ============================================
  if (isProtectedPage && !isValidToken) {
    const loginUrl = new URL("/login", request.url);
    // Guardamos la ruta original para redirigir después del login
    loginUrl.searchParams.set("redirect", pathname);

    // Limpiar la cookie expirada si existe
    const response = NextResponse.redirect(loginUrl);
    if (token) {
      response.cookies.delete("auth_token");
    }
    return response;
  }

  // ============================================
  // CASO 4: API protegida sin token válido
  // → Devolver JSON 401 (el frontend lo maneja)
  // ============================================
  if (isProtectedApi && !isValidToken) {
    return NextResponse.json(
      { ok: false, error: "Sesión expirada. Por favor inicie sesión." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*"],
};