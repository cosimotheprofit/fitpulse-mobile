"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Dumbbell, 
  Check, 
  Plus, 
  Timer, 
  Cloud, 
  CloudOff, 
  Flame, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  CheckCircle2,
  Sparkles,
  Lock,
  Delete,
  Calendar,
  Utensils,
  Scale,
  BookOpen
} from "lucide-react";
import { WorkoutSessionData, WorkoutExerciseData, WorkoutSetData } from "@/types/workout";
import HistoryTab from "@/components/HistoryTab";
import NutritionTab from "@/components/NutritionTab";
import BodyTab from "@/components/BodyTab";
import LibraryTab from "@/components/LibraryTab";

// Helper to play a clean Web Audio beep when rest timer finishes
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch {
    // AudioContext blocked or not supported
  }
}

export default function MobileGymApp() {
  const [workout, setWorkout] = useState<WorkoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"workout" | "history" | "nutrition" | "body" | "library">("workout");

  // Rest Timer State
  const [restSeconds, setRestSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Quick Add Exercise Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExWeight, setNewExWeight] = useState(50);
  const [newExReps, setNewExReps] = useState(10);
  const [newExSets, setNewExSets] = useState(3);

  // Collapsed exercises state
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({});

  // PIN Lock Screen State
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  // Check saved unlock status on mount
  useEffect(() => {
    const unlocked = localStorage.getItem("fitpulse_unlocked") === "true";
    setIsLocked(!unlocked);
  }, []);

  const handlePinKey = async (digit: string) => {
    if (pinChecking) return;
    setPinError("");
    const newPin = pinInput + digit;
    if (newPin.length <= 4) {
      setPinInput(newPin);
    }
    if (newPin.length === 4) {
      setPinChecking(true);
      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: newPin }),
        });
        const data = await res.json();
        if (data.valid) {
          localStorage.setItem("fitpulse_unlocked", "true");
          setIsLocked(false);
          setPinInput("");
        } else {
          setPinError("Incorrect PIN");
          setPinInput("");
        }
      } catch {
        if (newPin === "1700") {
          localStorage.setItem("fitpulse_unlocked", "true");
          setIsLocked(false);
          setPinInput("");
        } else {
          setPinError("Incorrect PIN");
          setPinInput("");
        }
      } finally {
        setPinChecking(false);
      }
    }
  };

  const handlePinBackspace = () => {
    setPinError("");
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleLockApp = () => {
    localStorage.removeItem("fitpulse_unlocked");
    setIsLocked(true);
    setPinInput("");
  };

  // Monitor online status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch today's workout
  const fetchTodayWorkout = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 1. Check local storage cache first
      const cached = localStorage.getItem("fitpulse_active_workout");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.status !== "completed" && parsed.date === today) {
            setWorkout(parsed);
          }
        } catch {
          // ignore corrupted cache
        }
      }

      // 2. Fetch latest from server with local calendar date
      const res = await fetch(`/api/workout/today?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        if (data.workout) {
          setWorkout(data.workout);
          localStorage.setItem("fitpulse_active_workout", JSON.stringify(data.workout));
        } else {
          // No active or scheduled workout for today (e.g. rest day)
          setWorkout(null);
          localStorage.removeItem("fitpulse_active_workout");
        }
      }
    } catch {
      // offline fallback is already loaded from localStorage
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadRoutine = async (routineCode: string) => {
    setLoading(true);
    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const res = await fetch(`/api/workout/today?date=${today}&routine=${routineCode}`);
      if (res.ok) {
        const data = await res.json();
        if (data.workout) {
          setWorkout(data.workout);
          localStorage.setItem("fitpulse_active_workout", JSON.stringify(data.workout));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayWorkout();
  }, [fetchTodayWorkout]);

  // Timer countdown effect
  useEffect(() => {
    if (timerActive && restSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerActive(false);
            playBeep();
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restSeconds === 0) {
      setTimerActive(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, restSeconds]);

  const startTimer = (secs: number) => {
    setRestSeconds(secs);
    setTimerActive(true);
  };

  const cancelTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestSeconds(0);
    setTimerActive(false);
  };

  // Set updates
  const updateSet = (exerciseName: string, setIndex: number, field: keyof WorkoutSetData, value: unknown) => {
    if (!workout) return;
    const newExercises = workout.exercises.map((ex) => {
      if (ex.name !== exerciseName) return ex;
      const newSets = [...ex.sets];
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      return { ...ex, sets: newSets };
    });

    const updatedWorkout: WorkoutSessionData = {
      ...workout,
      status: "in_progress",
      exercises: newExercises,
    };

    setWorkout(updatedWorkout);
    localStorage.setItem("fitpulse_active_workout", JSON.stringify(updatedWorkout));
  };

  const toggleSetComplete = (exerciseName: string, setIndex: number) => {
    if (!workout) return;
    const currentEx = workout.exercises.find((e) => e.name === exerciseName);
    if (!currentEx) return;
    const currentSet = currentEx.sets[setIndex];
    const willBeCompleted = !currentSet.completed;

    updateSet(exerciseName, setIndex, "completed", willBeCompleted);

    // If marked completed, start 90s rest timer automatically!
    if (willBeCompleted) {
      startTimer(90);
    }
  };

  const addSetToExercise = (exerciseName: string) => {
    if (!workout) return;
    const newExercises = workout.exercises.map((ex) => {
      if (ex.name !== exerciseName) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: WorkoutSetData = {
        exercise_name: ex.name,
        set_number: ex.sets.length + 1,
        weight: lastSet ? lastSet.weight : ex.target_weight || 0,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    });

    const updated = { ...workout, exercises: newExercises };
    setWorkout(updated);
    localStorage.setItem("fitpulse_active_workout", JSON.stringify(updated));
  };

  const handleAddNewExercise = () => {
    if (!newExName.trim() || !workout) return;
    const sets: WorkoutSetData[] = Array.from({ length: newExSets }, (_, i) => ({
      exercise_name: newExName.trim(),
      set_number: i + 1,
      weight: newExWeight,
      reps: newExReps,
      completed: false,
    }));

    const newEx: WorkoutExerciseData = {
      name: newExName.trim(),
      target_sets: newExSets,
      target_weight: newExWeight,
      target_reps: String(newExReps),
      sets,
    };

    const updated = { ...workout, exercises: [...workout.exercises, newEx] };
    setWorkout(updated);
    localStorage.setItem("fitpulse_active_workout", JSON.stringify(updated));
    setShowAddModal(false);
    setNewExName("");
  };

  // Finish and save workout
  const handleFinishWorkout = async () => {
    if (!workout) return;
    setIsSaving(true);
    const payload = {
      workout_id: workout.id,
      status: "completed" as const,
      notes: workout.notes,
      exercises: workout.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets.map((s) => ({
          set_number: s.set_number,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe || null,
          completed: s.completed,
        })),
      })),
    };

    try {
      const res = await fetch("/api/workout/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const completedWorkout: WorkoutSessionData = {
          ...workout,
          status: "completed",
          completed_at: new Date().toISOString(),
        };
        setWorkout(completedWorkout);
        localStorage.setItem("fitpulse_active_workout", JSON.stringify(completedWorkout));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to sync with server. Saved locally on device!");
      }
    } catch {
      alert("Network offline. Saved locally on device!");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Start Empty Workout
  const handleStartManualWorkout = () => {
    const today = new Date().toISOString().split("T")[0];
    const newSession: WorkoutSessionData = {
      id: Date.now(),
      title: "Gym Workout",
      date: today,
      status: "in_progress",
      created_at: new Date().toISOString(),
      exercises: [
        {
          name: "Barbell Bench Press",
          target_sets: 3,
          target_weight: 135,
          target_reps: "8-10",
          sets: [
            { exercise_name: "Barbell Bench Press", set_number: 1, weight: 135, reps: 10, completed: false },
            { exercise_name: "Barbell Bench Press", set_number: 2, weight: 135, reps: 8, completed: false },
            { exercise_name: "Barbell Bench Press", set_number: 3, weight: 135, reps: 8, completed: false },
          ],
        },
      ],
    };
    setWorkout(newSession);
    localStorage.setItem("fitpulse_active_workout", JSON.stringify(newSession));
  };

  // Calculate quick metrics
  const totalCompletedSets = workout
    ? workout.exercises.reduce((acc, ex) => acc + ex.sets.filter((s) => s.completed).length, 0)
    : 0;
  const totalPlannedSets = workout
    ? workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0)
    : 0;
  const totalVolume = workout
    ? workout.exercises.reduce(
        (acc, ex) =>
          acc +
          ex.sets.reduce(
            (sAcc, s) => sAcc + (s.completed ? s.weight * (s.reps > 0 ? s.reps : 10) : 0),
            0
          ),
        0
      )
    : 0;

  if (isLocked) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-xl">
            <Lock className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-zinc-100 mb-1">FitPulse Lock</h1>
          <p className="text-xs text-zinc-400 mb-6">Enter 4-digit PIN</p>

          {/* Dots */}
          <div className="flex items-center gap-4 mb-8">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pinInput.length > idx
                    ? "bg-emerald-400 scale-110 shadow-lg shadow-emerald-500/50"
                    : "bg-zinc-800 border border-zinc-700"
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-xs font-bold text-rose-400 -mt-4 mb-4">
              {pinError}
            </p>
          )}

          {/* 3x4 Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                onClick={() => handlePinKey(num)}
                disabled={pinChecking}
                className="h-16 rounded-2xl bg-zinc-900/90 active:bg-emerald-500 active:text-zinc-950 border border-zinc-800/80 text-xl font-bold flex items-center justify-center transition-all"
              >
                {num}
              </button>
            ))}
            <div className="h-16" />
            <button
              onClick={() => handlePinKey("0")}
              disabled={pinChecking}
              className="h-16 rounded-2xl bg-zinc-900/90 active:bg-emerald-500 active:text-zinc-950 border border-zinc-800/80 text-xl font-bold flex items-center justify-center transition-all"
            >
              0
            </button>
            <button
              onClick={handlePinBackspace}
              disabled={pinChecking}
              className="h-16 rounded-2xl bg-zinc-900/90 active:bg-zinc-800 border border-zinc-800/80 text-zinc-400 flex items-center justify-center transition-all"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-400">
        <Dumbbell className="w-10 h-10 animate-bounce text-emerald-500 mb-3" />
        <p className="text-sm font-medium">Loading your workout...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-36 font-sans">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100 leading-tight">FitPulse Gym</h1>
            <p className="text-[11px] text-zinc-400">Phone Workout Logger</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-[11px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              <Cloud className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] bg-amber-950/60 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
              <CloudOff className="w-3 h-3" /> Offline
            </span>
          )}
          <button
            onClick={handleLockApp}
            title="Lock App"
            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:bg-zinc-800"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Save Success Toast */}
      {saveSuccess && (
        <div className="mx-4 mt-2 p-2.5 bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl text-center shadow-lg animate-fade-in flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Workout Synced &amp; Saved Successfully!
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 px-4 pt-4 max-w-lg mx-auto w-full">
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "nutrition" && <NutritionTab />}
        {activeTab === "body" && <BodyTab />}
        {activeTab === "library" && <LibraryTab />}

        {activeTab === "workout" && (
          <>
            {!workout ? (
          // Empty State: Rest Day or No workout queued
          <div className="text-center py-12 px-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mb-1">Rest &amp; Hypertrophy Rebuild</h2>
            <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
              Muscles rebuild during rest when fueled by your 2,875 kcal surplus and 180g protein. Start your next routine whenever you&apos;re ready:
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => handleLoadRoutine("A_UPPER")}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all text-xs"
              >
                <Play className="w-4 h-4 fill-zinc-950" /> Start Monday: Upper Mass A (Bench, Rows &amp; Arms)
              </button>
              <button
                onClick={() => handleLoadRoutine("B")}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-850 text-cyan-400 font-semibold rounded-xl border border-cyan-500/30 text-xs transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-400" /> Start Workout B (Incline &amp; Pull-ups)
              </button>
              <button
                onClick={handleStartManualWorkout}
                className="w-full py-2 px-4 bg-zinc-900/60 hover:bg-zinc-850 text-zinc-400 text-xs rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-1.5"
              >
                Start Empty Session
              </button>
            </div>
          </div>
        ) : workout.status === "completed" ? (
          // Workout Completed Screen
          <div className="text-center py-12 px-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-zinc-100 mb-1">Workout Complete! 🔥</h2>
            <p className="text-xs text-zinc-400 mb-6 font-medium">
              Finished at {new Date(workout.completed_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Volume Lifted</p>
                <p className="text-2xl font-black text-emerald-400">{totalVolume.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">lbs</span></p>
              </div>
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 text-center">
                <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">Sets Completed</p>
                <p className="text-2xl font-black text-zinc-100">{totalCompletedSets} <span className="text-xs text-zinc-500 font-normal">sets</span></p>
              </div>
            </div>

            <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-left mb-6">
              <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">Ready for Antigravity</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When you return to your computer, simply ask:
                <br />
                <span className="font-mono text-emerald-400 bg-zinc-950 px-2 py-1 rounded mt-1 inline-block">
                  &quot;Pull today&apos;s workout results&quot;
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => handleLoadRoutine("A_UPPER")}
                className="w-full py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold rounded-xl border border-emerald-500/30 text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-300" /> Start Next: Upper Mass A (Legs Rested)
              </button>
              <button
                onClick={() => {
                  setWorkout({ ...workout, status: "in_progress" });
                }}
                className="py-2 px-4 bg-zinc-800 text-zinc-400 rounded-xl text-xs hover:bg-zinc-700 transition-all"
              >
                Edit Completed Workout
              </button>
            </div>
          </div>
        ) : (
          // Active Workout Session View
          <>
            {/* Session Header Card */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 mb-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md inline-block mb-1">
                    {workout.status === "in_progress" ? "In Progress" : "Queued Routine"}
                  </span>
                  <h2 className="text-lg font-extrabold text-zinc-100 tracking-tight">{workout.title}</h2>
                  {workout.notes && <p className="text-xs text-zinc-400 mt-1 italic">&ldquo;{workout.notes}&rdquo;</p>}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-zinc-300">
                    {totalCompletedSets} / {totalPlannedSets} <span className="text-[10px] text-zinc-500 font-normal">sets</span>
                  </p>
                  <p className="text-[11px] font-semibold text-emerald-400">
                    {totalVolume.toLocaleString()} lbs
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mt-3">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${totalPlannedSets > 0 ? (totalCompletedSets / totalPlannedSets) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Rest Timer Banner (Floating when active) */}
            {timerActive && (
              <div className="sticky top-16 z-30 mb-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-bold">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400">Rest Timer</span>
                    <p className="text-xl font-black font-mono tracking-tight text-zinc-100 leading-none">
                      {Math.floor(restSeconds / 60)}:{(restSeconds % 60).toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRestSeconds((s) => s + 30)}
                    className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-700/50"
                  >
                    +30s
                  </button>
                  <button
                    onClick={cancelTimer}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            {/* Exercise List */}
            <div className="space-y-4">
              {workout.exercises.map((exercise) => {
                const isCollapsed = collapsedExercises[exercise.name] || false;
                const completedSets = exercise.sets.filter((s) => s.completed).length;

                return (
                  <div
                    key={exercise.name}
                    className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Exercise Header */}
                    <div
                      onClick={() =>
                        setCollapsedExercises((prev) => ({
                          ...prev,
                          [exercise.name]: !isCollapsed,
                        }))
                      }
                      className="px-4 py-3 bg-zinc-900 flex items-center justify-between cursor-pointer border-b border-zinc-800/60"
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-100">{exercise.name}</h3>
                          {completedSets === exercise.sets.length && exercise.sets.length > 0 && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {exercise.target_sets} sets × {exercise.target_reps || "reps"}
                          {exercise.target_weight ? ` @ ${exercise.target_weight} lbs` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">
                          {completedSets}/{exercise.sets.length}
                        </span>
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                    </div>

                    {/* Sets Content */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2.5">
                        {exercise.sets.map((set, setIdx) => (
                          <div
                            key={setIdx}
                            className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                              set.completed
                                ? "bg-emerald-950/30 border border-emerald-800/40"
                                : "bg-zinc-950/60 border border-zinc-800/70"
                            }`}
                          >
                            {/* Set Number */}
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 ${
                                set.completed ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                              }`}
                            >
                              {set.set_number}
                            </span>

                            {/* Weight Controls */}
                            <div className="flex-1 flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                              <button
                                onClick={() => updateSet(exercise.name, setIdx, "weight", Math.max(0, set.weight - 5))}
                                className="w-6 h-7 rounded bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center"
                              >
                                -
                              </button>
                              <div className="flex-1 text-center">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={set.weight || ""}
                                  onChange={(e) =>
                                    updateSet(exercise.name, setIdx, "weight", parseFloat(e.target.value) || 0)
                                  }
                                  className="w-full bg-transparent text-center font-bold text-sm text-zinc-100 focus:outline-none"
                                />
                                <span className="text-[9px] text-zinc-500 block -mt-1">lbs</span>
                              </div>
                              <button
                                onClick={() => updateSet(exercise.name, setIdx, "weight", set.weight + 5)}
                                className="w-6 h-7 rounded bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>

                            {/* Reps Controls */}
                            <div className="w-24 flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                              <button
                                onClick={() => updateSet(exercise.name, setIdx, "reps", Math.max(0, set.reps - 1))}
                                className="w-6 h-7 rounded bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center"
                              >
                                -
                              </button>
                              <div className="flex-1 text-center">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.reps || ""}
                                  onChange={(e) =>
                                    updateSet(exercise.name, setIdx, "reps", parseInt(e.target.value, 10) || 0)
                                  }
                                  className="w-full bg-transparent text-center font-bold text-sm text-zinc-100 focus:outline-none"
                                />
                                <span className="text-[9px] text-zinc-500 block -mt-1">reps</span>
                              </div>
                              <button
                                onClick={() => updateSet(exercise.name, setIdx, "reps", set.reps + 1)}
                                className="w-6 h-7 rounded bg-zinc-800 active:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>

                            {/* Complete Checkbox Button */}
                            <button
                              onClick={() => toggleSetComplete(exercise.name, setIdx)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                set.completed
                                  ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950"
                                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                              }`}
                            >
                              <Check className={`w-5 h-5 ${set.completed ? "stroke-[3]" : ""}`} />
                            </button>
                          </div>
                        ))}

                        {/* Add Set Button */}
                        <div className="pt-1 flex justify-between items-center">
                          <button
                            onClick={() => addSetToExercise(exercise.name)}
                            className="text-xs text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-semibold py-1 px-2 rounded-lg hover:bg-zinc-800/60 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Set
                          </button>

                          {/* Quick Rest Timer triggers */}
                          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <span>Rest:</span>
                            <button
                              onClick={() => startTimer(60)}
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono"
                            >
                              60s
                            </button>
                            <button
                              onClick={() => startTimer(90)}
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono"
                            >
                              90s
                            </button>
                            <button
                              onClick={() => startTimer(120)}
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono"
                            >
                              2m
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add New Exercise Card Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full py-3 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl text-xs font-bold text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 bg-zinc-900/30 transition-all"
              >
                <Plus className="w-4 h-4" /> Substitute / Add Another Exercise
              </button>
            </div>
          </>
        )}
          </>
        )}
      </div>

      {/* Floating Bottom Sticky Bar for Active Workout */}
      {activeTab === "workout" && workout && workout.status !== "completed" && (
        <div className="fixed bottom-14 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800/90 p-3 backdrop-blur-xl">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => startTimer(90)}
              className="py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 flex items-center gap-1.5 active:bg-zinc-800"
            >
              <Timer className="w-4 h-4 text-emerald-400" /> Rest (90s)
            </button>

            <button
              onClick={handleFinishWorkout}
              disabled={isSaving}
              className="flex-1 py-3 px-5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-zinc-950 font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
            >
              {isSaving ? (
                "Syncing..."
              ) : (
                <>
                  <Flame className="w-4 h-4 fill-zinc-950" /> Finish Workout
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tab Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-14 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur-xl px-2">
        <div className="max-w-lg mx-auto h-full flex items-center justify-around">
          <button
            onClick={() => setActiveTab("workout")}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all ${
              activeTab === "workout" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span className="text-[10px]">Workout</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all ${
              activeTab === "history" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[10px]">History</span>
          </button>

          <button
            onClick={() => setActiveTab("nutrition")}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all ${
              activeTab === "nutrition" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span className="text-[10px]">Food</span>
          </button>

          <button
            onClick={() => setActiveTab("body")}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all ${
              activeTab === "body" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span className="text-[10px]">Body</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex flex-col items-center justify-center gap-0.5 w-14 h-full transition-all ${
              activeTab === "library" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300 font-medium"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-[10px]">Library</span>
          </button>
        </div>
      </nav>

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Add Exercise</h3>

            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Exercise Name</label>
              <input
                type="text"
                placeholder="e.g. Incline Dumbbell Curl"
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold mb-1 block">Sets</label>
                <input
                  type="number"
                  value={newExSets}
                  onChange={(e) => setNewExSets(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center text-sm font-bold text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold mb-1 block">Reps</label>
                <input
                  type="number"
                  value={newExReps}
                  onChange={(e) => setNewExReps(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center text-sm font-bold text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-semibold mb-1 block">Weight (lbs)</label>
                <input
                  type="number"
                  value={newExWeight}
                  onChange={(e) => setNewExWeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-center text-sm font-bold text-zinc-100"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewExercise}
                className="flex-1 py-3 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-950"
              >
                Add to Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
