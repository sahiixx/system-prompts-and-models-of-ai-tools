import { NextRequest, NextResponse } from "next/server"
import { getToolDetail } from "@/lib/data"

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")

  if (!slug) {
    return NextResponse.json({ error: "Missing slug parameter" }, { status: 400 })
  }

  const tool = await getToolDetail(slug)

  if (!tool) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 })
  }

  return NextResponse.json(tool)
}
