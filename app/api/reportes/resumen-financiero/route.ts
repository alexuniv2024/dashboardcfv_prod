import { withProfitPool } from "@/lib/db/profit";
import { queryPostgres } from "@/lib/db/postgres";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verificar permisos (solo ADMIN y GERENTE)
    const user = await getAuthenticatedUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "GERENTE")) {
      return Response.json(
        { ok: false, error: "No tienes acceso a este módulo" },
        { status: 403 }
      );
    }

    const result = await withProfitPool(async (req) => {
      // ============================================
      // 1. RESUMEN DE CUENTAS POR COBRAR (CxC)
      // Estado actual (como en el Sprint 4)
      // ============================================
      const cxc = await req.query(`
        SELECT 
          COUNT(*) AS total_documentos,
          COUNT(DISTINCT co_cli) AS total_clientes,
          ISNULL(SUM(saldo / NULLIF(tasa, 0)), 0) AS saldo_total_usd,
          COUNT(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN 1 END) AS documentos_vencidos,
          ISNULL(SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS saldo_vencido_usd,
          CASE 
            WHEN SUM(saldo / NULLIF(tasa, 0)) = 0 THEN 0
            ELSE (SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END) / SUM(saldo / NULLIF(tasa, 0))) * 100
          END AS porcentaje_vencido
        FROM docum_cc
        WHERE anulado = 0
          AND saldo > 0
      `);

      // ============================================
      // 2. RESUMEN DE CUENTAS POR PAGAR (CxP)
      // Estado actual (como en el Sprint 4)
      // ============================================
      const cxp = await req.query(`
        SELECT 
          COUNT(*) AS total_cuentas,
          ISNULL(SUM(saldo / NULLIF(tasa, 0)), 0) AS deuda_total_usd,
          COUNT(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN 1 END) AS cuentas_vencidas,
          COUNT(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN 1 END) AS cuentas_por_vencer,
          ISNULL(SUM(CASE WHEN fec_venc < CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS monto_vencido_usd,
          ISNULL(SUM(CASE WHEN fec_venc >= CAST(GETDATE() AS DATE) THEN saldo / NULLIF(tasa, 0) ELSE 0 END), 0) AS monto_por_vencer_usd
        FROM docum_cp
        WHERE anulado = 0
          AND saldo > 0
      `);

      return {
        cxc: cxc.recordset[0],
        cxp: cxp.recordset[0],
      };
    });

    // ============================================
    // 3. STOCK CRÍTICO (desde PostgreSQL)
    // Productos monitoreados bajo el umbral (Sprint 3)
    // ============================================
    const stockCritico = await queryPostgres(`
      SELECT 
        COUNT(*) AS total_productos_criticos,
        COUNT(CASE WHEN s.stock_actual = 0 THEN 1 END) AS productos_sin_stock
      FROM config_stock c
      INNER JOIN stock_snapshot s ON c.producto_id = s.producto_id
      WHERE c.activo = TRUE
        AND s.stock_actual <= c.umbral_minimo
    `);

    const stockData = stockCritico.rows[0] || {
      total_productos_criticos: 0,
      productos_sin_stock: 0,
    };

    return Response.json({
      ok: true,
      data: {
        cuentas_por_cobrar: {
          total_documentos: result.cxc.total_documentos,
          total_clientes: result.cxc.total_clientes,
          saldo_total_usd: Number(result.cxc.saldo_total_usd),
          documentos_vencidos: result.cxc.documentos_vencidos,
          saldo_vencido_usd: Number(result.cxc.saldo_vencido_usd),
          porcentaje_vencido: Number(result.cxc.porcentaje_vencido),
        },
        cuentas_por_pagar: {
          total_cuentas: result.cxp.total_cuentas,
          deuda_total_usd: Number(result.cxp.deuda_total_usd),
          cuentas_vencidas: result.cxp.cuentas_vencidas,
          cuentas_por_vencer: result.cxp.cuentas_por_vencer,
          monto_vencido_usd: Number(result.cxp.monto_vencido_usd),
          monto_por_vencer_usd: Number(result.cxp.monto_por_vencer_usd),
        },
        stock_critico: {
          total_productos_criticos: Number(stockData.total_productos_criticos),
          productos_sin_stock: Number(stockData.productos_sin_stock),
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}