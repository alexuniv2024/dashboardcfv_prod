import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT 
            co_art AS codigo,
            art_des AS nombre,
            stock_act AS stock_actual,
            stock_min AS stock_minimo
        FROM art
        WHERE stock_act <= stock_min
          AND anulado = 0
          AND stock_act >= 0
        ORDER BY stock_act ASC
      `);
    });

    // Limpiamos los espacios en blanco que Profit suele dejar en los campos CHAR
    const dataLimpia = result.recordset.map((item: any) => ({
      ...item,
      codigo: item.codigo.trim(),
      nombre: item.nombre.trim(),
    }));

    return Response.json({
      ok: true,
      count: dataLimpia.length,
      data: dataLimpia,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}