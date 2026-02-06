import type { Metadata } from "next"
import { getAllTools } from "@/lib/data"
import { CompareClient } from "@/components/compare-client"

export const metadata: Metadata = {
  title: "Compare Tools - AI Tools Directory",
  description: "Compare AI coding tools side by side. Analyze features, models, pricing, and capabilities.",
}

export default function ComparePage() {
  const tools = getAllTools()

  return (
    <div className="container flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Compare Tools
        </h1>
        <p className="text-muted-foreground">
          Select up to 3 tools to compare side by side.
        </p>
      </div>
      <CompareClient tools={tools} />
    </div>
  )
}
