import { queryPostgres } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await queryPostgres("SELECT NOW() AS now");

    return Response.json({
      ok: true,
      service: "postgres",
      data: result.rows[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      {
        ok: false,
        service: "postgres",
        error: message,
      },
      { status: 500 }
    );
  }
}