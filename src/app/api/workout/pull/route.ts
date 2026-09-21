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

    let workoutRow;
    if (workoutIdParam) {
      const res = await db.execute({
        sql: `SELECT * FROM workouts WHERE id = ? LIMIT 1`,
        args: [Number(workoutIdParam)],
      });
      workoutRow = res.rows[0];
    } else if (dateParam) {
      const res = await db.execute({
        sql: `SELECT * FROM workouts WHERE date = ? ORDER BY id DESC LIMIT 1`,
        args: [dateParam],
      });
      workoutRow = res.rows[0];
    } else {
      // Default: Most recent completed workout, or latest active
      const res = await db.execute(`
        SELECT * FROM workouts 
        ORDER BY CASE status WHEN 'completed' THEN 1 ELSE 2 END, id DESC 
        LIMIT 1
      `);
      workoutRow = res.rows[0];
    }

    if (!workoutRow) {
      return NextResponse.json({ workout: null, message: "No workouts found." });
    }

    const workoutId = Number(workoutRow.id);

    const exercisesRes = await db.execute({
      sql: `SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index ASC, id ASC`,
      args: [workoutId],
    });

    const setsRes = await db.execute({
      sql: `SELECT * FROM workout_sets WHERE workout_id = ? ORDER BY id ASC`,
      args: [workoutId],
    });

    // Compute volume, sets, and 1RM
    let totalVolume = 0;
    let completedSetsCount = 0;
    const exerciseSummaries: Record<
      string,
      {
        target: { sets: number; reps?: string; weight?: number };
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

    for (const exRow of exercisesRes.rows) {
      const name = String(exRow.name);
      exerciseSummaries[name] = {
        target: {
          sets: Number(exRow.target_sets),
          reps: exRow.target_reps ? String(exRow.target_reps) : undefined,
          weight: Number(exRow.target_weight),
        },
        sets: [],
        total_volume: 0,
        max_weight: 0,
        best_estimated_1rm: 0,
      };
    }

    for (const s of setsRes.rows) {
      const name = String(s.exercise_name);
      if (!exerciseSummaries[name]) {
        exerciseSummaries[name] = {
          target: { sets: 0, weight: 0 },
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
        rpe: s.rpe !== null ? Number(s.rpe) : null,
        completed,
        volume,
        estimated_1rm: e1rm,
      });
    }

    return NextResponse.json({
      success: true,
      workout: {
        id: workoutId,
        title: String(workoutRow.title),
        date: String(workoutRow.date),
        status: String(workoutRow.status),
        notes: workoutRow.notes ? String(workoutRow.notes) : null,
        created_at: String(workoutRow.created_at),
        started_at: workoutRow.started_at ? String(workoutRow.started_at) : null,
        completed_at: workoutRow.completed_at ? String(workoutRow.completed_at) : null,
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
