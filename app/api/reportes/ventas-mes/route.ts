import { withProfitPool } from "@/lib/db/profit";
import { getAuthenticatedUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verificar permisos (solo ADMIN y GERENTE)
    const user = await getAuthenticatedUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "GERENTE")) {
      return Response.json(
        { ok: false, error: "No tienes acceso a este módulo" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const anio = parseInt(searchParams.get("anio") || "0");
    const mes = parseInt(searchParams.get("mes") || "0");

    if (!anio || !mes || mes < 1 || mes > 12) {
      return Response.json(
        { ok: false, error: "Parámetros anio y mes son requeridos" },
        { status: 400 }
      );
    }

    const result = await withProfitPool(async (req) => {
    
    // Ventas del mes solicitado + acumulado anual
    const mesActual = await req.query(`
    SELECT 
        COUNT(fact_num) AS total_facturas,
        ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) AS ventas_totales_usd,
        ISNULL((SELECT SUM(total_art) FROM reng_fac r 
                INNER JOIN factura f2 ON r.fact_num = f2.fact_num 
                WHERE r.anulado = 0 AND f2.anulada = 0
                AND YEAR(f2.fec_emis) = ${anio} AND MONTH(f2.fec_emis) = ${mes}), 0) AS total_articulos,
        -- Acumulado anual
        ISNULL((SELECT COUNT(*) FROM factura 
                WHERE anulada = 0 AND YEAR(fec_emis) = ${anio}), 0) AS facturas_anuales,
        ISNULL((SELECT SUM(tot_neto / NULLIF(tasa, 0)) FROM factura 
                WHERE anulada = 0 AND YEAR(fec_emis) = ${anio}), 0) AS ventas_anuales_usd,
        ISNULL((SELECT SUM(r.total_art) FROM reng_fac r 
                INNER JOIN factura f2 ON r.fact_num = f2.fact_num 
                WHERE r.anulado = 0 AND f2.anulada = 0 AND YEAR(f2.fec_emis) = ${anio}), 0) AS articulos_anuales
    FROM factura
    WHERE anulada = 0
        AND YEAR(fec_emis) = ${anio}
        AND MONTH(fec_emis) = ${mes}
    `);

      // Ventas del mes anterior (para comparativa)
      const fechaAnterior = new Date(anio, mes - 2, 1);
      const anioAnterior = fechaAnterior.getFullYear();
      const mesAnterior = fechaAnterior.getMonth() + 1;

      const mesPrevio = await req.query(`
        SELECT 
          COUNT(fact_num) AS total_facturas,
          ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) AS ventas_totales_usd
        FROM factura
        WHERE anulada = 0
          AND YEAR(fec_emis) = ${anioAnterior}
          AND MONTH(fec_emis) = ${mesAnterior}
      `);

      return {
        actual: mesActual.recordset[0],
        anterior: mesPrevio.recordset[0],
        periodo_anterior: { anio: anioAnterior, mes: mesAnterior },
      };
    });

    // Calcular variación porcentual
    const ventasActual = Number(result.actual.ventas_totales_usd);
    const ventasAnterior = Number(result.anterior.ventas_totales_usd);
    let variacion = null;

    if (ventasAnterior > 0) {
      variacion = ((ventasActual - ventasAnterior) / ventasAnterior) * 100;
    }

        return Response.json({
        ok: true,
        data: {
            periodo: { anio, mes },
            ventas_totales_usd: ventasActual,
            total_facturas: result.actual.total_facturas,
            total_articulos: result.actual.total_articulos,
            acumulado_anual: {
            anio,
            facturas: result.actual.facturas_anuales,
            ventas_usd: Number(result.actual.ventas_anuales_usd),
            articulos: Number(result.actual.articulos_anuales),
            },
        mes_anterior: {
          periodo: result.periodo_anterior,
          ventas_totales_usd: ventasAnterior,
          total_facturas: result.anterior.total_facturas,
          tiene_datos: ventasAnterior > 0,
        },
        variacion_porcentual: variacion,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}