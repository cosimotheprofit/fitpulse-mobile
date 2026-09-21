"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Utensils, Droplets, ChevronLeft, ChevronRight } from "lucide-react";

interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
}

interface NutritionGoals {
  calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  water_target_ml: number;
}

interface MealItem {
  id: number;
  food_name: string;
  serving_size?: string;
  servings?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export default function NutritionTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [totals, setTotals] = useState<NutritionTotals | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [meals, setMeals] = useState<Record<string, MealItem[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchNutrition = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutrition?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setTotals(data.totals);
        setGoals(data.goals);
        setMeals(data.meals || {});
        if (data.date) setSelectedDate(data.date);
      }
    } catch (err) {
      console.error("Failed to load nutrition:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNutrition(selectedDate);
  }, [fetchNutrition, selectedDate]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
    fetchNutrition(newDateStr);
  };

  const addWater = async (ml: number) => {
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_water", amount_ml: ml, date: selectedDate }),
      });
      if (res.ok) {
        fetchNutrition(selectedDate);
      }
    } catch (err) {
      console.error("Failed to log water:", err);
    }
  };

  const calPercentage = totals && goals ? Math.min(100, Math.round((totals.calories / goals.calorie_target) * 100)) : 0;
  const waterPercentage = totals && goals ? Math.min(100, Math.round((totals.water_ml / goals.water_target_ml) * 100)) : 0;

  return (
    <div className="space-y-4 pb-24">
      {/* Date Switcher */}
      <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-2xl px-3 py-2">
        <button
          onClick={() => changeDate(-1)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <p className="text-xs font-bold text-zinc-100">{selectedDate}</p>
          <p className="text-[10px] text-zinc-400">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })}
          </p>
        </div>

        <button
          onClick={() => changeDate(1)}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-xs">Loading nutrition data...</div>
      ) : totals && goals ? (
        <>
          {/* Calorie Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Calories</span>
                <p className="text-2xl font-black text-zinc-100">
                  {totals.calories.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-zinc-400">/ {goals.calorie_target.toLocaleString()} kcal</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-zinc-300">{calPercentage}%</span>
                <p className="text-[10px] text-zinc-500">{goals.calorie_target - totals.calories} remaining</p>
              </div>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${calPercentage}%` }}
              />
            </div>

            {/* Macro Pill Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800/60">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2 text-center">
                <p className="text-[10px] uppercase font-bold text-sky-400">Protein</p>
                <p className="text-sm font-extrabold text-zinc-100">{totals.protein_g}g</p>
                <p className="text-[9px] text-zinc-500">Goal: {goals.protein_target}g</p>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2 text-center">
                <p className="text-[10px] uppercase font-bold text-amber-400">Carbs</p>
                <p className="text-sm font-extrabold text-zinc-100">{totals.carbs_g}g</p>
                <p className="text-[9px] text-zinc-500">Goal: {goals.carbs_target}g</p>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-2 text-center">
                <p className="text-[10px] uppercase font-bold text-rose-400">Fat</p>
                <p className="text-sm font-extrabold text-zinc-100">{totals.fat_g}g</p>
                <p className="text-[9px] text-zinc-500">Goal: {goals.fat_target}g</p>
              </div>
            </div>
          </div>

          {/* Water Hydration Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-sky-400">Hydration</span>
                  <p className="text-sm font-black text-zinc-100">
                    {totals.water_ml.toLocaleString()} / {goals.water_target_ml.toLocaleString()} ml
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-400">{waterPercentage}%</span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${waterPercentage}%` }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addWater(250)}
                className="flex-1 py-1.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 text-sky-300 text-xs font-bold rounded-lg transition-all"
              >
                +250 ml
              </button>
              <button
                onClick={() => addWater(500)}
                className="flex-1 py-1.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 text-sky-300 text-xs font-bold rounded-lg transition-all"
              >
                +500 ml
              </button>
              <button
                onClick={() => addWater(1000)}
                className="flex-1 py-1.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 text-sky-300 text-xs font-bold rounded-lg transition-all"
              >
                +1 L
              </button>
            </div>
          </div>

          {/* Meals Breakdown */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" /> Meals Logged
            </h3>

            {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => {
              const items = meals[mealType] || [];
              if (items.length === 0) return null;

              const mealCals = items.reduce((acc, it) => acc + (it.calories || 0), 0);
              const mealProtein = items.reduce((acc, it) => acc + (it.protein_g || 0), 0);

              return (
                <div key={mealType} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800/50">
                    <h4 className="text-xs font-extrabold text-zinc-200">{mealType}</h4>
                    <span className="text-[11px] font-bold text-zinc-400">
                      {Math.round(mealCals)} kcal • {Math.round(mealProtein)}g P
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <span className="text-zinc-300 truncate max-w-[200px]">{item.food_name}</span>
                        <span className="font-mono text-zinc-400 text-[11px] shrink-0">
                          {Math.round(item.calories)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
