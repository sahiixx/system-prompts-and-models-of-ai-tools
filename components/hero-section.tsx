import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface HeroSectionProps {
  totalTools: number
  totalFeatures: number
}

export function HeroSection({ totalTools, totalFeatures }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(190_95%_39%/0.08),transparent_60%)]" />
      <div className="container relative flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <span className="font-mono">{totalTools} tools</span>
          <span className="text-primary/40">|</span>
          <span className="font-mono">{totalFeatures} features tracked</span>
        </div>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-6xl">
          The Definitive Guide to AI Coding Tools
        </h1>
        <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
          Explore system prompts, compare capabilities, and analyze the
          landscape of {totalTools} AI coding assistants from Cursor to GitHub
          Copilot.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore Tools
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            View Analytics
          </Link>
        </div>
      </div>
    </section>
  )
}
