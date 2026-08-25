import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (req) => {
      const stats = await req.query(`
        SELECT 
          COUNT(*) AS total_documentos,
          COUNT(DISTINCT co_cli) AS total_clientes,
          ISNULL(SUM(saldo / NULLIF(tasa, 0)), 0) AS saldo_total_usd,
          COUNT(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN 1 END) AS documentos_vencidos,
          COUNT(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN 1 END) AS documentos_por_cobrar,
          ISNULL(SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS saldo_vencido_usd,
          ISNULL(SUM(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS saldo_por_cobrar_usd,
          CASE 
            WHEN SUM(saldo / NULLIF(tasa, 0)) = 0 THEN 0
            ELSE (SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END) / SUM(saldo / NULLIF(tasa, 0))) * 100
          END AS porcentaje_vencido,
          MAX(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN DATEDIFF(day, fec_venc, GETDATE()) ELSE 0 END) AS max_dias_mora
        FROM docum_cc
        WHERE anulado = 0
          AND saldo > 0
      `);

      return stats.recordset[0];
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