import { featureLabels } from "@/lib/data"

interface FeatureOverviewProps {
  featureAdoption: Record<string, number>
  totalTools: number
}

export function FeatureOverview({
  featureAdoption,
  totalTools,
}: FeatureOverviewProps) {
  const sorted = Object.entries(featureAdoption).sort(([, a], [, b]) => b - a)

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        Feature Adoption
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map(([key, count]) => {
          const pct = Math.round((count / totalTools) * 100)
          return (
            <div
              key={key}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {featureLabels[key] || key}
                </span>
                <span className="font-mono text-sm text-primary">
                  {count}/{totalTools}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {pct}% adoption
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
