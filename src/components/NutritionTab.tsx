"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Utensils, Droplets, ChevronLeft, ChevronRight, Plus, Plane, Trash2, X } from "lucide-react";

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

  // Quick / Trip Meal modal state
  const [showTripModal, setShowTripModal] = useState(false);
  const [tripMealType, setTripMealType] = useState<string>("Lunch");
  const [tripFoodName, setTripFoodName] = useState("");
  const [tripCalories, setTripCalories] = useState<number | "">("");
  const [tripProtein, setTripProtein] = useState<number | "">("");
  const [tripCarbs, setTripCarbs] = useState<number | "">("");
  const [tripFat, setTripFat] = useState<number | "">("");
  const [tripSodium, setTripSodium] = useState<number | "">("");
  const [submittingMeal, setSubmittingMeal] = useState(false);

  const applyPreset = (preset: "light" | "moderate" | "hearty" | "feast") => {
    switch (preset) {
      case "light":
        setTripCalories(350);
        setTripProtein(15);
        setTripCarbs(35);
        setTripFat(12);
        setTripSodium(350);
        break;
      case "moderate":
        setTripCalories(650);
        setTripProtein(35);
        setTripCarbs(65);
        setTripFat(22);
        setTripSodium(700);
        break;
      case "hearty":
        setTripCalories(950);
        setTripProtein(48);
        setTripCarbs(95);
        setTripFat(38);
        setTripSodium(1100);
        break;
      case "feast":
        setTripCalories(1400);
        setTripProtein(60);
        setTripCarbs(140);
        setTripFat(65);
        setTripSodium(1800);
        break;
    }
  };

  const handleOpenTripModal = (type: string = "Lunch") => {
    setTripMealType(type);
    setTripFoodName("");
    setTripCalories("");
    setTripProtein("");
    setTripCarbs("");
    setTripFat("");
    setTripSodium("");
    setShowTripModal(true);
  };

  const submitTripMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripCalories && !tripFoodName) return;
    setSubmittingMeal(true);
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_meal",
          date: selectedDate,
          meal_type: tripMealType,
          food_name: tripFoodName.trim() || `${tripMealType} (Estimated)`,
          calories: Number(tripCalories || 0),
          protein_g: Number(tripProtein || 0),
          carbs_g: Number(tripCarbs || 0),
          fat_g: Number(tripFat || 0),
          sodium_mg: Number(tripSodium || 0),
        }),
      });
      if (res.ok) {
        setShowTripModal(false);
        fetchNutrition(selectedDate);
      }
    } catch (err) {
      console.error("Failed to log trip meal:", err);
    } finally {
      setSubmittingMeal(false);
    }
  };

  const deleteMealItem = async (id: number) => {
    if (!confirm("Delete this food entry?")) return;
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_meal", id }),
      });
      if (res.ok) {
        fetchNutrition(selectedDate);
      }
    } catch (err) {
      console.error("Failed to delete meal:", err);
    }
  };

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

      {/* Quick / Trip Meal Button */}
      <button
        onClick={() => handleOpenTripModal("Lunch")}
        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all"
      >
        <Plane className="w-4 h-4" />
        <span>+ Quick / Trip Meal</span>
      </button>

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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" /> Meals Logged
              </h3>
            </div>

            {["Breakfast", "Lunch", "Dinner", "Snack"].map((mealType) => {
              const items = meals[mealType] || [];

              const mealCals = items.reduce((acc, it) => acc + (it.calories || 0), 0);
              const mealProtein = items.reduce((acc, it) => acc + (it.protein_g || 0), 0);

              return (
                <div key={mealType} className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800/50">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-extrabold text-zinc-200">{mealType}</h4>
                      <button
                        onClick={() => handleOpenTripModal(mealType)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                      >
                        <Plus className="w-2.5 h-2.5" /> Log
                      </button>
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400">
                      {Math.round(mealCals)} kcal • {Math.round(mealProtein)}g P
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic py-1">No items logged</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 group">
                          <div className="flex items-center gap-2 truncate max-w-[200px]">
                            <button
                              onClick={() => deleteMealItem(item.id)}
                              className="text-zinc-600 hover:text-rose-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <span className="text-zinc-300 truncate">{item.food_name}</span>
                          </div>
                          <span className="font-mono text-zinc-400 text-[11px] shrink-0">
                            {Math.round(item.calories)} kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Quick / Trip Meal Modal */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Plane className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-100">Trip / Quick Meal</h3>
                  <p className="text-[10px] text-zinc-400">One-thumb estimate for dining out</p>
                </div>
              </div>
              <button
                onClick={() => setShowTripModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitTripMeal} className="space-y-3.5">
              {/* Meal Type Pills */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">Meal Type</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setTripMealType(type)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        tripMealType === type
                          ? "bg-emerald-500 text-zinc-950 font-black shadow-md shadow-emerald-500/20"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Name / Description */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">What did you eat?</label>
                <input
                  type="text"
                  value={tripFoodName}
                  onChange={(e) => setTripFoodName(e.target.value)}
                  placeholder="e.g. Airport sandwich, Tacos, Steak..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Size Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Quick Size Presets</label>
                  <span className="text-[9px] text-emerald-400 font-medium">Auto-fills</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => applyPreset("light")}
                    className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">☕ Light</div>
                    <div className="text-[10px] text-zinc-500">~350 kcal • 15g P</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("moderate")}
                    className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">🥪 Normal</div>
                    <div className="text-[10px] text-zinc-500">~650 kcal • 35g P</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("hearty")}
                    className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">🍽️ Hearty</div>
                    <div className="text-[10px] text-zinc-500">~950 kcal • 48g P</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("feast")}
                    className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <div className="font-bold text-zinc-200">🍕 Feast</div>
                    <div className="text-[10px] text-zinc-500">~1400 kcal • 60g P</div>
                  </button>
                </div>
              </div>

              {/* Main Inputs: Calories & Protein */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-2.5 text-center">
                  <label className="block text-[10px] font-bold text-amber-400 mb-1 uppercase">Calories *</label>
                  <input
                    type="number"
                    value={tripCalories}
                    onChange={(e) => setTripCalories(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="650"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-center text-base font-black text-amber-300 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div className="bg-zinc-950 border border-sky-500/40 rounded-xl p-2.5 text-center">
                  <label className="block text-[10px] font-bold text-sky-400 mb-1 uppercase">Protein (g) *</label>
                  <input
                    type="number"
                    value={tripProtein}
                    onChange={(e) => setTripProtein(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="35"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-center text-base font-black text-sky-300 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Secondary Macros: Carbs & Fat */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 mb-1 text-center uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    value={tripCarbs}
                    onChange={(e) => setTripCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="65"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-zinc-400 mb-1 text-center uppercase">Fat (g)</label>
                  <input
                    type="number"
                    value={tripFat}
                    onChange={(e) => setTripFat(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="22"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowTripModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMeal}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
                >
                  {submittingMeal ? "Saving..." : "Save Meal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
