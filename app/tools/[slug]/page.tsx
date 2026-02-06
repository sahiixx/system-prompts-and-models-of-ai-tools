import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Globe, Shield, Cpu, Tag } from "lucide-react"
import { getAllTools, getToolDetail, featureLabels, getTypeBadgeClass } from "@/lib/data"
import { ToolDetailTabs } from "@/components/tool-detail-tabs"

export async function generateStaticParams() {
  const tools = getAllTools()
  return tools.map((tool) => ({ slug: tool.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = await getToolDetail(slug)
  if (!tool) return { title: "Tool Not Found" }
  return {
    title: `${tool.name} - AI Tools Directory`,
    description: tool.description,
  }
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tool = await getToolDetail(slug)

  if (!tool) {
    notFound()
  }

  const enabledFeatures = tool.features
    ? Object.entries(tool.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : []

  const enabledPlatforms = tool.platforms
    ? Object.entries(tool.platforms)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : []

  return (
    <div className="container flex flex-col gap-8 py-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to all tools
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-lg font-bold">
              {tool.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {tool.name}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(tool.type)}`}
                >
                  {tool.type}
                </span>
                {tool.version && (
                  <span className="text-xs text-muted-foreground font-mono">
                    v{tool.version.current}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="max-w-2xl text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Quick Links */}
        {tool.links && (
          <div className="flex flex-wrap gap-2">
            {tool.links.website && (
              <a
                href={tool.links.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                <Globe className="h-3 w-3" />
                Website
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {tool.links.docs && (
              <a
                href={tool.links.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                Docs
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      {tool.metrics && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: "Prompt Tokens", value: tool.metrics.promptTokens.toLocaleString() },
            { label: "Tools Count", value: tool.metrics.toolsCount },
            { label: "Security Rules", value: tool.metrics.securityRules },
            { label: "Conciseness", value: `${tool.metrics.concisenessScore}%` },
            { label: "Parallel", value: `${tool.metrics.parallelCapability}%` },
          ].map((m) => (
            <div
              key={m.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4"
            >
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className="text-xl font-bold font-mono text-foreground">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Features & Platforms */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Features */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Features</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {enabledFeatures.map((f) => (
              <span
                key={f}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {featureLabels[f] || f}
              </span>
            ))}
            {enabledFeatures.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No feature data available
              </span>
            )}
          </div>
        </div>

        {/* Platforms */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Platforms</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {enabledPlatforms.map((p) => (
              <span
                key={p}
                className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"
              >
                {p}
              </span>
            ))}
            {enabledPlatforms.length === 0 && (
              <span className="text-sm text-muted-foreground">
                No platform data available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <ToolDetailTabs tool={tool} />

      {/* Tags */}
      {tool.tags && tool.tags.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Tags</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
