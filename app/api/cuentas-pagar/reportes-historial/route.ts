import { queryPostgres } from "@/lib/db/postgres";
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

    const result = await queryPostgres(
      `SELECT 
         r.id,
         r.fecha_generacion,
         r.total_cuentas,
         r.monto_total_usd,
         r.cuentas_vencidas,
         r.monto_vencido_usd,
         r.cuentas_por_vencer,
         r.monto_por_vencer_usd,
         u.email AS usuario_email
       FROM reportes_cxp r
       LEFT JOIN usuarios u ON r.usuario_id = u.id
       ORDER BY r.fecha_generacion DESC
       LIMIT 10`
    );

    return Response.json({
      ok: true,
      data: result.rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}