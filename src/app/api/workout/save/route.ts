import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { SaveWorkoutPayload } from "@/types/workout";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const body: SaveWorkoutPayload = await req.json();

    if (!body.workout_id) {
      return NextResponse.json({ error: "workout_id is required" }, { status: 400 });
    }

    let sessionId = body.workout_id;
    const isFinishing = body.status === "completed";
    const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Verify if session exists in workout_sessions
    const sessionCheck = await db.execute({
      sql: `SELECT id FROM workout_sessions WHERE id = ?`,
      args: [sessionId],
    });

    if (sessionCheck.rows.length === 0) {
      const insertSessionRes = await db.execute({
        sql: `INSERT INTO workout_sessions (name, start_time, end_time, notes) VALUES (?, ?, ?, ?)`,
        args: [
          body.title || "Full Body Workout",
          nowIso,
          isFinishing ? nowIso : null,
          body.notes || null,
        ],
      });
      sessionId = Number(insertSessionRes.lastInsertRowid);
    } else if (isFinishing) {
      await db.execute({
        sql: `UPDATE workout_sessions SET end_time = ?, notes = COALESCE(?, notes) WHERE id = ?`,
        args: [nowIso, body.notes || null, sessionId],
      });
    }

    // Process exercises and sets
    if (body.exercises && Array.isArray(body.exercises)) {
      for (const ex of body.exercises) {
        // Find exercise id
        const exIdRes = await db.execute({
          sql: `SELECT id FROM exercises WHERE LOWER(name) = LOWER(?) LIMIT 1`,
          args: [ex.name],
        });

        let exerciseId: number;
        if (exIdRes.rows.length === 0) {
          const insertExRes = await db.execute({
            sql: `INSERT INTO exercises (name, category, muscle_group) VALUES (?, 'Strength', 'Other') RETURNING id`,
            args: [ex.name],
          });
          exerciseId = Number(insertExRes.rows[0]?.id || insertExRes.lastInsertRowid);
        } else {
          exerciseId = Number(exIdRes.rows[0].id);
        }

        // Clean out existing sets for this session & exercise and re-insert logged sets
        await db.execute({
          sql: `DELETE FROM workout_sets WHERE session_id = ? AND exercise_id = ?`,
          args: [sessionId, exerciseId],
        });

        for (const s of ex.sets) {
          await db.execute({
            sql: `
              INSERT INTO workout_sets (session_id, exercise_id, set_number, set_type, weight, reps, rpe, completed)
              VALUES (?, ?, ?, 'normal', ?, ?, ?, ?)
            `,
            args: [
              sessionId,
              exerciseId,
              s.set_number,
              s.weight,
              s.reps,
              s.rpe !== undefined ? s.rpe : null,
              s.completed ? 1 : 0,
            ],
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Workout #${sessionId} saved directly to FitPulse database!`,
      status: body.status,
      completed_at: isFinishing ? nowIso : null,
    });
  } catch (err: unknown) {
    console.error("Failed to save workout:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
