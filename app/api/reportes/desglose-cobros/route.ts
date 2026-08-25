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
      // 1. EFECTIVO (de mov_caj)
      // Agrupado por caja (USD / BS / PRD)
      // ============================================
      const efectivoPorCaja = await req.query(`
        SELECT 
          LTRIM(RTRIM(mc.codigo)) AS cod_caja,
          LTRIM(RTRIM(c.descrip)) AS descripcion_caja,
          MAX(LTRIM(RTRIM(mc.moneda))) AS moneda_original,
          COUNT(*) AS cantidad_cobros,
          SUM(mc.monto_h) AS monto_moneda_original,
          SUM(
            CASE 
              WHEN LTRIM(RTRIM(mc.moneda)) = 'US$' THEN mc.monto_h
              ELSE mc.monto_h / NULLIF(cb.tasa, 0)
            END
          ) AS monto_usd
        FROM mov_caj mc
        LEFT JOIN cajas c ON mc.codigo = c.cod_caja
        LEFT JOIN cobros cb ON mc.cob_pag = cb.cob_num
        WHERE mc.origen = 'COB'
          AND mc.tipo_op = 'I'
          AND mc.forma_pag = 'EF'
          AND ISNULL(mc.anulado, 0) = 0
          AND YEAR(mc.fecha) = ${anio}
          AND MONTH(mc.fecha) = ${mes}
        GROUP BY mc.codigo, c.descrip
        ORDER BY monto_usd DESC
      `);

        // ============================================
        // 2. DEPÓSITOS BANCARIOS (de mov_ban)
        // Agrupados por banco + cuenta
        // ============================================
        const depositosPorBanco = await req.query(`
        SELECT 
            LTRIM(RTRIM(mb.codigo)) AS codigo_completo,
            -- Extraer el código del banco (antes del punto)
            LEFT(LTRIM(RTRIM(mb.codigo)), CHARINDEX('.', LTRIM(RTRIM(mb.codigo)) + '.') - 1) AS codigo_banco,
            -- El número de cuenta (después del punto)
            RIGHT(LTRIM(RTRIM(mb.codigo)), LEN(LTRIM(RTRIM(mb.codigo))) - CHARINDEX('.', LTRIM(RTRIM(mb.codigo)) + '.')) AS numero_cuenta,
            -- Nombre del banco (si existe)
            LTRIM(RTRIM(b.des_ban)) AS nombre_banco,
            MAX(LTRIM(RTRIM(mb.moneda))) AS moneda_original,
            COUNT(*) AS cantidad_depositos,
            SUM(mb.monto_h) AS monto_moneda_original,
            SUM(
            CASE 
                WHEN LTRIM(RTRIM(mb.moneda)) = 'US$' THEN mb.monto_h
                ELSE mb.monto_h / NULLIF(cb.tasa, 0)
            END
            ) AS monto_usd
        FROM mov_ban mb
        LEFT JOIN bancos b ON LEFT(LTRIM(RTRIM(mb.codigo)), CHARINDEX('.', LTRIM(RTRIM(mb.codigo)) + '.') - 1) = LTRIM(RTRIM(b.co_ban))
        LEFT JOIN cobros cb ON mb.cob_pag = cb.cob_num
        WHERE mb.origen = 'COB'
            AND mb.tipo_op = 'DP'
            AND ISNULL(mb.anulado, 0) = 0
            AND YEAR(mb.fecha) = ${anio}
            AND MONTH(mb.fecha) = ${mes}
        GROUP BY mb.codigo, b.des_ban
        ORDER BY monto_usd DESC
        `);

      // ============================================
      // 3. OTROS MÉTODOS DE PAGO
      // (Tarjetas, cheques, transferencias, etc.)
      // ============================================
      const otrosMetodos = await req.query(`
        SELECT 
          LTRIM(RTRIM(mb.forma_pag)) AS forma_pago,
          COUNT(*) AS cantidad,
          SUM(mb.monto_h) AS monto_moneda_original,
          MAX(LTRIM(RTRIM(mb.moneda))) AS moneda,
          SUM(
            CASE 
              WHEN LTRIM(RTRIM(mb.moneda)) = 'US$' THEN mb.monto_h
              ELSE mb.monto_h / NULLIF(cb.tasa, 0)
            END
          ) AS monto_usd
        FROM mov_ban mb
        LEFT JOIN cobros cb ON mb.cob_pag = cb.cob_num
        WHERE mb.origen = 'COB'
          AND mb.tipo_op <> 'DP'
          AND ISNULL(mb.anulado, 0) = 0
          AND YEAR(mb.fecha) = ${anio}
          AND MONTH(mb.fecha) = ${mes}
        GROUP BY mb.forma_pag
        ORDER BY monto_usd DESC
      `);

      return {
        efectivoPorCaja: efectivoPorCaja.recordset,
        depositosPorBanco: depositosPorBanco.recordset,
        otrosMetodos: otrosMetodos.recordset,
      };
    });

    // ============================================
    // Calcular totales
    // ============================================
    const totalEfectivoUSD = result.efectivoPorCaja
      .filter((c) => c.cod_caja === "USD")
      .reduce((sum, c) => sum + Number(c.monto_usd), 0);

    const totalEfectivoBS = result.efectivoPorCaja
      .filter((c) => c.cod_caja === "BS")
      .reduce((sum, c) => sum + Number(c.monto_usd), 0);

    const totalOtrosEfectivo = result.efectivoPorCaja
      .filter((c) => c.cod_caja !== "USD" && c.cod_caja !== "BS")
      .reduce((sum, c) => sum + Number(c.monto_usd), 0);

    const totalDepositos = result.depositosPorBanco.reduce(
      (sum, b) => sum + Number(b.monto_usd),
      0
    );

    const totalOtrosMetodos = result.otrosMetodos.reduce(
      (sum, m) => sum + Number(m.monto_usd),
      0
    );

    const totalGeneral =
      totalEfectivoUSD +
      totalEfectivoBS +
      totalOtrosEfectivo +
      totalDepositos +
      totalOtrosMetodos;

    return Response.json({
      ok: true,
      data: {
        periodo: { anio, mes },
        efectivo: {
          por_caja: result.efectivoPorCaja.map((c) => ({
            cod_caja: c.cod_caja,
            descripcion_caja: c.descripcion_caja,
            moneda_original: c.moneda_original,
            cantidad_cobros: c.cantidad_cobros,
            monto_moneda_original: Number(c.monto_moneda_original),
            monto_usd: Number(c.monto_usd),
          })),
          total_efectivo_usd: Number(
            (totalEfectivoUSD + totalEfectivoBS + totalOtrosEfectivo).toFixed(2)
          ),
          total_efectivo_usd_caja: Number(totalEfectivoUSD.toFixed(2)),
          total_efectivo_bs_a_usd: Number(totalEfectivoBS.toFixed(2)),
        },
        depositos: {
        por_banco: result.depositosPorBanco.map((b) => ({
            codigo_completo: b.codigo_completo,
            codigo_banco: b.codigo_banco,
            numero_cuenta: b.numero_cuenta,
            nombre_banco: b.nombre_banco || `Banco ${b.codigo_banco}`,
            moneda_original: b.moneda_original,
            cantidad_depositos: b.cantidad_depositos,
            monto_moneda_original: Number(b.monto_moneda_original),
            monto_usd: Number(b.monto_usd),
        })),
        total_depositos_usd: Number(totalDepositos.toFixed(2)),
        },
        otros_metodos: result.otrosMetodos.map((m) => ({
          forma_pago: m.forma_pago,
          cantidad: m.cantidad,
          monto_moneda_original: Number(m.monto_moneda_original),
          moneda: m.moneda,
          monto_usd: Number(m.monto_usd),
        })),
        total_general_usd: Number(totalGeneral.toFixed(2)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}