import type { Metadata } from "next"
import { getSearchIndex } from "@/lib/data"
import { SearchClient } from "@/components/search-client"

export const metadata: Metadata = {
  title: "Search Tools - AI Tools Directory",
  description: "Search and filter across 37+ AI coding tools by name, type, tags, and keywords.",
}

export default function SearchPage() {
  const searchIndex = getSearchIndex()

  return (
    <div className="container flex flex-col gap-8 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Search Tools
        </h1>
        <p className="text-muted-foreground">
          Search and filter across {searchIndex.length} AI coding tools by name,
          type, tags, and keywords.
        </p>
      </div>
      <SearchClient entries={searchIndex} />
    </div>
  )
}
