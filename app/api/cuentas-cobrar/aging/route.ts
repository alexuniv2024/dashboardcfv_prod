import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (req) => {
      const aging = await req.query(`
        WITH AgingCTE AS (
          SELECT 
            CASE 
              WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN 'Por cobrar'
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 0 AND 30 THEN '0-30 días'
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 31 AND 60 THEN '31-60 días'
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 61 AND 90 THEN '61-90 días'
              WHEN DATEDIFF(day, fec_venc, GETDATE()) > 90 THEN '+90 días'
            END AS rango,
            CASE 
              WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN 0
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 0 AND 30 THEN 1
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 31 AND 60 THEN 2
              WHEN DATEDIFF(day, fec_venc, GETDATE()) BETWEEN 61 AND 90 THEN 3
              WHEN DATEDIFF(day, fec_venc, GETDATE()) > 90 THEN 4
            END AS orden_rango,
            saldo / NULLIF(tasa, 0) AS saldo_usd,
            co_cli
          FROM docum_cc
          WHERE anulado = 0
            AND saldo > 0
        )
        SELECT 
          rango,
          COUNT(*) AS cantidad_documentos,
          COUNT(DISTINCT co_cli) AS cantidad_clientes,
          ISNULL(SUM(saldo_usd), 0) AS saldo_usd,
          orden_rango
        FROM AgingCTE
        GROUP BY rango, orden_rango
        ORDER BY orden_rango
      `);

      return aging.recordset;
    });

    return Response.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}