import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reporteSchema = z.object({
  total_cuentas: z.number().min(0),
  monto_total_usd: z.number().min(0),
  cuentas_vencidas: z.number().min(0),
  monto_vencido_usd: z.number().min(0),
  cuentas_por_vencer: z.number().min(0),
  monto_por_vencer_usd: z.number().min(0),
});

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = reporteSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { ok: false, error: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 1. Guardar el reporte en el historial
    const result = await queryPostgres(
      `INSERT INTO reportes_cxp 
        (usuario_id, total_cuentas, monto_total_usd, cuentas_vencidas, 
         monto_vencido_usd, cuentas_por_vencer, monto_por_vencer_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.sub,
        data.total_cuentas,
        data.monto_total_usd,
        data.cuentas_vencidas,
        data.monto_vencido_usd,
        data.cuentas_por_vencer,
        data.monto_por_vencer_usd,
      ]
    );

    const nuevoReporte = result.rows[0];

    // 2. Crear notificación interna en la campana
    const mensaje = `Se generó reporte de Cuentas por Pagar: ${data.total_cuentas} cuentas, deuda total de $${data.monto_total_usd.toFixed(2)} USD (${data.cuentas_vencidas} vencidas)`;

    await queryPostgres(
      `INSERT INTO notificaciones (tipo, mensaje, estado, creado_en)
       VALUES ('REPORTE_CXP', $1, 'PENDIENTE', NOW())`,
      [mensaje]
    );

    return Response.json({
      ok: true,
      data: nuevoReporte,
      message: "Reporte generado y guardado en historial",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}