import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    // Fetch exercises with highest completed weight (PR) from workout_sets
    const res = await db.execute(`
      SELECT e.id, e.name, e.category, e.muscle_group, e.equipment, e.notes,
             COALESCE(MAX(CASE WHEN ws.completed = 1 THEN ws.weight ELSE 0 END), 0) as pr_weight,
             COUNT(CASE WHEN ws.completed = 1 THEN 1 END) as total_sets_completed
      FROM exercises e
      LEFT JOIN workout_sets ws ON e.id = ws.exercise_id
      GROUP BY e.id
      ORDER BY e.muscle_group ASC, e.name ASC
    `);

    // Group by muscle group
    const groups: Record<string, Record<string, unknown>[]> = {};
    for (const row of res.rows) {
      const mg = String(row.muscle_group || "Other");
      if (!groups[mg]) groups[mg] = [];
      groups[mg].push({
        id: Number(row.id),
        name: String(row.name),
        category: String(row.category),
        muscle_group: mg,
        equipment: row.equipment ? String(row.equipment) : "None",
        pr_weight: Number(row.pr_weight),
        total_sets: Number(row.total_sets_completed),
        notes: row.notes ? String(row.notes) : null,
      });
    }

    return NextResponse.json({
      groups,
      total_count: res.rows.length,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch exercise catalog:", err);
    return NextResponse.json(
      { error: "Failed to fetch exercise catalog", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
