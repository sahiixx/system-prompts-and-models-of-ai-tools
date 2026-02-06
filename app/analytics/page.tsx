import type { Metadata } from "next"
import { getStatistics, getAllTools } from "@/lib/data"
import { FeatureAdoptionChart } from "@/components/charts/feature-adoption-chart"
import { TypeDistributionChart } from "@/components/charts/type-distribution-chart"
import { TopFeaturesChart } from "@/components/charts/top-features-chart"
import { Blocks, Code, Bot, Layers, TrendingUp, BarChart3 } from "lucide-react"

export const metadata: Metadata = {
  title: "Analytics - AI Tools Directory",
  description: "Explore analytics and insights across 37+ AI coding tools. Feature adoption, type distribution, and market trends.",
}

export default function AnalyticsPage() {
  const stats = getStatistics()
  const tools = getAllTools()

  const statCards = [
    {
      label: "Total Tools",
      value: stats.total_tools,
      icon: Blocks,
      change: "+5 this quarter",
    },
    {
      label: "IDE Plugins",
      value: stats.by_type["IDE Plugin"] || 0,
      icon: Code,
      change: "81% of total",
    },
    {
      label: "Web Platforms",
      value: stats.by_type["Web Platform"] || 0,
      icon: Layers,
      change: "11% of total",
    },
    {
      label: "Autonomous Agents",
      value: stats.by_type["Autonomous Agent"] || 0,
      icon: Bot,
      change: "8% of total",
    },
    {
      label: "Features Tracked",
      value: Object.keys(stats.feature_adoption).length,
      icon: TrendingUp,
      change: "Across all tools",
    },
    {
      label: "Top Feature",
      value: `${stats.most_common_features[0]?.[1] || 0}`,
      icon: BarChart3,
      change: "Code Generation",
    },
  ]

  return (
    <div className="container flex flex-col gap-10 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Analytics Dashboard
        </h1>
        <p className="text-muted-foreground">
          Insights and trends across the AI coding tools landscape.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <stat.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <span className="text-2xl font-bold font-mono text-foreground">
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground">{stat.change}</span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-foreground">
              Feature Adoption Rates
            </h3>
            <p className="text-sm text-muted-foreground">
              How many tools support each feature
            </p>
          </div>
          <FeatureAdoptionChart
            data={stats.feature_adoption}
            totalTools={stats.total_tools}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold text-foreground">
              Tool Type Distribution
            </h3>
            <p className="text-sm text-muted-foreground">
              Breakdown by category
            </p>
          </div>
          <TypeDistributionChart data={stats.by_type} />
        </div>
      </div>

      {/* Full Width Chart */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-foreground">
            Top 10 Most Common Features
          </h3>
          <p className="text-sm text-muted-foreground">
            Features ranked by adoption count across all tools
          </p>
        </div>
        <TopFeaturesChart
          data={stats.most_common_features.slice(0, 10)}
          totalTools={stats.total_tools}
        />
      </div>

      {/* Pricing Breakdown */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
        <h3 className="font-semibold text-foreground">Pricing Distribution</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.by_pricing).map(([model, count]) => {
            const pct = Math.round((count / stats.total_tools) * 100)
            return (
              <div key={model} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize text-foreground">
                    {model}
                  </span>
                  <span className="font-mono text-sm text-primary">
                    {count}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {pct}% of tools
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
