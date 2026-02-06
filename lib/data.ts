import fs from "fs"
import path from "path"

function readJson(filePath: string) {
  const fullPath = path.join(process.cwd(), filePath)
  const raw = fs.readFileSync(fullPath, "utf-8")
  return JSON.parse(raw)
}

export interface Tool {
  slug: string
  name: string
  type: string
  description: string
  status: string
}

export interface ToolIndex {
  version: string
  generated: string
  count: number
  tools: Tool[]
}

export interface Statistics {
  version: string
  generated: string
  total_tools: number
  by_type: Record<string, number>
  by_pricing: Record<string, number>
  feature_adoption: Record<string, number>
  most_common_features: [string, number][]
}

export interface FeatureData {
  version: string
  generated: string
  features: Record<string, { slug: string; name: string }[]>
}

export interface TypeData {
  version: string
  generated: string
  types: Record<string, { slug: string; name: string; description: string }[]>
}

export interface SearchEntry {
  slug: string
  name: string
  type: string
  description: string
  tags: string[]
  keywords: string[]
}

export interface SearchData {
  version: string
  generated: string
  index: SearchEntry[]
}

export interface PricingData {
  version: string
  generated: string
  pricing_models: Record<
    string,
    { slug: string; name: string; type: string }[]
  >
}

export function getToolIndex(): ToolIndex {
  return readJson("api/index.json")
}

export function getStatistics(): Statistics {
  return readJson("api/statistics.json")
}

export function getFeatures(): FeatureData {
  return readJson("api/features.json")
}

export function getByType(): TypeData {
  return readJson("api/by-type.json")
}

export function getByPricing(): PricingData {
  return readJson("api/by-pricing.json")
}

export function getSearchIndex(): SearchData {
  return readJson("api/search.json")
}

export function getToolDetail(slug: string) {
  try {
    return readJson(`api/tools/${slug}.json`)
  } catch {
    return null
  }
}

export function getToolMetadata(slug: string) {
  try {
    return readJson(`metadata/${slug}.json`)
  } catch {
    return null
  }
}

export function getToolPrompts(dirName: string): string[] {
  const dirPath = path.join(process.cwd(), dirName)
  try {
    if (!fs.existsSync(dirPath)) return []
    const files = fs.readdirSync(dirPath)
    return files.filter(
      (f) => f.endsWith(".txt") || f.endsWith(".json") || f.endsWith(".yaml")
    )
  } catch {
    return []
  }
}

export function readPromptFile(dirName: string, fileName: string): string {
  const filePath = path.join(process.cwd(), dirName, fileName)
  try {
    return fs.readFileSync(filePath, "utf-8")
  } catch {
    return ""
  }
}

export function formatFeatureName(feature: string): string {
  return feature
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

export function getTypeColor(type: string): string {
  switch (type) {
    case "IDE Plugin":
      return "bg-primary/10 text-primary border-primary/20"
    case "Web Platform":
      return "bg-chart-2/10 text-chart-2 border-chart-2/20"
    case "Autonomous Agent":
      return "bg-chart-3/10 text-chart-3 border-chart-3/20"
    case "CLI Tool":
      return "bg-chart-4/10 text-chart-4 border-chart-4/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}
