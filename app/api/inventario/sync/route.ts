import { withProfitPool } from "@/lib/db/profit";
import { withTransaction } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar que el usuario sea ADMIN
    const user = await getAuthenticatedUser();
    if (!user || user.rol !== "ADMIN") {
      return Response.json(
        { ok: false, error: "Solo el administrador puede sincronizar" },
        { status: 403 }
      );
    }

    console.log("🔄 Iniciando sincronización de inventario...");

    // 2. Obtener datos de Profit (una sola consulta por tabla)
    const profitData = await withProfitPool(async (req) => {
      // Productos con stock
      const productos = await req.query(`
        SELECT 
          LTRIM(RTRIM(a.co_art)) AS co_art,
          LTRIM(RTRIM(a.art_des)) AS art_des,
          ISNULL(a.stock_act, 0) AS stock_act,
          ISNULL(a.stock_min, 0) AS stock_min,
          LTRIM(RTRIM(a.co_lin)) AS co_lin,
          LTRIM(RTRIM(a.co_subl)) AS co_subl,
          LTRIM(RTRIM(a.co_color)) AS co_color,
          LTRIM(RTRIM(a.co_prov)) AS co_prov
        FROM art a
        WHERE a.anulado = 0
      `);

      // Líneas
      const lineas = await req.query(`
        SELECT 
          LTRIM(RTRIM(co_lin)) AS co_lin,
          LTRIM(RTRIM(lin_des)) AS lin_des
        FROM lin_art
      `);

      // Sub-líneas
      const subLineas = await req.query(`
        SELECT 
          LTRIM(RTRIM(co_subl)) AS co_subl,
          LTRIM(RTRIM(subl_des)) AS subl_des,
          LTRIM(RTRIM(co_lin)) AS co_lin
        FROM sub_lin
      `);

      // Marcas (tabla colores en Profit)
      const marcas = await req.query(`
        SELECT 
          LTRIM(RTRIM(co_col)) AS co_col,
          LTRIM(RTRIM(des_col)) AS des_col
        FROM colores
      `);

      // Proveedores
      const proveedores = await req.query(`
        SELECT 
          LTRIM(RTRIM(co_prov)) AS co_prov,
          LTRIM(RTRIM(prov_des)) AS prov_des
        FROM prov
        WHERE inactivo = 0
      `);

      return {
        productos: productos.recordset,
        lineas: lineas.recordset,
        subLineas: subLineas.recordset,
        marcas: marcas.recordset,
        proveedores: proveedores.recordset,
      };
    });

    console.log(`📦 Datos obtenidos de Profit:
      - Productos: ${profitData.productos.length}
      - Líneas: ${profitData.lineas.length}
      - Sub-líneas: ${profitData.subLineas.length}
      - Marcas: ${profitData.marcas.length}
      - Proveedores: ${profitData.proveedores.length}
    `);

    // 3. Guardar en PostgreSQL dentro de una transacción
        // 3. Guardar en PostgreSQL dentro de una transacción
    const result = await withTransaction(async (client) => {
      // Limpiar tablas de filtros (se recargan completas)
      await client.query("DELETE FROM filtro_lineas");
      await client.query("DELETE FROM filtro_sub_lineas");
      await client.query("DELETE FROM filtro_marcas");
      await client.query("DELETE FROM filtro_proveedores");

      // Insertar líneas
      for (const linea of profitData.lineas) {
        if (!linea.co_lin) continue;
        await client.query(
          `INSERT INTO filtro_lineas (co_lin, lin_des, actualizado_en)
           VALUES ($1, $2, NOW())
           ON CONFLICT (co_lin) DO UPDATE SET lin_des = $2, actualizado_en = NOW()`,
          [linea.co_lin, linea.lin_des]
        );
      }

      // Insertar sub-líneas
      for (const subl of profitData.subLineas) {
        if (!subl.co_subl) continue;
        await client.query(
          `INSERT INTO filtro_sub_lineas (co_subl, subl_des, co_lin, actualizado_en)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (co_subl) DO UPDATE SET subl_des = $2, co_lin = $3, actualizado_en = NOW()`,
          [subl.co_subl, subl.subl_des, subl.co_lin]
        );
      }

      // Insertar marcas (colores)
      for (const marca of profitData.marcas) {
        if (!marca.co_col) continue;
        await client.query(
          `INSERT INTO filtro_marcas (co_color, marca_des, actualizado_en)
           VALUES ($1, $2, NOW())
           ON CONFLICT (co_color) DO UPDATE SET marca_des = $2, actualizado_en = NOW()`,
          [marca.co_col, marca.des_col]
        );
      }

      // Insertar proveedores
      for (const prov of profitData.proveedores) {
        if (!prov.co_prov) continue;
        await client.query(
          `INSERT INTO filtro_proveedores (co_prov, prov_des, actualizado_en)
           VALUES ($1, $2, NOW())
           ON CONFLICT (co_prov) DO UPDATE SET prov_des = $2, actualizado_en = NOW()`,
          [prov.co_prov, prov.prov_des]
        );
      }

      // UPSERT de productos en stock_snapshot
      let productosActualizados = 0;
      for (const prod of profitData.productos) {
        if (!prod.co_art) continue;
        await client.query(
          `INSERT INTO stock_snapshot 
            (producto_id, nombre, stock_actual, stock_min_profit, co_lin, co_subl, co_color, co_prov, ultima_sync, actualizado_en)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (producto_id) 
           DO UPDATE SET 
             nombre = EXCLUDED.nombre,
             stock_actual = EXCLUDED.stock_actual,
             stock_min_profit = EXCLUDED.stock_min_profit,
             co_lin = EXCLUDED.co_lin,
             co_subl = EXCLUDED.co_subl,
             co_color = EXCLUDED.co_color,
             co_prov = EXCLUDED.co_prov,
             ultima_sync = NOW(),
             actualizado_en = NOW()`,
          [
            prod.co_art,
            prod.art_des,
            prod.stock_act,
            prod.stock_min,
            prod.co_lin,
            prod.co_subl,
            prod.co_color,
            prod.co_prov,
          ]
        );
        productosActualizados++;
      }

      // ============================================
      // LÓGICA DE NOTIFICACIONES
      // ============================================

      // 1. Resolver notificaciones de productos que YA NO están bajo el umbral
      await client.query(`
        UPDATE notificaciones n
        SET estado = 'RESUELTA',
            visto_en = COALESCE(visto_en, NOW())
        FROM config_stock c
        INNER JOIN stock_snapshot s ON c.producto_id = s.producto_id
        WHERE n.producto_id = c.producto_id
          AND n.estado IN ('PENDIENTE', 'VISTA')
          AND n.tipo = 'STOCK_BAJO'
          AND c.activo = TRUE
          AND s.stock_actual > c.umbral_minimo
      `);

      // 2. Crear notificaciones para productos que están bajo el umbral
      //    pero NO tienen una notificación activa (PENDIENTE o VISTA)
      const nuevasNotificaciones = await client.query(`
        INSERT INTO notificaciones (producto_id, tipo, mensaje, estado, creado_en)
        SELECT 
          c.producto_id,
          'STOCK_BAJO',
          'El producto "' || s.nombre || '" tiene stock de ' || s.stock_actual::TEXT || 
          ' unidades (umbral: ' || c.umbral_minimo::TEXT || ')',
          'PENDIENTE',
          NOW()
        FROM config_stock c
        INNER JOIN stock_snapshot s ON c.producto_id = s.producto_id
        WHERE c.activo = TRUE
          AND s.stock_actual <= c.umbral_minimo
          AND NOT EXISTS (
            SELECT 1 FROM notificaciones n
            WHERE n.producto_id = c.producto_id
              AND n.tipo = 'STOCK_BAJO'
              AND n.estado IN ('PENDIENTE', 'VISTA')
          )
        RETURNING id
      `);

      // 3. Actualizar la última alerta en config_stock
      await client.query(`
        UPDATE config_stock c
        SET ultima_alerta = NOW()
        FROM stock_snapshot s
        WHERE c.producto_id = s.producto_id
          AND c.activo = TRUE
          AND s.stock_actual <= c.umbral_minimo
      `);

      return {
        productosActualizados,
        nuevasNotificaciones: nuevasNotificaciones.rowCount,
      };
    });

    console.log(`✅ Sincronización completada: 
      - ${result.productosActualizados} productos actualizados
      - ${result.nuevasNotificaciones} nuevas notificaciones generadas
    `);

    console.log(`✅ Sincronización completada: ${result.productosActualizados} productos actualizados`);

    return Response.json({
      ok: true,
      message: "Sincronización completada exitosamente",
      data: {
        productos_sincronizados: result.productosActualizados,
        lineas: profitData.lineas.length,
        sub_lineas: profitData.subLineas.length,
        marcas: profitData.marcas.length,
        proveedores: profitData.proveedores.length,
        fecha_sync: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}