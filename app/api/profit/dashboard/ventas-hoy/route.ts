import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT 
            COUNT(fact_num) AS total_facturas,
            ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) AS total_ventas_usd,
            ISNULL(SUM(iva / NULLIF(tasa, 0)), 0) AS total_iva_usd
        FROM factura
        WHERE CAST(fec_emis AS DATE) = CAST(GETDATE() AS DATE)
          AND anulada = 0
      `);
    });

    return Response.json({
      ok: true,
      data: result.recordset[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}