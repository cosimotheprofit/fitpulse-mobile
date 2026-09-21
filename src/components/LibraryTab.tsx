"use client";

import React, { useState, useEffect } from "react";
import { Search, Trophy, Dumbbell, Sparkles } from "lucide-react";

interface ExerciseItem {
  id: number;
  name: string;
  category: string;
  muscle_group: string;
  equipment: string;
  pr_weight: number;
  total_sets: number;
  notes?: string | null;
}

interface StretchItem {
  id: number;
  name: string;
  category: string;
  target_area: string;
  description: string;
  default_sets: number;
  default_reps: number;
  default_duration_seconds: number;
  is_core_routine: boolean;
  display_order: number;
}

export default function LibraryTab() {
  const [activeSection, setActiveSection] = useState<"exercises" | "stretches">("exercises");
  const [groups, setGroups] = useState<Record<string, ExerciseItem[]>>({});
  const [stretches, setStretches] = useState<StretchItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resEx, resSt] = await Promise.all([
          fetch("/api/exercises"),
          fetch("/api/stretches"),
        ]);
        if (resEx.ok) {
          const dataEx = await resEx.json();
          setGroups(dataEx.groups || {});
        }
        if (resSt.ok) {
          const dataSt = await resSt.json();
          setStretches(dataSt.stretches || []);
        }
      } catch (err) {
        console.error("Failed to load library data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allExercises: ExerciseItem[] = Object.values(groups).flat();
  const muscleGroups = ["All", ...Object.keys(groups)];

  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === "All" || ex.muscle_group === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const filteredStretches = stretches.filter((st) => {
    return (
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.target_area.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500 text-xs">
        <Dumbbell className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        Loading library &amp; stretches...
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {/* Top Toggle: Exercises vs Stretches */}
      <div className="flex bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        <button
          onClick={() => setActiveSection("exercises")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === "exercises"
              ? "bg-emerald-500 text-zinc-950 shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Exercises ({allExercises.length})
        </button>
        <button
          onClick={() => setActiveSection("stretches")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === "stretches"
              ? "bg-emerald-500 text-zinc-950 shadow-md"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Stretches &amp; Mobility ({stretches.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={
            activeSection === "exercises"
              ? "Search 47+ exercises..."
              : "Search mobility & stretches..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {activeSection === "exercises" ? (
        <>
          {/* Muscle Group Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {muscleGroups.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedMuscle(mg)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${
                  selectedMuscle === mg
                    ? "bg-emerald-500 text-zinc-950 shadow-sm"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mg}
              </button>
            ))}
          </div>

          {/* Exercise List */}
          <div className="space-y-2">
            {filteredExercises.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-xs">No exercises matched your search.</div>
            ) : (
              filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                        {ex.muscle_group}
                      </span>
                      <span className="text-[10px] text-zinc-500">• {ex.equipment}</span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-100">{ex.name}</h4>
                  </div>

                  <div className="text-right shrink-0">
                    {ex.pr_weight > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-lg">
                        <Trophy className="w-3 h-3" /> PR: {ex.pr_weight} lbs
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-medium">No sets logged</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* Stretches List */
        <div className="space-y-2.5">
          {filteredStretches.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">No stretches matched your search.</div>
          ) : (
            filteredStretches.map((st) => (
              <div
                key={st.id}
                className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                        {st.category}
                      </span>
                      {st.is_core_routine && (
                        <span className="text-[9px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Core Routine
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-zinc-100">{st.name}</h4>
                    <p className="text-[11px] font-semibold text-emerald-300/80 mt-0.5">{st.target_area}</p>
                  </div>

                  <div className="text-right shrink-0 bg-zinc-950/60 border border-zinc-800 px-2 py-1 rounded-xl">
                    <p className="text-xs font-black text-zinc-100">
                      {st.default_sets} sets
                    </p>
                    <p className="text-[10px] font-semibold text-zinc-400">
                      {st.default_duration_seconds > 0
                        ? `${st.default_duration_seconds}s hold`
                        : `${st.default_reps} reps`}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 rounded-xl p-2 border border-zinc-800/40">
                  {st.description}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
