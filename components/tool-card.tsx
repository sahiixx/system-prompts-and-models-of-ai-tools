import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getTypeBadgeClass } from "@/lib/data"

interface ToolCardProps {
  slug: string
  name: string
  type: string
  description: string
}

export function ToolCard({ slug, name, type, description }: ToolCardProps) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/30 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-sm font-bold">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getTypeBadgeClass(type)}`}
        >
          {type}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {description}
      </p>
    </Link>
  )
}
