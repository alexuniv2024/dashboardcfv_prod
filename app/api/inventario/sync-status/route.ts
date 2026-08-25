import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await queryPostgres(`
      SELECT 
        COUNT(*) AS total_productos,
        MAX(ultima_sync) AS ultima_sincronizacion,
        COUNT(CASE WHEN stock_actual <= 0 THEN 1 END) AS productos_sin_stock,
        COUNT(CASE WHEN stock_actual > 0 AND stock_actual <= stock_min_profit THEN 1 END) AS productos_bajo_minimo
      FROM stock_snapshot
    `);

    const data = result.rows[0];

    return Response.json({
      ok: true,
      data: {
        total_productos: parseInt(data.total_productos),
        ultima_sincronizacion: data.ultima_sincronizacion,
        productos_sin_stock: parseInt(data.productos_sin_stock),
        productos_bajo_minimo: parseInt(data.productos_bajo_minimo),
        tiene_datos: parseInt(data.total_productos) > 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}