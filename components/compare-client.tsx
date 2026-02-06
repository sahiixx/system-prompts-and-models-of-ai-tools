"use client"

import { useState, useEffect } from "react"
import { Check, X, Plus, Trash2 } from "lucide-react"
import type { Tool, ToolDetail } from "@/lib/data"
import { featureLabels, getTypeBadgeClass } from "@/lib/data"

interface CompareClientProps {
  tools: Tool[]
}

export function CompareClient({ tools }: CompareClientProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [details, setDetails] = useState<Record<string, ToolDetail>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true)
      const newDetails: Record<string, ToolDetail> = {}
      for (const slug of selectedSlugs) {
        if (!details[slug]) {
          try {
            const res = await fetch(`/api/tool-detail?slug=${slug}`)
            if (res.ok) {
              newDetails[slug] = await res.json()
            }
          } catch {
            // Fallback: load from static data
          }
        } else {
          newDetails[slug] = details[slug]
        }
      }
      setDetails((prev) => ({ ...prev, ...newDetails }))
      setLoading(false)
    }
    if (selectedSlugs.length > 0) loadDetails()
  }, [selectedSlugs])

  const addTool = (slug: string) => {
    if (selectedSlugs.length < 3 && !selectedSlugs.includes(slug)) {
      setSelectedSlugs((prev) => [...prev, slug])
    }
  }

  const removeTool = (slug: string) => {
    setSelectedSlugs((prev) => prev.filter((s) => s !== slug))
  }

  const selectedTools = selectedSlugs
    .map((slug) => {
      const basic = tools.find((t) => t.slug === slug)
      const detail = details[slug]
      return basic ? { ...basic, detail } : null
    })
    .filter(Boolean) as (Tool & { detail?: ToolDetail })[]

  const allFeatureKeys = Array.from(
    new Set(
      selectedTools.flatMap((t) =>
        t.detail?.features ? Object.keys(t.detail.features) : []
      )
    )
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Tool Selector */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-foreground">
          Select tools to compare
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedSlugs.map((slug) => {
            const tool = tools.find((t) => t.slug === slug)
            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
              >
                {tool?.name}
                <button onClick={() => removeTool(slug)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            )
          })}
          {selectedSlugs.length < 3 && (
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addTool(e.target.value)
                    e.target.value = ""
                  }
                }}
                className="appearance-none rounded-full border border-dashed border-border bg-secondary px-4 py-1.5 pr-8 text-sm text-muted-foreground hover:border-primary/50 focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  + Add tool
                </option>
                {tools
                  .filter((t) => !selectedSlugs.includes(t.slug))
                  .map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedTools.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-20">
          <Plus className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            Select tools above to start comparing
          </p>
        </div>
      )}

      {selectedTools.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Property
                </th>
                {selectedTools.map((t) => (
                  <th
                    key={t.slug}
                    className="text-left py-3 px-4 text-sm font-semibold text-foreground"
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Type */}
              <tr className="border-b border-border">
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  Type
                </td>
                {selectedTools.map((t) => (
                  <td key={t.slug} className="py-3 px-4">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getTypeBadgeClass(t.type)}`}
                    >
                      {t.type}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Primary Model */}
              <tr className="border-b border-border">
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  Primary Model
                </td>
                {selectedTools.map((t) => (
                  <td
                    key={t.slug}
                    className="py-3 px-4 text-sm text-foreground font-mono"
                  >
                    {t.detail?.models?.primary || "-"}
                  </td>
                ))}
              </tr>

              {/* Pricing */}
              <tr className="border-b border-border">
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  Pricing
                </td>
                {selectedTools.map((t) => (
                  <td
                    key={t.slug}
                    className="py-3 px-4 text-sm text-foreground capitalize"
                  >
                    {t.detail?.pricing?.model || "-"}
                  </td>
                ))}
              </tr>

              {/* Prompt Tokens */}
              <tr className="border-b border-border">
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  Prompt Tokens
                </td>
                {selectedTools.map((t) => (
                  <td
                    key={t.slug}
                    className="py-3 px-4 text-sm font-mono text-foreground"
                  >
                    {t.detail?.metrics?.promptTokens?.toLocaleString() || "-"}
                  </td>
                ))}
              </tr>

              {/* Tools Count */}
              <tr className="border-b border-border">
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  Tools Count
                </td>
                {selectedTools.map((t) => (
                  <td
                    key={t.slug}
                    className="py-3 px-4 text-sm font-mono text-foreground"
                  >
                    {t.detail?.metrics?.toolsCount || "-"}
                  </td>
                ))}
              </tr>

              {/* Features */}
              {allFeatureKeys.map((feature) => (
                <tr key={feature} className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {featureLabels[feature] || feature}
                  </td>
                  {selectedTools.map((t) => {
                    const has = t.detail?.features?.[feature]
                    return (
                      <td key={t.slug} className="py-3 px-4">
                        {has ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
