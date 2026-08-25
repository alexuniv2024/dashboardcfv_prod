import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  umbral_minimo: z.coerce.number().min(0, "El umbral debe ser mayor o igual a 0").optional(),
  activo: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json(
      { ok: false, error: "Solo administradores" },
      { status: 403 }
    );
  }

  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { ok: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const { umbral_minimo, activo } = validation.data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (umbral_minimo !== undefined) {
      paramCount++;
      updates.push(`umbral_minimo = $${paramCount}`);
      values.push(umbral_minimo);
    }

    if (activo !== undefined) {
      paramCount++;
      updates.push(`activo = $${paramCount}`);
      values.push(activo);
    }

    if (updates.length === 0) {
      return Response.json(
        { ok: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    paramCount++;
    updates.push(`actualizado_en = NOW()`);
    values.push(id);

    const query = `UPDATE config_stock SET ${updates.join(
      ", "
    )} WHERE id = $${paramCount} RETURNING *`;

    const result = await queryPostgres(query, values);

    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      data: result.rows[0],
      message: "Configuración actualizada",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json(
      { ok: false, error: "Solo administradores" },
      { status: 403 }
    );
  }

  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return Response.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const result = await queryPostgres(
      `UPDATE config_stock 
       SET activo = FALSE, actualizado_en = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Configuración no encontrada" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      message: "Monitoreo desactivado",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}