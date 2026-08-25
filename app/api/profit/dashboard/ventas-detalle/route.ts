import { withProfitPool } from "@/lib/db/profit";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    // Validar que el parámetro exista
    if (!fecha) {
      return Response.json(
        { ok: false, error: "El parámetro 'fecha' es requerido" },
        { status: 400 }
      );
    }

    // Validar formato YYYY-MM-DD
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fecha)) {
      return Response.json(
        { ok: false, error: "Formato de fecha inválido. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const result = await withProfitPool(async (req) => {
      req.input("fecha", fecha);
      return req.query(`
        SELECT 
            f.fact_num,
            f.num_control,
            LTRIM(RTRIM(f.nombre)) AS nombre_cliente,
            f.rif,
            f.co_cli,
            f.fec_emis,
            f.tot_bruto,
            f.tot_neto,
            f.iva,
            f.tasa,
            f.moneda,
            (f.tot_neto / NULLIF(f.tasa, 0)) AS total_usd,
            (SELECT COUNT(*) 
             FROM reng_fac r 
             WHERE r.fact_num = f.fact_num 
               AND r.anulado = 0) AS cantidad_articulos
        FROM factura f
        WHERE CAST(f.fec_emis AS DATE) = CAST(@fecha AS DATE)
          AND f.anulada = 0
        ORDER BY f.fec_emis ASC
      `);
    });

    return Response.json({
      ok: true,
      fecha,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}