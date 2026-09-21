"use client";

import React, { useState, useEffect } from "react";
import { Calendar, ChevronDown, ChevronUp, Dumbbell, RotateCcw } from "lucide-react";

interface SessionSummary {
  id: number;
  name: string;
  start_time: string;
  end_time?: string | null;
  notes?: string | null;
  total_sets: number;
  completed_sets: number;
  total_volume_lbs: number;
}

interface SetDetail {
  id: number;
  exercise_name: string;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
}

export default function HistoryTab() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sessionSets, setSessionSets] = useState<Record<number, SetDetail[]>>({});
  const [loadingSets, setLoadingSets] = useState<Record<number, boolean>>({});

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleSession = async (sessionId: number) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);

    if (!sessionSets[sessionId]) {
      setLoadingSets((prev) => ({ ...prev, [sessionId]: true }));
      try {
        const res = await fetch(`/api/history?session_id=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setSessionSets((prev) => ({ ...prev, [sessionId]: data.sets || [] }));
        }
      } catch (err) {
        console.error("Failed to fetch session detail:", err);
      } finally {
        setLoadingSets((prev) => ({ ...prev, [sessionId]: false }));
      }
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-400">
        <Dumbbell className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-xs">Loading workout history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" /> Past Workouts ({sessions.length})
        </h2>
        <button
          onClick={fetchHistory}
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-400 text-xs">
          No past workout sessions recorded yet.
        </div>
      ) : (
        sessions.map((s) => {
          const isExpanded = expandedId === s.id;
          const sets = sessionSets[s.id] || [];
          const dateStr = s.start_time ? new Date(s.start_time).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }) : "Recent";

          return (
            <div
              key={s.id}
              className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-sm transition-all"
            >
              <div
                onClick={() => toggleSession(s.id)}
                className="p-3.5 flex items-center justify-between cursor-pointer active:bg-zinc-850"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      {dateStr}
                    </span>
                    <span className="text-xs text-zinc-400">#{s.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">{s.name}</h3>
                  {s.notes && <p className="text-[11px] text-zinc-400 italic line-clamp-1">&ldquo;{s.notes}&rdquo;</p>}
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-100">
                      {Math.round(s.total_volume_lbs).toLocaleString()}{" "}
                      <span className="text-[10px] text-zinc-500 font-normal">lbs</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {s.completed_sets || s.total_sets} sets
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-zinc-800/60 bg-zinc-950/60 p-3">
                  {loadingSets[s.id] ? (
                    <p className="text-xs text-zinc-500 text-center py-2">Loading sets...</p>
                  ) : sets.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">No sets logged for this session.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sets.map((st) => (
                        <div
                          key={st.id}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40"
                        >
                          <span className="font-semibold text-zinc-200">
                            {st.exercise_name} <span className="text-zinc-500 text-[10px]">Set #{st.set_number}</span>
                          </span>
                          <span className="font-mono font-bold text-emerald-400">
                            {st.weight} lbs × {st.reps} reps
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
