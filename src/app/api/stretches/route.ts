import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT * FROM stretches 
      ORDER BY is_core_routine DESC, display_order ASC, id ASC
    `);

    return NextResponse.json({
      stretches: res.rows,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch stretches:", err);
    return NextResponse.json(
      { error: "Failed to fetch stretches", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
