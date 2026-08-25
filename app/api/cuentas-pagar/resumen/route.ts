import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (req) => {
      // ============================================
      // 1. LISTADO: Cuentas vencidas + próximas 7 días
      // ============================================
      const listado = await req.query(`
        SELECT 
          LTRIM(RTRIM(d.tipo_doc)) AS tipo_doc,
          d.nro_doc,
          LTRIM(RTRIM(d.co_cli)) AS co_prov,
          LTRIM(RTRIM(p.prov_des)) AS nombre_proveedor,
          d.fec_emis,
          d.fec_venc,
          d.tasa,
          LTRIM(RTRIM(d.moneda)) AS moneda,
          (d.monto_net / NULLIF(d.tasa, 0)) AS monto_net_usd,
          (d.saldo / NULLIF(d.tasa, 0)) AS saldo_usd,
          DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(d.fec_venc AS DATE)) AS dias_restantes,
          CASE 
            WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(d.fec_venc AS DATE)) < 0 THEN 'vencida'
            WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(d.fec_venc AS DATE)) = 0 THEN 'hoy'
            WHEN DATEDIFF(day, CAST(GETDATE() AS DATE), CAST(d.fec_venc AS DATE)) <= 3 THEN 'urgente'
            ELSE 'proxima'
          END AS estado
        FROM docum_cp d
        INNER JOIN prov p ON LTRIM(RTRIM(d.co_cli)) = LTRIM(RTRIM(p.co_prov))
        WHERE d.anulado = 0
          AND d.saldo > 0
          AND d.fec_venc <= DATEADD(day, 7, CAST(GETDATE() AS DATE))
        ORDER BY d.fec_venc ASC
      `);

      // ============================================
      // 2. ESTADÍSTICAS GENERALES: Todas las cuentas pendientes
      // ============================================
      const stats = await req.query(`
        SELECT 
          COUNT(*) AS total_cuentas,
          ISNULL(SUM(saldo / NULLIF(tasa, 0)), 0) AS deuda_total_usd,
          COUNT(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN 1 END) AS cuentas_vencidas,
          COUNT(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN 1 END) AS cuentas_por_vencer,
          ISNULL(SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS monto_vencido_usd,
          ISNULL(SUM(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS monto_por_vencer_usd
        FROM docum_cp
        WHERE anulado = 0
          AND saldo > 0
      `);

      return {
        listado: listado.recordset,
        stats: stats.recordset[0],
      };
    });

    return Response.json({
      ok: true,
      data: result.listado,
      stats: result.stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}