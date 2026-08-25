import { withProfitPool } from "@/lib/db/profit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await withProfitPool(async (request) => {
      return request.query(`
        SELECT 
          @@VERSION AS version_sql_server,
          DB_NAME() AS database_name,
          SYSTEM_USER AS login_actual
      `);
    });

    return Response.json({
      ok: true,
      service: "profit",
      data: result.recordset[0],
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