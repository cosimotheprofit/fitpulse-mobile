import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { PushWorkoutPayload } from "@/types/workout";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true; // If no secret configured, allow access (MVP mode)

  const authHeader = req.headers.get("authorization");
  const apiKey = req.headers.get("x-api-key");
  if (apiKey === secret) return true;
  if (authHeader && authHeader.startsWith("Bearer ") && authHeader.slice(7) === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initDb();
    const db = getDb();
    const body: PushWorkoutPayload = await req.json();

    if (!body.title || !body.exercises || !Array.isArray(body.exercises)) {
      return NextResponse.json(
        { error: "Invalid workout payload. 'title' and 'exercises' array are required." },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const date = body.date || todayStr;
    const notes = body.notes || "";

    // Insert workout
    const insertWorkoutRes = await db.execute({
      sql: `INSERT INTO workouts (title, date, notes, status) VALUES (?, ?, ?, 'queued') RETURNING id`,
      args: [body.title, date, notes],
    });

    const workoutId = Number(insertWorkoutRes.rows[0]?.id || insertWorkoutRes.lastInsertRowid);

    // Insert exercises and default initial sets
    for (let i = 0; i < body.exercises.length; i++) {
      const ex = body.exercises[i];
      const targetSets = ex.target_sets || 3;
      const targetWeight = ex.target_weight || 0;
      const targetReps = ex.target_reps || "10";

      await db.execute({
        sql: `INSERT INTO workout_exercises (workout_id, name, muscle_group, target_sets, target_reps, target_weight, order_index, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          workoutId,
          ex.name,
          ex.muscle_group || "General",
          targetSets,
          targetReps,
          targetWeight,
          i,
          ex.notes || "",
        ],
      });

      // Parse suggested numeric reps if possible (e.g. "8-10" -> 10, or "10" -> 10)
      const numRepsMatch = targetReps.match(/\d+/g);
      const defaultReps = numRepsMatch ? Number(numRepsMatch[numRepsMatch.length - 1]) : 10;

      for (let s = 1; s <= targetSets; s++) {
        await db.execute({
          sql: `INSERT INTO workout_sets (workout_id, exercise_name, set_number, weight, reps, completed)
                VALUES (?, ?, ?, ?, ?, 0)`,
          args: [workoutId, ex.name, s, targetWeight, defaultReps],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Workout "${body.title}" successfully queued!`,
      workout_id: workoutId,
      date,
      exercise_count: body.exercises.length,
    });
  } catch (err: unknown) {
    console.error("Failed to push workout:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
