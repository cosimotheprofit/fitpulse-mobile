export interface TargetExercise {
  name: string;
  muscle_group?: string;
  target_sets: number;
  target_reps?: string;
  target_weight?: number;
  notes?: string;
}

export interface PushWorkoutPayload {
  title: string;
  date?: string; // YYYY-MM-DD, defaults to today
  notes?: string;
  exercises: TargetExercise[];
}

export interface WorkoutSetData {
  id?: number;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
}

export interface WorkoutExerciseData {
  id?: number;
  name: string;
  muscle_group?: string;
  target_sets: number;
  target_reps?: string;
  target_weight?: number;
  notes?: string;
  sets: WorkoutSetData[];
}

export interface WorkoutSessionData {
  id: number;
  title: string;
  date: string;
  notes?: string;
  status: "queued" | "in_progress" | "completed";
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  exercises: WorkoutExerciseData[];
}

export interface SaveWorkoutPayload {
  workout_id: number;
  title?: string;
  status: "in_progress" | "completed";
  notes?: string;
  completed_at?: string;
  exercises: {
    name: string;
    sets: {
      set_number: number;
      weight: number;
      reps: number;
      rpe?: number | null;
      completed: boolean;
    }[];
  }[];
}
