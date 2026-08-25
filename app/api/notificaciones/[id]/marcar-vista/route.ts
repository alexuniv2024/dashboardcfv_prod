import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return Response.json(
        { ok: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const result = await queryPostgres(
      `UPDATE notificaciones 
       SET estado = 'VISTA', visto_en = NOW()
       WHERE id = $1 AND estado = 'PENDIENTE'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Notificación no encontrada o ya fue vista" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      message: "Notificación marcada como vista",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}