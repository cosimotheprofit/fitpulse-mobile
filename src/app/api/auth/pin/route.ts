import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const serverPin = process.env.APP_PIN || "1700";

    if (body.pin && String(body.pin).trim() === serverPin.trim()) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: "Incorrect PIN" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }
}
