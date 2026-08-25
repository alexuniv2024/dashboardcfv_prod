import { withProfitPool } from "@/lib/db/profit";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json(
        { ok: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    // Misma restricción que el módulo de ventas (ADMIN y GERENTE)
    if (user.rol !== "ADMIN" && user.rol !== "GERENTE") {
      return Response.json(
        { ok: false, error: "No tienes acceso a este módulo" },
        { status: 403 }
      );
    }

    const result = await withProfitPool(async (req) => {
      // ============================================
      // EFECTIVO DE HOY (mov_caj)
      // ============================================
      const efectivo = await req.query(`
        SELECT 
          LTRIM(RTRIM(mc.codigo)) AS cod_caja,
          COUNT(*) AS cantidad,
          ISNULL(SUM(
            CASE 
              WHEN LTRIM(RTRIM(mc.moneda)) = 'US$' THEN mc.monto_h
              ELSE mc.monto_h / NULLIF(cb.tasa, 0)
            END
          ), 0) AS monto_usd
        FROM mov_caj mc
        LEFT JOIN cobros cb ON mc.cob_pag = cb.cob_num
        WHERE mc.origen = 'COB'
          AND mc.tipo_op = 'I'
          AND mc.forma_pag = 'EF'
          AND ISNULL(mc.anulado, 0) = 0
          AND CAST(mc.fecha AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY mc.codigo
      `);

      // ============================================
      // DEPÓSITOS DE HOY (mov_ban)
      // ============================================
      const depositos = await req.query(`
        SELECT 
          COUNT(*) AS cantidad,
          ISNULL(SUM(
            CASE 
              WHEN LTRIM(RTRIM(mb.moneda)) = 'US$' THEN mb.monto_h
              ELSE mb.monto_h / NULLIF(cb.tasa, 0)
            END
          ), 0) AS monto_usd
        FROM mov_ban mb
        LEFT JOIN cobros cb ON mb.cob_pag = cb.cob_num
        WHERE mb.origen = 'COB'
          AND mb.tipo_op = 'DP'
          AND ISNULL(mb.anulado, 0) = 0
          AND CAST(mb.fecha AS DATE) = CAST(GETDATE() AS DATE)
      `);

      return {
        efectivo: efectivo.recordset,
        depositos: depositos.recordset[0],
      };
    });

    // ============================================
    // Calcular totales
    // ============================================
    let efectivoUsd = 0;
    let efectivoBsUsd = 0;
    let otrosEfectivo = 0;
    let cantEfectivo = 0;

    for (const row of result.efectivo) {
      cantEfectivo += Number(row.cantidad);
      if (row.cod_caja === "USD") efectivoUsd += Number(row.monto_usd);
      else if (row.cod_caja === "BS") efectivoBsUsd += Number(row.monto_usd);
      else otrosEfectivo += Number(row.monto_usd);
    }

    const depositosUsd = Number(result.depositos?.monto_usd || 0);
    const cantDepositos = Number(result.depositos?.cantidad || 0);

    const totalUsd = efectivoUsd + efectivoBsUsd + otrosEfectivo + depositosUsd;

    return Response.json({
      ok: true,
      data: {
        efectivo_usd: Number(efectivoUsd.toFixed(2)),
        efectivo_bs_usd: Number(efectivoBsUsd.toFixed(2)),
        depositos_usd: Number(depositosUsd.toFixed(2)),
        total_usd: Number(totalUsd.toFixed(2)),
        cantidad_cobros: cantEfectivo + cantDepositos,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}