import { createClient, Client } from "@libsql/client";
import path from "path";

let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    // When running locally, point directly to the main FitPulse fitness.db SQLite database
    const defaultDbPath = path.resolve(process.cwd(), "..", "fitness.db");
    const url = process.env.TURSO_DATABASE_URL || `file:${defaultDbPath}`;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    client = createClient({
      url,
      authToken,
    });
  }
  return client;
}

export async function initDb() {
  // Main tables (workout_sessions, workout_sets, nutrition_logs, body_metrics, exercises, etc.)
  // are already managed by FitPulse. We ensure foreign keys and any auxiliary indexes exist.
  const db = getDb();
  try {
    await db.execute("PRAGMA foreign_keys = ON;");
  } catch {
    // ignore
  }
}
