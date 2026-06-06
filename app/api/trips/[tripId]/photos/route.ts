import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ message: "Deprecated. Use actions.ts instead." })
}
