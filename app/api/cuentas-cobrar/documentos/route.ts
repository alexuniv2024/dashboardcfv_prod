import { withProfitPool } from "@/lib/db/profit";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const result = await withProfitPool(async (req) => {
      const res = await req.query(`
        SELECT 
          LTRIM(RTRIM(d.tipo_doc)) AS tipo_doc,
          d.nro_doc,
          LTRIM(RTRIM(d.co_cli)) AS co_cli,
          LTRIM(RTRIM(ISNULL(c.cli_des, 'SIN NOMBRE'))) AS cliente,
          d.fec_emis,
          d.fec_venc,
          d.saldo,
          ISNULL(d.saldo / NULLIF(d.tasa, 0), 0) AS saldo_usd,
          DATEDIFF(DAY, d.fec_venc, GETDATE()) AS dias_vencido
        FROM docum_cc d
        LEFT JOIN clientes c ON d.co_cli = c.co_cli
        WHERE ISNULL(d.anulado, 0) = 0
          AND d.saldo <> 0
        ORDER BY d.fec_venc ASC
      `);
      return res.recordset;
    });

    return Response.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}