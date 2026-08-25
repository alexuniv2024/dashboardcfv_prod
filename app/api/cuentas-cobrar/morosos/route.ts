import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (req) => {
      const morosos = await req.query(`
        SELECT TOP 10
          LTRIM(RTRIM(d.co_cli)) AS co_cli,
          LTRIM(RTRIM(c.cli_des)) AS nombre_cliente,
          COUNT(d.nro_doc) AS cantidad_documentos,
          ISNULL(SUM(d.saldo / NULLIF(d.tasa, 0)), 0) AS saldo_total_usd,
          MAX(DATEDIFF(day, d.fec_venc, GETDATE())) AS max_dias_mora
        FROM docum_cc d
        INNER JOIN clientes c ON d.co_cli = c.co_cli
        WHERE d.anulado = 0
          AND d.saldo > 0
          AND CAST(d.fec_venc AS DATE) < CAST(GETDATE() AS DATE)
        GROUP BY d.co_cli, c.cli_des
        ORDER BY saldo_total_usd DESC
      `);

      return morosos.recordset;
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