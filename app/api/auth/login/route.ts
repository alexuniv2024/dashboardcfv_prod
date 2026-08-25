import { queryPostgres } from "@/lib/db/postgres";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ ok: false, error: "Email y password son requeridos" }, { status: 400 });
    }

    // 1. Buscar usuario en PostgreSQL
    const result = await queryPostgres(
      "SELECT id, email, password_hash, rol, estado FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
    }

    const user = result.rows[0];

    // 2. Verificar si está activo
    if (!user.estado) {
      return Response.json({ ok: false, error: "Usuario inactivo. Contacte al administrador." }, { status: 403 });
    }

    // 3. Comparar contraseñas
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
    }

    // 4. Generar JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Falta JWT_SECRET en .env.local");

    const token = jwt.sign(
      { 
        sub: user.id, 
        email: user.email, 
        rol: user.rol 
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "30m" } as jwt.SignOptions
    );

    // 5. Guardar en Cookie HttpOnly
    // Nota: En Next.js 15 cookies() es async
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: false, // En local es false, en Vercel será true
      sameSite: "lax",
      maxAge: 60 * 30, // 30 minutos en segundos
      path: "/",
    });

    // 6. Responder al Frontend (Sin enviar el token en el body, ya va en la cookie)
    return Response.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}