import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: "No hay sesión activa" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Falta JWT_SECRET");

    // Verificamos el token (si expiró, caerá en el catch)
    const decoded = jwt.verify(token, secret) as unknown as { sub: number; email: string; rol: string };

    return NextResponse.json({
      ok: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        rol: decoded.rol,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Sesión inválida o expirada" }, { status: 401 });
  }
}