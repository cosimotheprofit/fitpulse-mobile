import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    // Fetch body metrics ordered by date ascending for moving average calculation
    const metricsRes = await db.execute(`
      SELECT id, date, weight_lbs, weight_kg, body_fat_pct, notes 
      FROM body_metrics 
      ORDER BY date ASC
    `);

    // Fetch target weight
    const targetRes = await db.execute(`
      SELECT value FROM user_settings WHERE key = 'target_weight_lbs' LIMIT 1
    `);
    const targetWeight = targetRes.rows[0] ? parseFloat(String(targetRes.rows[0].value)) : 177.0;

    // Calculate 7-day rolling moving average
    const records = metricsRes.rows.map((row, index) => {
      const weight = Number(row.weight_lbs || (row.weight_kg ? Number(row.weight_kg) * 2.20462 : 0));
      // Look back up to 7 previous entries
      const startIdx = Math.max(0, index - 6);
      const window = metricsRes.rows.slice(startIdx, index + 1);
      const sum = window.reduce((acc, r) => acc + Number(r.weight_lbs || (r.weight_kg ? Number(r.weight_kg) * 2.20462 : 0)), 0);
      const avg = Math.round((sum / window.length) * 10) / 10;

      return {
        id: Number(row.id),
        date: String(row.date),
        weight_lbs: Math.round(weight * 10) / 10,
        body_fat_pct: row.body_fat_pct !== null ? Number(row.body_fat_pct) : null,
        moving_avg_7d: avg,
        notes: row.notes ? String(row.notes) : null,
      };
    });

    // Reverse for descending presentation in UI
    const reversed = [...records].reverse();
    const latest = reversed[0] || null;

    return NextResponse.json({
      target_weight_lbs: targetWeight,
      latest,
      history: reversed.slice(0, 50), // Last 50 entries
      total_count: records.length,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch body metrics:", err);
    return NextResponse.json(
      { error: "Failed to fetch body metrics", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();

    const date = body.date || new Date().toISOString().split("T")[0];
    const weightLbs = parseFloat(body.weight_lbs);
    if (isNaN(weightLbs) || weightLbs <= 0) {
      return NextResponse.json({ error: "Valid weight in lbs is required" }, { status: 400 });
    }

    const weightKg = Math.round((weightLbs / 2.20462) * 100) / 100;
    const bodyFat = body.body_fat_pct ? parseFloat(body.body_fat_pct) : null;
    const notes = body.notes || null;

    await db.execute({
      sql: `INSERT INTO body_metrics (date, weight_lbs, weight_kg, body_fat_pct, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [date, weightLbs, weightKg, bodyFat, notes],
    });

    return NextResponse.json({
      success: true,
      message: `Logged weigh-in of ${weightLbs} lbs for ${date}!`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
