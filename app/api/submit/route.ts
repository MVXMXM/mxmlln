import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = typeof body?.input === "string" ? body.input : "";

  try {
    await sql`INSERT INTO user_inputs (input_value) VALUES (${input})`;
    return new NextResponse("Input saved", { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Error saving input", { status: 500 });
  }
}
