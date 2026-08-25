import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT TOP 500
          TABLE_SCHEMA,
          TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
      `);
    });

    return Response.json({
      ok: true,
      service: "profit",
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        ok: false,
        service: "profit",
        error: message,
      },
      { status: 500 }
    );
  }
}