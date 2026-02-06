"use client"

import { useState, useMemo } from "react"
import { Search, X } from "lucide-react"
import { ToolCard } from "@/components/tool-card"
import type { SearchEntry } from "@/lib/data"

interface SearchClientProps {
  entries: SearchEntry[]
}

const typeFilters = ["All", "IDE Plugin", "Web Platform", "Autonomous Agent"]

export function SearchClient({ entries }: SearchClientProps) {
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [entries])

  const results = useMemo(() => {
    const q = query.toLowerCase().trim()
    return entries.filter((entry) => {
      // Type filter
      if (typeFilter !== "All" && entry.type !== typeFilter) return false

      // Tag filter
      if (
        selectedTags.length > 0 &&
        !selectedTags.some((t) => entry.tags.includes(t))
      )
        return false

      // Text search
      if (!q) return true
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.keywords.some((k) => k.includes(q)) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [entries, query, typeFilter, selectedTags])

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, keyword, or description..."
          className="w-full rounded-lg border border-border bg-secondary px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Type:
          </span>
          {typeFilters.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === type
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tags:
          </span>
          {allTags.slice(0, 15).map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-primary hover:text-primary/80"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-mono text-foreground">{results.length}</span>{" "}
        result{results.length !== 1 ? "s" : ""}
      </p>

      {/* Results Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((entry) => (
          <ToolCard
            key={entry.slug}
            slug={entry.slug}
            name={entry.name}
            type={entry.type}
            description={entry.description}
          />
        ))}
      </div>

      {results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16">
          <p className="text-lg font-medium text-foreground">No results found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search query or filters.
          </p>
        </div>
      )}
    </div>
  )
}
