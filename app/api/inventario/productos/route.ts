import { queryPostgres } from "@/lib/db/postgres";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const co_lin = searchParams.get("co_lin") || "";
    const co_subl = searchParams.get("co_subl") || "";
    const co_color = searchParams.get("co_color") || "";
    const co_prov = searchParams.get("co_prov") || "";
    const solo_monitoreados = searchParams.get("solo_monitoreados") === "true";

    const offset = (page - 1) * limit;

    // Construir WHERE dinámicamente
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      conditions.push(
        `(s.producto_id ILIKE $${paramCount} OR s.nombre ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
    }

    if (co_lin) {
      paramCount++;
      conditions.push(`s.co_lin = $${paramCount}`);
      params.push(co_lin);
    }

    if (co_subl) {
      paramCount++;
      conditions.push(`s.co_subl = $${paramCount}`);
      params.push(co_subl);
    }

    if (co_color) {
      paramCount++;
      conditions.push(`s.co_color = $${paramCount}`);
      params.push(co_color);
    }

    if (co_prov) {
      paramCount++;
      conditions.push(`s.co_prov = $${paramCount}`);
      params.push(co_prov);
    }

    if (solo_monitoreados) {
      conditions.push(`c.activo = TRUE`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Consulta principal
    const query = `
      SELECT 
        s.producto_id,
        s.nombre,
        s.stock_actual,
        s.stock_min_profit,
        s.co_lin,
        s.co_subl,
        s.co_color,
        s.co_prov,
        s.ultima_sync,
        fl.lin_des AS nombre_linea,
        fsl.subl_des AS nombre_sub_linea,
        fm.marca_des AS nombre_marca,
        fp.prov_des AS nombre_proveedor,
        c.id AS config_id,
        c.umbral_minimo,
        c.activo AS monitoreado,
        c.creado_en AS config_creado_en,
        c.actualizado_en AS config_actualizado_en
      FROM stock_snapshot s
      LEFT JOIN filtro_lineas fl ON s.co_lin = fl.co_lin
      LEFT JOIN filtro_sub_lineas fsl ON s.co_subl = fsl.co_subl
      LEFT JOIN filtro_marcas fm ON s.co_color = fm.co_color
      LEFT JOIN filtro_proveedores fp ON s.co_prov = fp.co_prov
      LEFT JOIN config_stock c ON s.producto_id = c.producto_id
      ${whereClause}
      ORDER BY s.nombre ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    params.push(limit, offset);
    const result = await queryPostgres(query, params);

    // Contar total
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM stock_snapshot s
      LEFT JOIN config_stock c ON s.producto_id = c.producto_id
      ${whereClause}
    `;
    const countResult = await queryPostgres(
      countQuery,
      params.slice(0, paramCount)
    );
    const total = parseInt(countResult.rows[0].total);

    console.log("✅ Productos encontrados:", result.rows.length);
    console.log("✅ Total:", total);

    return Response.json({
      ok: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error en endpoint productos:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}