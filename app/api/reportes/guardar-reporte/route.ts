import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reporteSchema = z.object({
  anio: z.number(),
  mes: z.number().min(1).max(12),
  ventas_totales_usd: z.number(),
  total_facturas: z.number(),
  total_articulos: z.number(),
  variacion_vs_mes_anterior: z.number().nullable(),
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

    // Verificar permisos (solo ADMIN y GERENTE)
    if (user.rol !== "ADMIN" && user.rol !== "GERENTE") {
      return Response.json(
        { ok: false, error: "No tienes acceso a este módulo" },
        { status: 403 }
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

    // 1. Guardar en el historial de reportes mensuales
    const result = await queryPostgres(
      `INSERT INTO reportes_mensuales 
        (usuario_id, anio, mes, ventas_totales_usd, total_facturas, 
         total_articulos, variacion_vs_mes_anterior)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user.sub,
        data.anio,
        data.mes,
        data.ventas_totales_usd,
        data.total_facturas,
        data.total_articulos,
        data.variacion_vs_mes_anterior,
      ]
    );

    const nuevoReporte = result.rows[0];

    // 2. Crear notificación interna en la campana
    const mensaje = `Se generó el Reporte Mensual de Ventas de ${data.mes}/${data.anio}: ${data.total_facturas} facturas por $${data.ventas_totales_usd.toFixed(2)} USD`;

    await queryPostgres(
      `INSERT INTO notificaciones (tipo, mensaje, estado, creado_en)
       VALUES ('REPORTE_MENSUAL', $1, 'PENDIENTE', NOW())`,
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