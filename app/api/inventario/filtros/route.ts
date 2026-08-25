import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [lineas, subLineas, marcas, proveedores] = await Promise.all([
      queryPostgres(
        "SELECT co_lin, lin_des FROM filtro_lineas ORDER BY lin_des"
      ),
      queryPostgres(
        "SELECT co_subl, subl_des, co_lin FROM filtro_sub_lineas ORDER BY subl_des"
      ),
      queryPostgres(
        "SELECT co_color, marca_des FROM filtro_marcas ORDER BY marca_des"
      ),
      queryPostgres(
        "SELECT co_prov, prov_des FROM filtro_proveedores ORDER BY prov_des"
      ),
    ]);

    return Response.json({
      ok: true,
      data: {
        lineas: lineas.rows,
        sub_lineas: subLineas.rows,
        marcas: marcas.rows,
        proveedores: proveedores.rows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}