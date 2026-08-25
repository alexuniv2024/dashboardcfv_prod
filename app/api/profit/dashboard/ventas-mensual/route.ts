import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT 
            MONTH(fec_emis) as mes,
            COUNT(fact_num) as total_facturas,
            ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) as total_ventas_usd
        FROM factura
        WHERE YEAR(fec_emis) = YEAR(GETDATE())
          AND anulada = 0
        GROUP BY MONTH(fec_emis)
        ORDER BY mes ASC
      `);
    });

    return Response.json({
      ok: true,
      data: result.recordset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}