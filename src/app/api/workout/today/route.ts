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
  planned_sets?: { weight: number; reps: number }[];
}

const SCHEDULED_ROUTINES: Record<
  string,
  { code: string; title: string; notes: string; exercises: RoutineExerciseDef[] }
> = {
  A: {
    code: "A",
    title: "Full Body A (Bench, Rows & Arms)",
    notes: "Chest Mass, Back Thickness, Lateral Shoulders & Arm Overload — Progressive Overload",
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "Chest",
        target_sets: 3,
        target_reps: "7-8",
        default_weight: 140,
        notes: "Weight Overload Bump: 140 lbs for 7-8 reps (crushed 135 lbs for 8, 8, 10 on Monday)",
        planned_sets: [
          { weight: 140, reps: 8 },
          { weight: 140, reps: 8 },
          { weight: 140, reps: 7 },
        ],
      },
      {
        name: "Dumbbell Bent-Over Row",
        muscle_group: "Back",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 75,
        notes: "Weight Overload Bump: step up to 75 lbs DBs for 8-10 reps (mastered 70 lbs x 10, 10, 10 on Monday)",
        aliases: ["Barbell Bent-Over Row"],
        planned_sets: [
          { weight: 75, reps: 10 },
          { weight: 75, reps: 10 },
          { weight: 75, reps: 8 },
        ],
      },
      {
        name: "Overhead cable triceps extension",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 42.5,
        notes: "Progressive Overload Ramp: start working sets at 35 lbs, ramp through 42.5 lbs, push top set to 45 lbs (Monday hit 42.5 lbs x 10)",
        aliases: ["Overhead Cable Triceps Extension", "Tricep Overhead Extension", "Tricep Extension", "Skull Crushers", "Tricep Rope Pushdown"],
        planned_sets: [
          { weight: 35, reps: 12 },
          { weight: 42.5, reps: 10 },
          { weight: 45, reps: 10 },
        ],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "11-12",
        default_weight: 20,
        notes: "Rep / Volume Overload: 20 lbs across all 3 sets for 11-12 strict reps (Monday hit 10, 10, 11)",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
        planned_sets: [
          { weight: 20, reps: 11 },
          { weight: 20, reps: 11 },
          { weight: 20, reps: 12 },
        ],
      },
      {
        name: "Cable Rear Delt Fly",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 20,
        notes: "Rep Overload: 20 lbs for 12, 12, 12+ reps with 1s peak contraction squeeze (Monday hit 10, 10, 12)",
        aliases: ["Rear Delt Fly", "Cable Rear Delt Flyes"],
        planned_sets: [
          { weight: 20, reps: 12 },
          { weight: 20, reps: 12 },
          { weight: 20, reps: 12 },
        ],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 70,
        notes: "Rep Overload & Peak Overload: 70 lbs for 12, 12 reps, attempt 75 lbs on Set 3 (Monday hit 70 lbs for 10, 10, 12)",
        aliases: ["Bicep Curl", "Dumbbell Bicep Curl", "Bicep Curls (DB or Cable)"],
        planned_sets: [
          { weight: 70, reps: 12 },
          { weight: 70, reps: 12 },
          { weight: 75, reps: 8 },
        ],
      },
    ],
  },
  A_UPPER: {
    code: "A_UPPER",
    title: "Workout A (Upper Mass · Progressive Overload)",
    notes: "Chest Mass, Back Thickness, Lateral Shoulders & Arm Overload — Progressive Overload",
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "Chest",
        target_sets: 3,
        target_reps: "7-8",
        default_weight: 140,
        notes: "Weight Overload Bump: 140 lbs for 7-8 reps (crushed 135 lbs for 8, 8, 10 on Monday)",
        planned_sets: [
          { weight: 140, reps: 8 },
          { weight: 140, reps: 8 },
          { weight: 140, reps: 7 },
        ],
      },
      {
        name: "Dumbbell Bent-Over Row",
        muscle_group: "Back",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 75,
        notes: "Weight Overload Bump: step up to 75 lbs DBs for 8-10 reps (mastered 70 lbs x 10, 10, 10 on Monday)",
        aliases: ["Barbell Bent-Over Row"],
        planned_sets: [
          { weight: 75, reps: 10 },
          { weight: 75, reps: 10 },
          { weight: 75, reps: 8 },
        ],
      },
      {
        name: "Overhead cable triceps extension",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 42.5,
        notes: "Progressive Overload Ramp: start working sets at 35 lbs, ramp through 42.5 lbs, push top set to 45 lbs (Monday hit 42.5 lbs x 10)",
        aliases: ["Overhead Cable Triceps Extension", "Tricep Overhead Extension", "Tricep Extension", "Skull Crushers", "Tricep Rope Pushdown"],
        planned_sets: [
          { weight: 35, reps: 12 },
          { weight: 42.5, reps: 10 },
          { weight: 45, reps: 10 },
        ],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "11-12",
        default_weight: 20,
        notes: "Rep / Volume Overload: 20 lbs across all 3 sets for 11-12 strict reps (Monday hit 10, 10, 11)",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
        planned_sets: [
          { weight: 20, reps: 11 },
          { weight: 20, reps: 11 },
          { weight: 20, reps: 12 },
        ],
      },
      {
        name: "Cable Rear Delt Fly",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 20,
        notes: "Rep Overload: 20 lbs for 12, 12, 12+ reps with 1s peak contraction squeeze (Monday hit 10, 10, 12)",
        aliases: ["Rear Delt Fly", "Cable Rear Delt Flyes"],
        planned_sets: [
          { weight: 20, reps: 12 },
          { weight: 20, reps: 12 },
          { weight: 20, reps: 12 },
        ],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 70,
        notes: "Rep Overload & Peak Overload: 70 lbs for 12, 12 reps, attempt 75 lbs on Set 3 (Monday hit 70 lbs for 10, 10, 12)",
        aliases: ["Bicep Curl", "Dumbbell Bicep Curl", "Bicep Curls (DB or Cable)"],
        planned_sets: [
          { weight: 70, reps: 12 },
          { weight: 70, reps: 12 },
          { weight: 75, reps: 8 },
        ],
      },
    ],
  },
  B: {
    code: "B",
    title: "Full Body B (Incline & Pull-ups)",
    notes: "Upper Chest Stretch, Lat Width, Hamstrings & Capped Shoulders — Post-Deload Overload",
    exercises: [
      {
        name: "Incline Bench",
        muscle_group: "Chest",
        target_sets: 3,
        target_reps: "7-8",
        default_weight: 120,
        notes: "Post-Deload Weight Bump: 120 lbs for 7-8 reps (pre-deload mastered 115 lbs x 10, 8, 7)",
        aliases: ["Incline Dumbbell Press", "Incline Barbell Bench"],
        planned_sets: [
          { weight: 120, reps: 8 },
          { weight: 120, reps: 8 },
          { weight: 120, reps: 7 },
        ],
      },
      {
        name: "Pull-ups",
        muscle_group: "Back",
        target_sets: 3,
        target_reps: "5-6",
        default_weight: 0,
        notes: "Strict dead-hang initiation — 3 clean sets of 5-6 strict bodyweight pull-ups (pre-deload hit 5, 5, 5)",
        aliases: ["Assisted Pull-ups", "Pull-ups (Strict Dead Hang)"],
        planned_sets: [
          { weight: 0, reps: 6 },
          { weight: 0, reps: 5 },
          { weight: 0, reps: 5 },
        ],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 175,
        notes: "Slow 2s negative, squeeze hamstrings at peak contraction (Sunday leg session fully recovered)",
        aliases: ["Lying Leg Curl", "Seated Leg Curl", "Leg Curl Cor"],
        planned_sets: [
          { weight: 175, reps: 10 },
          { weight: 175, reps: 10 },
          { weight: 175, reps: 10 },
        ],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 170,
        notes: "Constant quad tension, pause 1s at top of each rep",
        planned_sets: [
          { weight: 170, reps: 10 },
          { weight: 170, reps: 10 },
          { weight: 170, reps: 10 },
        ],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "11-12",
        default_weight: 20,
        notes: "Side delt burn, 20 lbs for 11-12 clean reps matching Monday's load",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
        planned_sets: [
          { weight: 20, reps: 11 },
          { weight: 20, reps: 11 },
          { weight: 20, reps: 11 },
        ],
      },
      {
        name: "Face Pull",
        muscle_group: "Shoulders",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 65,
        notes: "Pull to eyes/forehead, externally rotate at peak (pre-deload hit 65 lbs x 10, 10, 12)",
        aliases: ["Face Pulls"],
        planned_sets: [
          { weight: 65, reps: 12 },
          { weight: 65, reps: 12 },
          { weight: 65, reps: 12 },
        ],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 70,
        notes: "High-density volume: 70 lbs for 10-12 strict reps following Monday's PR",
        aliases: ["Bicep Curl", "Bicep Curls (Incline DB or Hammer)"],
        planned_sets: [
          { weight: 70, reps: 12 },
          { weight: 70, reps: 10 },
          { weight: 70, reps: 10 },
        ],
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
        default_weight: 175,
        notes: "Slow 2s negative, squeeze hamstrings at peak contraction",
        aliases: ["Lying Leg Curl", "Seated Leg Curl"],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 4,
        target_reps: "10-12",
        default_weight: 145,
        notes: "Constant quad tension, pause 1s at top",
      },
      {
        name: "Leg Press",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10-12",
        default_weight: 405,
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
  LEGS_SAT: {
    code: "LEGS_SAT",
    title: "Leg Day (Hack Squats & RDLs)",
    notes: "Hack Squat PR Overload, Dumbbell RDLs, Leg Press, Leg Curls & Extensions",
    exercises: [
      {
        name: "Hack Squat Machine",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 115,
        notes: "Target 115–120 lbs (PR). Back glued to pad, descend below parallel, drive up through mid-foot",
        aliases: ["Hack Squat"],
      },
      {
        name: "Dumbbell Romanian Deadlift",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 50,
        notes: "Target 50 lbs / hand. Soft knees, hinge hips back into wall, deep hamstring stretch at mid-shin",
        aliases: ["Romanian Deadlift", "Dumbbell RDL", "RDL"],
      },
      {
        name: "Leg Press",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10",
        default_weight: 410,
        notes: "Target 410 lbs (Max Stack). High/wide foot placement for adductor & glute depth",
        aliases: ["Horizontal Leg Press", "Cybex Leg Press"],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "8-10",
        default_weight: 110,
        notes: "Target 105–110 lbs (or 175–180 lbs on pin stack). Slow 2s negative, squeeze hamstrings at peak contraction",
        aliases: ["Lying Leg Curl", "Seated Leg Curl", "Leg Curl Cor", "Prone Leg Curl"],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 3,
        target_reps: "10",
        default_weight: 165,
        notes: "Target 165–170 lbs. Constant quad tension, pause 1s at top",
      },
      {
        name: "Ab machine",
        muscle_group: "Core",
        target_sets: 3,
        target_reps: "12-15",
        default_weight: 160,
        notes: "Target 160–165 lbs. Controlled crunch, deep rib-to-pelvis contraction",
        aliases: ["Ab Machine"],
      },
    ],
  },
  A_DELOAD: {
    code: "A_DELOAD",
    title: "Full Body A (Deload)",
    notes: "Deload Week: 2 sets/exercise matching Monday Nov 2 volume (6,430 lbs) for CNS & connective tissue recovery",
    exercises: [
      {
        name: "Barbell Bench Press",
        muscle_group: "Chest",
        target_sets: 2,
        target_reps: "10-12",
        default_weight: 115,
        notes: "Deload: 2 working sets @ 105-115 lbs. Smooth pause on chest, clean bar path",
        planned_sets: [
          { weight: 105, reps: 10 },
          { weight: 115, reps: 12 },
        ],
      },
      {
        name: "Dumbbell Bent-Over Row",
        muscle_group: "Back",
        target_sets: 2,
        target_reps: "10",
        default_weight: 50,
        notes: "Deload: 2 sets @ 50 lbs. Full lat stretch, controlled tempo",
        aliases: ["Barbell Bent-Over Row"],
        planned_sets: [
          { weight: 50, reps: 10 },
          { weight: 50, reps: 10 },
        ],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 2,
        target_reps: "10",
        default_weight: 15,
        notes: "Deload: 2 sets @ 15 lbs. Scapular plane, smooth tension",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
        planned_sets: [
          { weight: 15, reps: 10 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: "Cable Rear Delt Fly",
        muscle_group: "Shoulders",
        target_sets: 2,
        target_reps: "10",
        default_weight: 15,
        notes: "Deload: 2 sets @ 15 lbs. Squeeze rear delts to reset posture",
        planned_sets: [
          { weight: 15, reps: 10 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 2,
        target_reps: "10",
        default_weight: 60,
        notes: "Deload: 2 sets @ 60 lbs. Strict form, elbows pinned",
        aliases: ["Bicep Curl", "Barbell / Cable Bicep Curls"],
        planned_sets: [
          { weight: 60, reps: 10 },
          { weight: 60, reps: 10 },
        ],
      },
      {
        name: "Skull Crushers",
        muscle_group: "Arms",
        target_sets: 2,
        target_reps: "10",
        default_weight: 60,
        notes: "Deload: 2 sets @ 60 lbs. Elbows in, smooth triceps long head stretch",
        aliases: ["Skull Crusher", "EZ Bar Skull Crusher"],
        planned_sets: [
          { weight: 60, reps: 10 },
          { weight: 60, reps: 10 },
        ],
      },
    ],
  },
  B_DELOAD: {
    code: "B_DELOAD",
    title: "Full Body B (Deload)",
    notes: "Deload Week: 2 sets/exercise matching Monday's recovery volume (~5,500–6,000 lbs)",
    exercises: [
      {
        name: "Incline Bench",
        muscle_group: "Chest",
        target_sets: 2,
        target_reps: "8-10",
        default_weight: 95,
        notes: "Deload: 2 sets @ 95-105 lbs. 30° incline, controlled 3s eccentric, pause at clavicle",
        aliases: ["Incline Dumbbell Press", "Incline Barbell Bench"],
        planned_sets: [
          { weight: 95, reps: 10 },
          { weight: 105, reps: 8 },
        ],
      },
      {
        name: "Pull-ups",
        muscle_group: "Back",
        target_sets: 2,
        target_reps: "5-6",
        default_weight: -20,
        notes: "Deload: 2 sets with moderate assistance (-20 lbs) or easy BW, full dead-hang stretch",
        aliases: ["Assisted Pull-ups", "Pull-ups (Strict Dead Hang)"],
        planned_sets: [
          { weight: -20, reps: 6 },
          { weight: -20, reps: 6 },
        ],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "10",
        default_weight: 135,
        notes: "Deload: 2 sets @ 135 lbs. Slow 2s negative, gentle hamstring squeeze",
        aliases: ["Lying Leg Curl", "Seated Leg Curl", "Leg Curl Cor"],
        planned_sets: [
          { weight: 135, reps: 10 },
          { weight: 135, reps: 10 },
        ],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "10",
        default_weight: 125,
        notes: "Deload: 2 sets @ 125 lbs. Constant quad blood flow, pause 1s at top",
        planned_sets: [
          { weight: 125, reps: 10 },
          { weight: 125, reps: 10 },
        ],
      },
      {
        name: "Cable Lateral Raise",
        muscle_group: "Shoulders",
        target_sets: 2,
        target_reps: "10",
        default_weight: 15,
        notes: "Deload: 2 sets @ 15 lbs. Smooth side delt isolation",
        aliases: ["Dumbbell Lateral Raise", "Cable Lateral Raises"],
        planned_sets: [
          { weight: 15, reps: 10 },
          { weight: 15, reps: 10 },
        ],
      },
      {
        name: "Face Pull",
        muscle_group: "Shoulders",
        target_sets: 2,
        target_reps: "10-12",
        default_weight: 45,
        notes: "Deload: 2 sets @ 45-50 lbs. Rotator cuff recovery, pull to eye line",
        aliases: ["Face Pulls"],
        planned_sets: [
          { weight: 45, reps: 12 },
          { weight: 50, reps: 10 },
        ],
      },
      {
        name: "Barbell Bicep Curl",
        muscle_group: "Arms",
        target_sets: 2,
        target_reps: "10",
        default_weight: 55,
        notes: "Deload: 2 sets @ 55 lbs. Brachialis pump, strict bilateral form",
        aliases: ["Bicep Curl", "Barbell / Cable Bicep Curls"],
        planned_sets: [
          { weight: 55, reps: 10 },
          { weight: 55, reps: 10 },
        ],
      },
    ],
  },
  LEGS_DELOAD: {
    code: "LEGS_DELOAD",
    title: "Leg Day (Deload)",
    notes: "Deload Week: Lower Body Recovery & Joint Decompression — 2 sets per exercise",
    exercises: [
      {
        name: "Hack Squat Machine",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "8-10",
        default_weight: 70,
        notes: "Deload: 2 sets @ 70-80 lbs. Deep knee travel, smooth tempo",
        aliases: ["Hack Squat"],
        planned_sets: [
          { weight: 70, reps: 10 },
          { weight: 80, reps: 10 },
        ],
      },
      {
        name: "Dumbbell Romanian Deadlift",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "8-10",
        default_weight: 40,
        notes: "Deload: 2 sets @ 40 lbs / hand. Active hamstring stretch, smooth hinge",
        aliases: ["Romanian Deadlift", "Dumbbell RDL", "RDL"],
        planned_sets: [
          { weight: 40, reps: 10 },
          { weight: 40, reps: 10 },
        ],
      },
      {
        name: "Leg Press",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "10",
        default_weight: 270,
        notes: "Deload: 2 sets @ 270 lbs. Moderate load flush pump, smooth cadence",
        aliases: ["Horizontal Leg Press", "Cybex Leg Press"],
        planned_sets: [
          { weight: 270, reps: 10 },
          { weight: 270, reps: 10 },
        ],
      },
      {
        name: "Leg Curl",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "8-10",
        default_weight: 135,
        notes: "Deload: 2 sets @ 135 lbs. Slow negative, squeeze hamstrings without strain",
        aliases: ["Lying Leg Curl", "Seated Leg Curl"],
        planned_sets: [
          { weight: 135, reps: 10 },
          { weight: 135, reps: 10 },
        ],
      },
      {
        name: "Leg Extension",
        muscle_group: "Legs",
        target_sets: 2,
        target_reps: "10",
        default_weight: 125,
        notes: "Deload: 2 sets @ 125 lbs. Constant quad blood flow, pause 1s at top",
        planned_sets: [
          { weight: 125, reps: 10 },
          { weight: 125, reps: 10 },
        ],
      },
      {
        name: "Ab machine",
        muscle_group: "Core",
        target_sets: 2,
        target_reps: "12-15",
        default_weight: 130,
        notes: "Deload: 2 sets @ 130 lbs. Controlled crunch, rib-to-pelvis contraction",
        aliases: ["Ab Machine"],
        planned_sets: [
          { weight: 130, reps: 15 },
          { weight: 130, reps: 15 },
        ],
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

    let sessionRow = null;

    // Only look up existing DB sessions if user did not explicitly request a specific routine override
    if (!requestedRoutine) {
      // 1. Check for active session in workout_sessions (end_time IS NULL)
      const activeSessionRes = await db.execute(`
        SELECT * FROM workout_sessions 
        WHERE end_time IS NULL 
        ORDER BY start_time DESC 
        LIMIT 1
      `);

      sessionRow = activeSessionRes.rows[0];

      // 2. If no active session, check for a completed session specifically STARTED today
      // (Note: Do not check end_time, because a midnight/late-night workout started on the previous day
      // should not hijack the following day's schedule)
      if (!sessionRow) {
        const todaySessionRes = await db.execute({
          sql: `SELECT * FROM workout_sessions WHERE (start_time LIKE ? OR date(start_time, '-5 hours') = ?) AND end_time IS NOT NULL ORDER BY id DESC LIMIT 1`,
          args: [`${todayStr}%`, todayStr],
        });
        sessionRow = todaySessionRes.rows[0];
      }
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

    // Check if within Deload Week: Monday Nov 2 to Sunday Nov 8, 2026
    const isDeloadWeek = todayStr >= "2026-11-02" && todayStr <= "2026-11-08";

    if (routineKey && isDeloadWeek) {
      if (routineKey === "A" || routineKey === "A_UPPER") routineKey = "A_DELOAD";
      else if (routineKey === "B") routineKey = "B_DELOAD";
      else if (routineKey === "LEGS" || routineKey === "LEGS_SAT") routineKey = "LEGS_DELOAD";
    }

    if (!routineKey) {
      if (isDeloadWeek) {
        if (dayOfWeek === 1 || dayOfWeek === 5) {
          routineKey = "A_DELOAD"; // Mon Nov 2 & Fri Nov 6: Full Body A (Deload)
        } else if (dayOfWeek === 3) {
          routineKey = "B_DELOAD"; // Wed Nov 4: Full Body B (Deload)
        } else if (dayOfWeek === 6) {
          routineKey = "LEGS_DELOAD"; // Sat Nov 7: Leg Day (Deload)
        }
      } else if (todayStr === "2026-09-21") {
        routineKey = "A_UPPER"; // Monday Sep 21: Upper Body Mass (legs resting after overnight session 30)
      } else if (todayStr === "2026-09-24") {
        routineKey = "LEGS"; // Pre-vacation leg overload
      } else if (todayStr === "2026-10-03" || dayOfWeek === 6) {
        routineKey = "LEGS_SAT"; // Saturday Oct 3: Dedicated Leg Overload
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

      // Ensure progressive overload target is prioritized if higher than previous back-off set
      bestWeight = Math.max(bestWeight, exDef.default_weight);

      // Build sets: prefer explicitly defined planned_sets for progressive overload, otherwise fallback to target/history
      const sets: WorkoutSetData[] = exDef.planned_sets && exDef.planned_sets.length > 0
        ? exDef.planned_sets.map((ps, idx) => ({
            exercise_name: exDef.name,
            set_number: idx + 1,
            weight: ps.weight,
            reps: ps.reps,
            completed: false,
          }))
        : Array.from(
            { length: exDef.target_sets },
            (_, idx) => ({
              exercise_name: exDef.name,
              set_number: idx + 1,
              weight: bestWeight,
              reps: bestReps,
              completed: false,
            })
          );

      const targetWeight = exDef.planned_sets && exDef.planned_sets.length > 0
        ? exDef.planned_sets[0].weight
        : bestWeight;

      exercises.push({
        name: exDef.name,
        muscle_group: exDef.muscle_group,
        target_sets: exDef.target_sets,
        target_reps: exDef.target_reps,
        target_weight: targetWeight,
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
