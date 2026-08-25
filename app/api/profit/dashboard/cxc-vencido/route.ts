import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT 
            d.tipo_doc,
            d.nro_doc,
            d.fec_emis,
            d.fec_venc,
            (d.monto_net / NULLIF(d.tasa, 0)) AS monto_original_usd,
            (d.saldo / NULLIF(d.tasa, 0)) AS saldo_pendiente_usd,
            c.cli_des AS nombre_cliente,
            DATEDIFF(day, d.fec_venc, GETDATE()) AS dias_mora
        FROM docum_cc d
        INNER JOIN clientes c ON d.co_cli = c.co_cli
        WHERE d.anulado = 0
          AND d.saldo > 0
          AND CAST(d.fec_venc AS DATE) < CAST(GETDATE() AS DATE)
        ORDER BY d.fec_venc ASC
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