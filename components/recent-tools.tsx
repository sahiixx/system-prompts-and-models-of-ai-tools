import Link from "next/link"
import type { Tool } from "@/lib/data"
import { getTypeColor } from "@/lib/data"
import { ArrowRight } from "lucide-react"

interface RecentToolsProps {
  tools: Tool[]
}

export function RecentTools({ tools }: RecentToolsProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            AI Tools Catalog
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and explore all indexed tools
          </p>
        </div>
        <Link
          href="/models"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/models/${tool.slug}`}
            className="group rounded-md border border-border p-4 transition-colors hover:border-primary/30 hover:bg-secondary/30"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground group-hover:text-primary">
                {tool.name}
              </p>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getTypeColor(tool.type)}`}
              >
                {tool.type}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
