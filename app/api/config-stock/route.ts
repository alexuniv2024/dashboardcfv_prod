import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  producto_id: z.string().min(1, "Código de producto requerido"),
  umbral_minimo: z.coerce.number().min(0, "El umbral debe ser mayor o igual a 0"),
  activo: z.boolean().default(true),
});

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || user.rol !== "ADMIN") {
    return Response.json(
      { ok: false, error: "Solo administradores pueden configurar umbrales" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const validation = createSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { ok: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const { producto_id, umbral_minimo, activo } = validation.data;

    // Verificar que el producto existe en el snapshot
    const snapshotCheck = await queryPostgres(
      "SELECT producto_id FROM stock_snapshot WHERE producto_id = $1",
      [producto_id]
    );

    if (snapshotCheck.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Producto no encontrado en el snapshot" },
        { status: 404 }
      );
    }

    // Verificar si ya existe configuración
    const existing = await queryPostgres(
      "SELECT id FROM config_stock WHERE producto_id = $1",
      [producto_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await queryPostgres(
        `UPDATE config_stock 
         SET umbral_minimo = $1, activo = $2, actualizado_en = NOW()
         WHERE producto_id = $3
         RETURNING *`,
        [umbral_minimo, activo, producto_id]
      );
    } else {
      result = await queryPostgres(
        `INSERT INTO config_stock (producto_id, umbral_minimo, activo, creado_en, actualizado_en)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [producto_id, umbral_minimo, activo]
      );
    }

    return Response.json({
      ok: true,
      data: result.rows[0],
      message: "Configuración guardada exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}