import { Blocks, Code, Bot, Layers } from "lucide-react"

interface StatCardsProps {
  totalTools: number
  typeBreakdown: Record<string, number>
  topFeatureCount: number
}

export function StatCards({
  totalTools,
  typeBreakdown,
  topFeatureCount,
}: StatCardsProps) {
  const stats = [
    {
      label: "Total Tools",
      value: totalTools,
      icon: Blocks,
      description: "AI coding assistants tracked",
    },
    {
      label: "IDE Plugins",
      value: typeBreakdown["IDE Plugin"] || 0,
      icon: Code,
      description: "Editor integrations",
    },
    {
      label: "Autonomous Agents",
      value: typeBreakdown["Autonomous Agent"] || 0,
      icon: Bot,
      description: "Self-operating AI agents",
    },
    {
      label: "Web Platforms",
      value: typeBreakdown["Web Platform"] || 0,
      icon: Layers,
      description: "Browser-based tools",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center gap-2">
            <stat.icon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <div className="text-3xl font-bold text-foreground font-mono">
            {stat.value}
          </div>
          <p className="text-xs text-muted-foreground">{stat.description}</p>
        </div>
      ))}
    </div>
  )
}
