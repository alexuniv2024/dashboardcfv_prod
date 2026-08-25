import { withProfitPool } from "@/lib/db/profit";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "GERENTE")) {
      return Response.json(
        { ok: false, error: "No tienes acceso a este módulo" },
        { status: 403 }
      );
    }

    const result = await withProfitPool(async (req) => {
      const periodos = await req.query(`
        SELECT 
          YEAR(fec_emis) AS anio,
          MONTH(fec_emis) AS mes,
          COUNT(fact_num) AS total_facturas,
          ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) AS ventas_usd
        FROM factura
        WHERE anulada = 0
        GROUP BY YEAR(fec_emis), MONTH(fec_emis)
        HAVING COUNT(fact_num) > 0
        ORDER BY YEAR(fec_emis) DESC, MONTH(fec_emis) DESC
      `);

      return periodos.recordset;
    });

    return Response.json({
      ok: true,
      data: result.map((p) => ({
        anio: p.anio,
        mes: p.mes,
        total_facturas: p.total_facturas,
        ventas_usd: Number(p.ventas_usd),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}