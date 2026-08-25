import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.enum(["ADMIN", "GERENTE", "CONSULTOR"]).optional(),
  estado: z.boolean().optional(), // Para activar/desactivar
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    
    if (isNaN(id)) {
      return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return Response.json({ ok: false, error: validation.error.issues }, { status: 400 });
    }

    const { email, password, rol, estado } = validation.data;

    // Construir la consulta SQL dinámicamente según los campos que nos envíen
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (rol !== undefined) {
      updates.push(`rol = $${paramCount++}`);
      values.push(rol);
    }
    if (estado !== undefined) {
      updates.push(`estado = $${paramCount++}`);
      values.push(estado);
    }
    if (password !== undefined && password !== "") {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramCount++}`);
      values.push(password_hash);
    }

    if (updates.length === 0) {
      return Response.json({ ok: false, error: "No hay campos para actualizar" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, email, rol, estado`;

    const result = await queryPostgres(query, values);

    if (result.rows.length === 0) {
      return Response.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    return Response.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}