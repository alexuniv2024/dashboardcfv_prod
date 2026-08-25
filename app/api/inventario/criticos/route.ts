import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await queryPostgres(`
      SELECT 
        s.producto_id,
        s.nombre,
        s.stock_actual,
        s.stock_min_profit,
        c.umbral_minimo,
        c.ultima_alerta,
        fl.lin_des AS nombre_linea,
        fsl.subl_des AS nombre_sub_linea,
        fm.marca_des AS nombre_marca,
        fp.prov_des AS nombre_proveedor,
        CASE 
          WHEN s.stock_actual <= 0 THEN 'sin_stock'
          WHEN s.stock_actual <= c.umbral_minimo THEN 'critico'
          WHEN s.stock_actual <= (c.umbral_minimo * 1.5) THEN 'advertencia'
          ELSE 'normal'
        END AS estado
      FROM stock_snapshot s
      INNER JOIN config_stock c ON s.producto_id = c.producto_id
      LEFT JOIN filtro_lineas fl ON s.co_lin = fl.co_lin
      LEFT JOIN filtro_sub_lineas fsl ON s.co_subl = fsl.co_subl
      LEFT JOIN filtro_marcas fm ON s.co_color = fm.co_color
      LEFT JOIN filtro_proveedores fp ON s.co_prov = fp.co_prov
      WHERE c.activo = TRUE
        AND s.stock_actual <= c.umbral_minimo
      ORDER BY 
        CASE 
          WHEN s.stock_actual <= 0 THEN 1
          WHEN s.stock_actual <= c.umbral_minimo THEN 2
          ELSE 3
        END,
        s.stock_actual ASC
    `);

    // Calcular estadísticas
    const stats = {
      total_criticos: result.rows.length,
      sin_stock: result.rows.filter((r) => r.estado === "sin_stock").length,
      criticos: result.rows.filter((r) => r.estado === "critico").length,
    };

    return Response.json({
      ok: true,
      data: result.rows,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}