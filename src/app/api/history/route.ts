import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("session_id");

    if (sessionId) {
      // Get detailed sets for specific session
      const sessionRes = await db.execute({
        sql: `SELECT * FROM workout_sessions WHERE id = ?`,
        args: [Number(sessionId)],
      });
      if (sessionRes.rows.length === 0) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const setsRes = await db.execute({
        sql: `
          SELECT ws.*, e.name as exercise_name, e.muscle_group, e.category
          FROM workout_sets ws
          LEFT JOIN exercises e ON ws.exercise_id = e.id
          WHERE ws.session_id = ?
          ORDER BY ws.id ASC
        `,
        args: [Number(sessionId)],
      });

      return NextResponse.json({
        session: sessionRes.rows[0],
        sets: setsRes.rows,
      });
    }

    // List recent sessions
    const sessionsRes = await db.execute(`
      SELECT s.id, s.name, s.start_time, s.end_time, s.notes,
             COUNT(ws.id) as total_sets,
             COUNT(CASE WHEN ws.completed = 1 THEN 1 END) as completed_sets,
             COALESCE(SUM(CASE WHEN ws.completed = 1 AND ws.reps > 0 THEN ws.weight * ws.reps ELSE 0 END), 0) as total_volume_lbs
      FROM workout_sessions s
      LEFT JOIN workout_sets ws ON s.id = ws.session_id
      GROUP BY s.id
      ORDER BY s.start_time DESC
      LIMIT 50
    `);

    return NextResponse.json({
      sessions: sessionsRes.rows,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch workout history:", err);
    return NextResponse.json(
      { error: "Failed to fetch workout history", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
