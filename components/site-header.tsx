import Link from "next/link"
import { Terminal, BarChart3, Search, GitCompare } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground tracking-tight">
            AI Tools Directory
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Tools
          </Link>
          <Link
            href="/analytics"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Link>
          <Link
            href="/compare"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Compare
          </Link>
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </Link>
        </nav>
        <div className="flex-1" />
        <a
          href="https://github.com/sahiixx/system-prompts-and-models-of-ai-tools"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          GitHub
        </a>
      </div>
    </header>
  )
}
