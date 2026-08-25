import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const result = await queryPostgres(
      `UPDATE notificaciones 
       SET estado = 'VISTA', visto_en = NOW()
       WHERE estado = 'PENDIENTE'
         AND tipo = 'STOCK_BAJO'
       RETURNING id`
    );

    return Response.json({
      ok: true,
      message: `${result.rowCount} notificaciones marcadas como vistas`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}