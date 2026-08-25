import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Listar usuarios (Solo ADMIN)
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json({ ok: false, error: "No autorizado. Se requiere rol de ADMIN." }, { status: 403 });
  }

  // Traemos todos los usuarios MENOS el password_hash por seguridad
  const result = await queryPostgres(
    "SELECT id, email, rol, estado, creado_en, actualizado_en FROM usuarios ORDER BY id ASC"
  );

  return Response.json({ ok: true, data: result.rows });
}

// POST: Crear usuario (Solo ADMIN)
const createUserSchema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(["ADMIN", "GERENTE", "CONSULTOR"], { message: "Rol inválido" }),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json({ ok: false, error: validation.error.issues }, { status: 400 });
    }

    const { email, password, rol } = validation.data;

    // Verificar si el email ya existe
    const exists = await queryPostgres("SELECT id FROM usuarios WHERE email = $1", [email]);
    if (exists.rows.length > 0) {
      return Response.json({ ok: false, error: "El correo ya está registrado" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await queryPostgres(
      `INSERT INTO usuarios (email, password_hash, rol, estado) 
       VALUES ($1, $2, $3, true) 
       RETURNING id, email, rol, estado`,
      [email, password_hash, rol]
    );

    return Response.json({ ok: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}