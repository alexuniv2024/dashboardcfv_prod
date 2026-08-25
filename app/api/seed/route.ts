import { queryPostgres } from "@/lib/db/postgres";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const email = "admin@dashboard.com";
    const password = "Admin123!";
    const rol = "ADMIN";
    
    // Verificar si ya existe para no duplicar
    const existing = await queryPostgres("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return Response.json({ ok: true, message: "El usuario ya existe, no se hizo nada." });
    }

    // Encriptar contraseña
    const password_hash = await bcrypt.hash(password, 10);
    
    // Insertar en PostgreSQL
    await queryPostgres(
      "INSERT INTO usuarios (email, password_hash, rol, estado) VALUES ($1, $2, $3, true)",
      [email, password_hash, rol]
    );

    return Response.json({ 
      ok: true, 
      message: "¡Éxito! Usuario administrador creado.",
      credentials: { email, password }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}