"use client"

import { useState } from "react"
import { ToolCard } from "@/components/tool-card"
import type { Tool } from "@/lib/data"

interface ToolsGridProps {
  tools: Tool[]
}

const filterTypes = ["All", "IDE Plugin", "Web Platform", "Autonomous Agent"]

export function ToolsGrid({ tools }: ToolsGridProps) {
  const [activeFilter, setActiveFilter] = useState("All")

  const filtered =
    activeFilter === "All"
      ? tools
      : tools.filter((t) => t.type === activeFilter)

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          All Tools
        </h2>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
          {filterTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((tool) => (
          <ToolCard
            key={tool.slug}
            slug={tool.slug}
            name={tool.name}
            type={tool.type}
            description={tool.description}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-muted-foreground">
          No tools found for this category.
        </div>
      )}
    </section>
  )
}
