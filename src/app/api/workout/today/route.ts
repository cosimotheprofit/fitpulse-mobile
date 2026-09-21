import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { WorkoutSessionData, WorkoutExerciseData, WorkoutSetData } from "@/types/workout";

export const dynamic = "force-dynamic";

interface RoutineExerciseDef {
  name: string;
  muscle_group: string;
  target_sets: number;
  target_reps: string;
  default_weight: number;
  notes?: string;
  aliases?: string[];
}

const SCHEDULED_ROUTINES: Record<
  string,
  { code: string; title: string; notes: string; exercises: RoutineExerciseDef[] }
> = {
  A: {
    code: "A",
    title: "Full Body A (Bench, Rows & Hack Squats)",
    notes: "Chest Mass, Back Thickness, Quad Overload & Arm Growth",
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "Chest",
        target_sets: 3,
        target_reps: "6-10",
        default_weight: 135,
        notes: "Controlled 3s eccentric, touch mid-chest, drive up with leg drive",
      },
      {
        name: "Dumbbell Bent-Over Row",
        muscle_group: "Back",
        target_sets: 3,
        target_reps: "10",
        default_weight: 45,
        notes: "Support on bench or hinge, pull DB to hip with full lat stretch at bottom",
        aliases: ["Barbell Bent-Over Row"],
      },
      {
        name: "Hack Squat Machine",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 90,
        notes: "Deep knee travel over toes, controlled descent, lower back glued to pad",
        aliases: ["Hack Squat"],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 20,
        notes: "Scapular plane (30° forward), smooth continuous cable tension",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
      },
      {
        name: "Cable Rear Delt Fly",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 20,
        notes: "Reach wide to sides, squeeze posterior deltoids",
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 35,
        notes: "Supinate at top, strict eccentric for bicep peak",
        aliases: ["Bicep Curl", "Dumbbell Bicep Curl", "Bicep Curls (DB or Cable)"],
      },
    ],
  },
  B: {
    code: "B",
    title: "Full Body B (Incline & Pull-ups)",
    notes: "Upper Chest Stretch, Lat Width, Hamstrings & Capped Shoulders",
    exercises: [
      {
        name: "Incline Bench",
        muscle_group: "Chest",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 105,
        notes: "30° incline, deep stretch on clavicular head",
        aliases: ["Incline Dumbbell Press", "Incline Barbell Bench"],
      },
      {
        name: "Pull-ups",
        muscle_group: "Back",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: -31.5,
        notes: "Dead hang stretch at bottom, drive elbows down to ribs",
        aliases: ["Assisted Pull-ups"],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 145,
        notes: "Slow 2s negative, squeeze hamstrings at peak contraction",
        aliases: ["Lying Leg Curl", "Seated Leg Curl"],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 105,
        notes: "Constant quad tension, pause 1s at top",
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 15,
        notes: "Side delt burn, no swinging",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
      },
      {
        name: "Face Pull",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 50,
        notes: "Pull to eyes/forehead, externally rotate at peak",
        aliases: ["Face Pulls"],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 35,
        notes: "Strict form, focus on brachialis and bicep",
        aliases: ["Bicep Curl", "Bicep Curls (Incline DB or Hammer)"],
      },
    ],
  },
  LEGS: {
    code: "LEGS",
    title: "Pre-Vacation Leg Overload (Quads & Hamstrings)",
    notes: "Quad & Hamstring Hypertrophy Overload before 5-day vacation deload",
    exercises: [
      {
        name: "Hack Squat Machine",
        muscle_group: "Legs",
        target_sets: 4,
        target_reps: "8-10",
        default_weight: 90,
        notes: "Deep knee travel over toes, controlled descent, lower back glued to pad",
        aliases: ["Hack Squat"],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 4,
        target_reps: "10-12",
        default_weight: 145,
        notes: "Slow 2s negative, squeeze hamstrings at peak contraction",
        aliases: ["Lying Leg Curl", "Seated Leg Curl"],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 4,
        target_reps: "10-12",
        default_weight: 105,
        notes: "Constant quad tension, pause 1s at top",
      },
      {
        name: "Leg Press",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 350,
        notes: "High foot placement, controlled pump volume",
        aliases: ["Horizontal Leg Press", "Cybex Leg Press"],
      },
      {
        name: "Seated Levator Scapulae Stretch",
        muscle_group: "Neck",
        target_sets: 2,
        target_reps: "30s",
        default_weight: 0,
        notes: "Gently turn chin toward armpit, breathe deep",
      },
    ],
  },
};

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const url = new URL(req.url);

    // Client date parameter or current date (YYYY-MM-DD)
    const clientDateParam = url.searchParams.get("date");
    const requestedRoutine = url.searchParams.get("routine"); // e.g. "A" or "B"

    const todayStr =
      clientDateParam ||
      new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

    // 1. Check for active session in workout_sessions (end_time IS NULL)
    const activeSessionRes = await db.execute(`
      SELECT * FROM workout_sessions 
      WHERE end_time IS NULL 
      ORDER BY start_time DESC 
      LIMIT 1
    `);

    let sessionRow = activeSessionRes.rows[0];

    // 2. If no active session, check for a completed session specifically from today
    if (!sessionRow) {
      const todaySessionRes = await db.execute({
        sql: `SELECT * FROM workout_sessions WHERE start_time LIKE ? AND end_time IS NOT NULL ORDER BY id DESC LIMIT 1`,
        args: [`${todayStr}%`],
      });
      sessionRow = todaySessionRes.rows[0];
    }

    // If an active session or a session completed TODAY exists, return it
    if (sessionRow) {
      const sessionId = Number(sessionRow.id);
      const isCompleted = sessionRow.end_time !== null;

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

      const exercisesMap = new Map<
        string,
        {
          name: string;
          muscle_group?: string;
          sets: WorkoutSetData[];
        }
      >();

      for (const row of setsRes.rows) {
        const exName = String(row.exercise_name);
        if (!exercisesMap.has(exName)) {
          exercisesMap.set(exName, {
            name: exName,
            muscle_group: row.muscle_group ? String(row.muscle_group) : undefined,
            sets: [],
          });
        }
        exercisesMap.get(exName)!.sets.push({
          id: Number(row.id),
          exercise_name: exName,
          set_number: Number(row.set_number),
          weight: Number(row.weight || 0),
          reps: Number(row.reps || 0),
          rpe: row.rpe !== null ? Number(row.rpe) : null,
          completed: Boolean(row.completed),
        });
      }

      const exercises: WorkoutExerciseData[] = Array.from(exercisesMap.values()).map(
        (ex) => {
          const firstSet = ex.sets[0];
          return {
            name: ex.name,
            muscle_group: ex.muscle_group,
            target_sets: ex.sets.length,
            target_reps: firstSet && firstSet.reps > 0 ? String(firstSet.reps) : "10",
            target_weight: firstSet ? firstSet.weight : 0,
            sets: ex.sets,
          };
        }
      );

      const dateStr =
        String(sessionRow.start_time).split(" ")[0] || todayStr;

      const workout: WorkoutSessionData = {
        id: sessionId,
        title: String(sessionRow.name),
        date: dateStr,
        notes: sessionRow.notes ? String(sessionRow.notes) : undefined,
        status: isCompleted ? "completed" : "in_progress",
        created_at: String(sessionRow.start_time),
        started_at: String(sessionRow.start_time),
        completed_at: sessionRow.end_time ? String(sessionRow.end_time) : null,
        exercises,
      };

      return NextResponse.json({ workout, isScheduled: false });
    }

    // 3. No session recorded for today. Look up the scheduled calendar routine!
    // Parse target date to find day of week
    const [y, m, d] = todayStr.split("-").map(Number);
    const targetDate = new Date(y, m - 1, d);
    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

    let routineKey: string | null = requestedRoutine?.toUpperCase() || null;
    let isVacation = false;

    if (!routineKey) {
      if (todayStr === "2026-09-24") {
        routineKey = "LEGS"; // Pre-vacation leg overload
      } else if (todayStr >= "2026-09-25" && todayStr <= "2026-09-29") {
        isVacation = true;
      } else if (dayOfWeek === 1 || dayOfWeek === 5) {
        routineKey = "A"; // Monday & Friday: Full Body A
      } else if (dayOfWeek === 3) {
        routineKey = "B"; // Wednesday: Full Body B
      }
    }

    if (isVacation) {
      return NextResponse.json({
        workout: null,
        isVacation: true,
        isRestDay: true,
        dayOfWeek,
        date: todayStr,
        nextRoutine: "A",
        message: "🌴 Vacation Deload: Systemic recovery & supercompensation window. Enjoy your trip!",
      });
    }

    // If it's a rest day and no routine was forced
    if (!routineKey || !SCHEDULED_ROUTINES[routineKey]) {
      return NextResponse.json({
        workout: null,
        isRestDay: true,
        dayOfWeek,
        date: todayStr,
        nextRoutine: "A",
        message: "Today is a scheduled Rest & Recovery day. Muscles rebuild during rest!",
      });
    }

    // Build the scheduled routine with user's previous working weights from fitness.db
    const routineDef = SCHEDULED_ROUTINES[routineKey];
    const exercises: WorkoutExerciseData[] = [];

    for (const exDef of routineDef.exercises) {
      // Find latest completed weight & reps for this exercise
      const namesToCheck = [exDef.name, ...(exDef.aliases || [])];
      let bestWeight = exDef.default_weight;
      let bestReps = 10;

      for (const nameCandidate of namesToCheck) {
        const prevRes = await db.execute({
          sql: `
            SELECT ws.weight, ws.reps
            FROM workout_sets ws
            JOIN workout_sessions s ON ws.session_id = s.id
            JOIN exercises e ON ws.exercise_id = e.id
            WHERE LOWER(e.name) = LOWER(?) AND ws.completed = 1 AND s.end_time IS NOT NULL
            ORDER BY s.start_time DESC, ws.id DESC
            LIMIT 1
          `,
          args: [nameCandidate],
        });

        if (prevRes.rows.length > 0) {
          bestWeight = Number(prevRes.rows[0].weight || bestWeight);
          bestReps = Number(prevRes.rows[0].reps || bestReps);
          break;
        }
      }

      const sets: WorkoutSetData[] = Array.from(
        { length: exDef.target_sets },
        (_, idx) => ({
          exercise_name: exDef.name,
          set_number: idx + 1,
          weight: bestWeight,
          reps: bestReps,
          completed: false,
        })
      );

      exercises.push({
        name: exDef.name,
        muscle_group: exDef.muscle_group,
        target_sets: exDef.target_sets,
        target_reps: exDef.target_reps,
        target_weight: bestWeight,
        notes: exDef.notes,
        sets,
      });
    }

    const scheduledWorkout: WorkoutSessionData = {
      id: Date.now(),
      title: routineDef.title,
      date: todayStr,
      notes: routineDef.notes,
      status: "queued",
      created_at: new Date().toISOString(),
      exercises,
    };

    return NextResponse.json({
      workout: scheduledWorkout,
      isScheduled: true,
      routineCode: routineKey,
      dayOfWeek,
      date: todayStr,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch today's workout:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch workout",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
