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
      // ============================================
      // CONSULTA UNIFICADA: Todos los productos del mes
      // (con métricas necesarias para los 3 rankings)
      // ============================================
      const productos = await req.query(`
        SELECT 
          LTRIM(RTRIM(r.co_art)) AS co_art,
          LTRIM(RTRIM(a.art_des)) AS nombre_producto,
          ISNULL(SUM(r.total_art), 0) AS cantidad_vendida,
          ISNULL(SUM(r.reng_neto / NULLIF(f.tasa, 0)), 0) AS total_usd,
          ISNULL(SUM(
            (r.prec_vta / NULLIF(f.tasa, 0) - ISNULL(NULLIF(r.ult_cos_om, 0), 0)) * r.total_art
          ), 0) AS ganancia_usd
        FROM reng_fac r
        INNER JOIN factura f ON r.fact_num = f.fact_num
        INNER JOIN art a ON r.co_art = a.co_art
        WHERE r.anulado = 0
          AND f.anulada = 0
          AND LTRIM(RTRIM(r.co_art)) <> 'GEN1'
          AND YEAR(f.fec_emis) = ${anio}
          AND MONTH(f.fec_emis) = ${mes}
        GROUP BY r.co_art, a.art_des
        HAVING SUM(r.total_art) > 0
      `);

      return productos.recordset;
    });

    // ============================================
    // Calcular los 3 rankings en JavaScript
    // ============================================
    const porCantidad = [...result]
      .sort((a, b) => Number(b.cantidad_vendida) - Number(a.cantidad_vendida))
      .slice(0, 5)
      .map((p, idx) => ({
        posicion: idx + 1,
        co_art: p.co_art,
        nombre_producto: p.nombre_producto,
        cantidad_vendida: Number(p.cantidad_vendida),
        total_usd: Number(p.total_usd),
      }));

    const porMonto = [...result]
      .sort((a, b) => Number(b.total_usd) - Number(a.total_usd))
      .slice(0, 5)
      .map((p, idx) => ({
        posicion: idx + 1,
        co_art: p.co_art,
        nombre_producto: p.nombre_producto,
        total_usd: Number(p.total_usd),
        cantidad_vendida: Number(p.cantidad_vendida),
      }));

    const masUtiles = [...result]
      .sort((a, b) => Number(b.ganancia_usd) - Number(a.ganancia_usd))
      .slice(0, 5)
      .map((p, idx) => ({
        posicion: idx + 1,
        co_art: p.co_art,
        nombre_producto: p.nombre_producto,
        ganancia_usd: Number(p.ganancia_usd),
        total_usd: Number(p.total_usd),
        cantidad_vendida: Number(p.cantidad_vendida),
      }));

    // Estadísticas generales del mes
    const totalArticulos = result.reduce(
      (sum, p) => sum + Number(p.cantidad_vendida),
      0
    );
    const totalProductosDistintos = result.length;

    return Response.json({
      ok: true,
      data: {
        periodo: { anio, mes },
        porCantidad,
        porMonto,
        masUtiles,
        estadisticas: {
          total_articulos_vendidos: totalArticulos,
          total_productos_distintos: totalProductosDistintos,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}