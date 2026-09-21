"use client";

import React, { useState, useEffect } from "react";
import { Scale, TrendingUp, Plus, Check } from "lucide-react";

interface BodyRecord {
  id: number;
  date: string;
  weight_lbs: number;
  body_fat_pct?: number | null;
  moving_avg_7d: number;
  notes?: string | null;
}

export default function BodyTab() {
  const [history, setHistory] = useState<BodyRecord[]>([]);
  const [latest, setLatest] = useState<BodyRecord | null>(null);
  const [targetWeight, setTargetWeight] = useState<number>(177);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<number>(14); // 2-week (14-day) view default

  // Quick Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchBody = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/body");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        setLatest(data.latest);
        if (data.target_weight_lbs) setTargetWeight(data.target_weight_lbs);
      }
    } catch (err) {
      console.error("Failed to load body metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBody();
  }, []);

  const handleSaveWeighIn = async () => {
    if (!newWeight || isNaN(parseFloat(newWeight))) return;
    setSaving(true);
    try {
      const res = await fetch("/api/body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight_lbs: parseFloat(newWeight),
          body_fat_pct: newBodyFat ? parseFloat(newBodyFat) : null,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewWeight("");
        setNewBodyFat("");
        fetchBody();
      }
    } catch (err) {
      console.error("Failed to log weigh-in:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-zinc-500 text-xs">
        <Scale className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        Loading body metrics...
      </div>
    );
  }

  const diffToGoal = latest ? Math.round((latest.weight_lbs - targetWeight) * 10) / 10 : 0;
  const cutoffDate = timeframe > 0 && latest
    ? (() => {
        const d = new Date(latest.date + "T00:00:00");
        d.setDate(d.getDate() - (timeframe - 1));
        return d.toISOString().split("T")[0];
      })()
    : null;
  const displayedHistory = cutoffDate ? history.filter((h) => h.date >= cutoffDate) : history;
  const startWeight = displayedHistory.length > 0 ? displayedHistory[displayedHistory.length - 1].weight_lbs : null;
  const currentWeight = displayedHistory.length > 0 ? displayedHistory[0].weight_lbs : null;
  const timeframeDelta = currentWeight && startWeight ? Math.round((currentWeight - startWeight) * 10) / 10 : null;

  return (
    <div className="space-y-4 pb-24">
      {/* Current Weight & Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Current Weight</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {latest ? latest.weight_lbs : "--"} <span className="text-xs text-zinc-500 font-normal">lbs</span>
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {latest ? `Logged ${latest.date}` : ""}
          </p>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Goal Weight</span>
          <p className="text-2xl font-black text-zinc-100 mt-1">
            {targetWeight} <span className="text-xs text-zinc-500 font-normal">lbs</span>
          </p>
          <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
            {diffToGoal > 0 ? `+${diffToGoal} lbs over` : `${Math.abs(diffToGoal)} lbs under`}
          </p>
        </div>
      </div>

      {/* 7-Day Moving Average Card */}
      {latest && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-zinc-400">7-Day Rolling Trend</p>
              <p className="text-sm font-extrabold text-zinc-100">
                {latest.moving_avg_7d} <span className="text-xs text-zinc-500 font-normal">lbs avg</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="py-2 px-3 bg-emerald-500 active:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-emerald-950"
          >
            <Plus className="w-3.5 h-3.5" /> Log Weight
          </button>
        </div>
      )}

      {/* Timeframe Filter Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Weigh-in History</h3>
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-[11px]">
            {[
              { label: "2W", days: 14 },
              { label: "1M", days: 30 },
              { label: "3M", days: 90 },
              { label: "All", days: 0 },
            ].map((item) => (
              <button
                key={item.days}
                onClick={() => setTimeframe(item.days)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  timeframe === item.days
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {timeframeDelta !== null && (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400 text-[11px] font-semibold">
              {timeframe === 14 ? "2-Week Net Change:" : `${timeframe === 0 ? "All Time" : `${timeframe}D`} Net Change:`}
            </span>
            <span
              className={`font-bold ${
                timeframeDelta > 0
                  ? "text-emerald-400"
                  : timeframeDelta < 0
                  ? "text-cyan-400"
                  : "text-zinc-300"
              }`}
            >
              {timeframeDelta > 0 ? `+${timeframeDelta} lbs (Lean Gain)` : `${timeframeDelta} lbs`}
            </span>
          </div>
        )}

        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
          {displayedHistory.map((row) => (
            <div key={row.id} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <div>
                <span className="font-bold text-zinc-200">{row.weight_lbs} lbs</span>
                {row.body_fat_pct && (
                  <span className="text-[10px] text-zinc-500 ml-2">({row.body_fat_pct}% BF)</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-zinc-400 font-mono text-[11px] block">{row.date}</span>
                <span className="text-[9px] text-emerald-400/80">Avg: {row.moving_avg_7d} lbs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Weigh-in Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100">Log Daily Weigh-in</h3>

            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 172.5"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Body Fat % (Optional)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 15.2"
                value={newBodyFat}
                onChange={(e) => setNewBodyFat(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeighIn}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
