import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  if (apiKey === secret) return true;
  if (authHeader && authHeader.startsWith("Bearer ") && authHeader.slice(7) === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();
    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    const workoutIdParam = searchParams.get("workout_id");
    const dateParam = searchParams.get("date");

    let sessionRow;
    if (workoutIdParam) {
      const res = await db.execute({
        sql: `SELECT * FROM workout_sessions WHERE id = ? LIMIT 1`,
        args: [Number(workoutIdParam)],
      });
      sessionRow = res.rows[0];
    } else if (dateParam) {
      const res = await db.execute({
        sql: `SELECT * FROM workout_sessions WHERE start_time LIKE ? ORDER BY id DESC LIMIT 1`,
        args: [`${dateParam}%`],
      });
      sessionRow = res.rows[0];
    } else {
      // Default: Most recent completed workout session, or latest active
      const res = await db.execute(`
        SELECT * FROM workout_sessions 
        ORDER BY CASE WHEN end_time IS NOT NULL THEN 1 ELSE 2 END, id DESC 
        LIMIT 1
      `);
      sessionRow = res.rows[0];
    }

    if (!sessionRow) {
      return NextResponse.json({ workout: null, message: "No workout sessions found." });
    }

    const sessionId = Number(sessionRow.id);

    const setsRes = await db.execute({
      sql: `
        SELECT ws.*, e.name as exercise_name, e.muscle_group, e.category
        FROM workout_sets ws
        JOIN exercises e ON ws.exercise_id = e.id
        WHERE ws.session_id = ?
        ORDER BY ws.id ASC
      `,
      args: [sessionId],
    });

    let totalVolume = 0;
    let completedSetsCount = 0;
    const exerciseSummaries: Record<
      string,
      {
        muscle_group: string;
        sets: {
          set_number: number;
          weight: number;
          reps: number;
          rpe?: number | null;
          completed: boolean;
          volume: number;
          estimated_1rm: number;
        }[];
        total_volume: number;
        max_weight: number;
        best_estimated_1rm: number;
      }
    > = {};

    for (const s of setsRes.rows) {
      const name = String(s.exercise_name);
      if (!exerciseSummaries[name]) {
        exerciseSummaries[name] = {
          muscle_group: String(s.muscle_group || "Other"),
          sets: [],
          total_volume: 0,
          max_weight: 0,
          best_estimated_1rm: 0,
        };
      }

      const weight = Number(s.weight);
      const reps = Number(s.reps);
      const completed = Boolean(s.completed);
      const volume = completed ? weight * reps : 0;
      // Epley Formula: 1RM = Weight * (1 + Reps / 30)
      const e1rm = completed && reps > 0 ? Math.round(weight * (1 + reps / 30)) : weight;

      if (completed) {
        totalVolume += volume;
        completedSetsCount++;
        exerciseSummaries[name].total_volume += volume;
        if (weight > exerciseSummaries[name].max_weight) {
          exerciseSummaries[name].max_weight = weight;
        }
        if (e1rm > exerciseSummaries[name].best_estimated_1rm) {
          exerciseSummaries[name].best_estimated_1rm = e1rm;
        }
      }

      exerciseSummaries[name].sets.push({
        set_number: Number(s.set_number),
        weight,
        reps,
        rpe: s.rpe !== null && s.rpe !== undefined ? Number(s.rpe) : null,
        completed,
        volume,
        estimated_1rm: e1rm,
      });
    }

    const dateStr = String(sessionRow.start_time).split(" ")[0];

    return NextResponse.json({
      success: true,
      workout: {
        id: sessionId,
        title: String(sessionRow.name),
        date: dateStr,
        status: sessionRow.end_time ? "completed" : "in_progress",
        notes: sessionRow.notes ? String(sessionRow.notes) : null,
        created_at: String(sessionRow.created_at || sessionRow.start_time),
        started_at: String(sessionRow.start_time),
        completed_at: sessionRow.end_time ? String(sessionRow.end_time) : null,
        summary: {
          total_volume_lbs: totalVolume,
          completed_sets: completedSetsCount,
          total_exercises: Object.keys(exerciseSummaries).length,
        },
        exercises: exerciseSummaries,
      },
    });
  } catch (err: unknown) {
    console.error("Failed to pull workout:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
