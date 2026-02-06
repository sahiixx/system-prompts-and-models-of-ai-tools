"use client"

import { useState } from "react"
import type { ToolDetail } from "@/lib/data"
import { Check, X, TrendingUp, AlertTriangle, Star, Users } from "lucide-react"

interface ToolDetailTabsProps {
  tool: ToolDetail
}

type TabKey = "analysis" | "pricing" | "models" | "security" | "history"

export function ToolDetailTabs({ tool }: ToolDetailTabsProps) {
  const [active, setActive] = useState<TabKey>("analysis")

  const tabs: { key: TabKey; label: string; available: boolean }[] = [
    { key: "analysis", label: "Analysis", available: !!tool.analysis },
    { key: "pricing", label: "Pricing", available: !!tool.pricing },
    { key: "models", label: "Models", available: !!tool.models },
    { key: "security", label: "Security", available: !!tool.security },
    {
      key: "history",
      label: "History",
      available: !!tool.version?.history?.length,
    },
  ]

  const availableTabs = tabs.filter((t) => t.available)

  if (availableTabs.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {availableTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {active === "analysis" && tool.analysis && (
          <AnalysisPanel analysis={tool.analysis} market={tool.marketPosition} />
        )}
        {active === "pricing" && tool.pricing && (
          <PricingPanel pricing={tool.pricing} />
        )}
        {active === "models" && tool.models && (
          <ModelsPanel models={tool.models} />
        )}
        {active === "security" && tool.security && (
          <SecurityPanel security={tool.security} />
        )}
        {active === "history" && tool.version?.history && (
          <HistoryPanel history={tool.version.history} />
        )}
      </div>
    </div>
  )
}

function AnalysisPanel({
  analysis,
  market,
}: {
  analysis: NonNullable<ToolDetail["analysis"]>
  market?: ToolDetail["marketPosition"]
}) {
  return (
    <div className="flex flex-col gap-6">
      {market && (
        <div className="flex flex-wrap gap-4">
          {market.userBase && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">
                {market.userBase} users
              </span>
            </div>
          )}
          {market.yearLaunched && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
              <span className="text-sm text-foreground">
                Launched {market.yearLaunched}
              </span>
            </div>
          )}
          {market.popularity && (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground capitalize">
                {market.popularity.replace("-", " ")} popularity
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Check className="h-4 w-4 text-emerald-400" />
            Strengths
          </h4>
          <ul className="flex flex-col gap-2">
            {analysis.strengths.map((s) => (
              <li
                key={s}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Weaknesses
          </h4>
          <ul className="flex flex-col gap-2">
            {analysis.weaknesses.map((w) => (
              <li
                key={w}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {analysis.uniqueFeatures.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 text-primary" />
            Unique Features
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.uniqueFeatures.map((f) => (
              <span
                key={f}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.bestFor.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-foreground">Best For</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.bestFor.map((b) => (
              <span
                key={b}
                className="rounded-md border border-border bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PricingPanel({
  pricing,
}: {
  pricing: NonNullable<ToolDetail["pricing"]>
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pricing model:{" "}
        <span className="font-medium text-foreground capitalize">
          {pricing.model}
        </span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pricing.tiers.map((tier) => (
          <div
            key={tier.name}
            className="flex flex-col gap-3 rounded-lg border border-border p-5"
          >
            <h4 className="font-semibold text-foreground">{tier.name}</h4>
            <p className="text-2xl font-bold font-mono text-primary">
              {tier.price}
            </p>
            <ul className="flex flex-col gap-1.5">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModelsPanel({
  models,
}: {
  models: NonNullable<ToolDetail["models"]>
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Primary model:</span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {models.primary}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-foreground">
          Supported Models
        </h4>
        <div className="flex flex-wrap gap-2">
          {models.supported.map((m) => (
            <span
              key={m}
              className="rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Custom models:{" "}
        {models.customizable ? (
          <span className="text-emerald-400">Supported</span>
        ) : (
          <span className="text-amber-400">Not available</span>
        )}
      </p>
    </div>
  )
}

function SecurityPanel({
  security,
}: {
  security: NonNullable<ToolDetail["security"]>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(security).map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-lg border border-border p-4"
        >
          <span className="text-sm text-muted-foreground capitalize">
            {key.replace(/([A-Z])/g, " $1").trim()}
          </span>
          {typeof value === "boolean" ? (
            value ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/40" />
            )
          ) : (
            <span className="text-sm font-medium text-foreground">
              {String(value)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function HistoryPanel({
  history,
}: {
  history: { version: string; date: string; changes: string }[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {history.map((entry, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            {i < history.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>
          <div className="flex flex-col gap-1 pb-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {entry.version}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.date}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{entry.changes}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
