import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const searchParams = req.nextUrl.searchParams;
    let date = searchParams.get("date");

    if (!date) {
      // Find latest date with nutrition logs or default to today
      const latestDateRes = await db.execute(`
        SELECT date FROM nutrition_logs ORDER BY date DESC LIMIT 1
      `);
      const todayStr = new Date().toISOString().split("T")[0];
      date = latestDateRes.rows[0]?.date ? String(latestDateRes.rows[0].date) : todayStr;
    }

    // Fetch user settings / goals
    const settingsRes = await db.execute(`SELECT key, value FROM user_settings`);
    const goals: Record<string, number> = {
      calorie_target: 2875,
      protein_target: 180,
      carbs_target: 380,
      fat_target: 70,
      water_target_ml: 3000,
    };
    for (const row of settingsRes.rows) {
      const k = String(row.key);
      const v = parseFloat(String(row.value));
      if (k === "daily_calorie_target") goals.calorie_target = v;
      if (k === "daily_protein_target") goals.protein_target = v;
      if (k === "daily_carbs_target") goals.carbs_target = v;
      if (k === "daily_fat_target") goals.fat_target = v;
      if (k === "daily_water_target_ml") goals.water_target_ml = v;
    }

    // Fetch meal items for this date
    const mealsRes = await db.execute({
      sql: `
        SELECT * FROM nutrition_logs 
        WHERE date = ? 
        ORDER BY CASE meal_type 
          WHEN 'Breakfast' THEN 1 
          WHEN 'Lunch' THEN 2 
          WHEN 'Dinner' THEN 3 
          ELSE 4 
        END, id ASC
      `,
      args: [date],
    });

    // Fetch water logs for this date
    const waterRes = await db.execute({
      sql: `SELECT COALESCE(SUM(amount_ml), 0) as total_water_ml FROM water_logs WHERE date = ?`,
      args: [date],
    });
    const totalWaterMl = Number(waterRes.rows[0]?.total_water_ml || 0);

    // Compute totals
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    const mealsByType: Record<string, Record<string, unknown>[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    };

    for (const item of mealsRes.rows) {
      const cals = Number(item.calories || 0);
      const protein = Number(item.protein_g || 0);
      const carbs = Number(item.carbs_g || 0);
      const fat = Number(item.fat_g || 0);
      const fiber = Number(item.fiber_g || 0);

      totalCalories += cals;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      totalFiber += fiber;

      const type = String(item.meal_type || "Snack");
      if (!mealsByType[type]) mealsByType[type] = [];
      mealsByType[type].push(item);
    }

    return NextResponse.json({
      date,
      totals: {
        calories: Math.round(totalCalories),
        protein_g: Math.round(totalProtein * 10) / 10,
        carbs_g: Math.round(totalCarbs * 10) / 10,
        fat_g: Math.round(totalFat * 10) / 10,
        fiber_g: Math.round(totalFiber * 10) / 10,
        water_ml: totalWaterMl,
      },
      goals,
      meals: mealsByType,
      total_items: mealsRes.rows.length,
    });
  } catch (err: unknown) {
    console.error("Failed to fetch nutrition data:", err);
    return NextResponse.json(
      { error: "Failed to fetch nutrition data", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();

    if (body.action === "add_water") {
      const date = body.date || new Date().toISOString().split("T")[0];
      const amount = Number(body.amount_ml || 250);
      await db.execute({
        sql: `INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)`,
        args: [date, amount],
      });
      return NextResponse.json({ success: true, message: `Added ${amount}ml water` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
