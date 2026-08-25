import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener notificaciones activas (PENDIENTE y VISTA)
    const result = await queryPostgres(`
      SELECT 
        n.id,
        n.producto_id,
        n.tipo,
        n.mensaje,
        n.estado,
        n.creado_en,
        n.visto_en,
        n.stock_al_momento,
        n.umbral_configurado,
        s.nombre AS nombre_producto,
        s.stock_actual,
        fm.marca_des AS nombre_marca,
        fl.lin_des AS nombre_linea
      FROM notificaciones n
      LEFT JOIN stock_snapshot s ON n.producto_id = s.producto_id
      LEFT JOIN filtro_marcas fm ON s.co_color = fm.co_color
      LEFT JOIN filtro_lineas fl ON s.co_lin = fl.co_lin
      WHERE n.estado IN ('PENDIENTE', 'VISTA')
        AND n.tipo = 'STOCK_BAJO'
      ORDER BY n.creado_en DESC
      LIMIT 50
    `);

    // Contar no vistas (PENDIENTE)
    const countResult = await queryPostgres(`
      SELECT COUNT(*) AS total_no_vistas
      FROM notificaciones
      WHERE estado = 'PENDIENTE'
        AND tipo = 'STOCK_BAJO'
    `);

    return Response.json({
      ok: true,
      data: result.rows,
      total_no_vistas: parseInt(countResult.rows[0].total_no_vistas),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}