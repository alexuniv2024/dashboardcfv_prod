import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Función para formatear fecha a YYYY-MM-DD sin problemas de timezone
function formatFechaLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const result = await withProfitPool(async (req) => {
      // 1. Obtener la última fecha con facturas
      const ultimaResult = await req.query(`
        SELECT CONVERT(VARCHAR(10), MAX(CAST(fec_emis AS DATE)), 23) AS ultima_fecha
        FROM factura
        WHERE anulada = 0
      `);

      const ultimaFecha = ultimaResult.recordset[0]?.ultima_fecha;

      // Si no hay datos, devolver estructura vacía
      if (!ultimaFecha) {
        return {
          empty: true,
          ultimaFecha: null,
          fechaInicio: null,
          fechaFin: null,
          esDataReciente: false,
          ventas: [],
        };
      }

      // 2. Calcular fecha de inicio (7 días hacia atrás)
      const ultimaDate = new Date(ultimaFecha + "T00:00:00");
      const inicioDate = new Date(ultimaDate);
      inicioDate.setDate(inicioDate.getDate() - 6);
      const fechaInicio = formatFechaLocal(inicioDate);

      // 3. Obtener ventas del rango
      req.input("fecha_inicio", fechaInicio);
      req.input("fecha_fin", ultimaFecha);
      const ventasResult = await req.query(`
        SELECT 
          CONVERT(VARCHAR(10), CAST(fec_emis AS DATE), 23) AS fecha,
          COUNT(fact_num) AS total_facturas,
          ISNULL(SUM(tot_neto / NULLIF(tasa, 0)), 0) AS total_ventas_usd
        FROM factura
        WHERE CAST(fec_emis AS DATE) >= CAST(@fecha_inicio AS DATE)
          AND CAST(fec_emis AS DATE) <= CAST(@fecha_fin AS DATE)
          AND anulada = 0
        GROUP BY CAST(fec_emis AS DATE)
        ORDER BY CAST(fec_emis AS DATE) ASC
      `);

      return {
        empty: false,
        ultimaFecha,
        fechaInicio,
        fechaFin: ultimaFecha,
        ventas: ventasResult.recordset,
      };
    });

    // 4. Determinar si la data es reciente (últimos 7 días reales)
    let esDataReciente = false;
    if (result.ultimaFecha) {
      const hoy = new Date();
      const hoyStr = formatFechaLocal(hoy);
      const diffMs =
        new Date(hoyStr + "T00:00:00").getTime() -
        new Date(result.ultimaFecha + "T00:00:00").getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      esDataReciente = diffDias <= 7;
    }

    return Response.json({
      ok: true,
      ultima_fecha: result.ultimaFecha,
      fecha_inicio: result.fechaInicio,
      fecha_fin: result.fechaFin,
      es_data_reciente: esDataReciente,
      data: result.ventas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}