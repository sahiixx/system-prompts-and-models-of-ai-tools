import indexData from "@/api/index.json"
import statisticsData from "@/api/statistics.json"
import featuresData from "@/api/features.json"
import searchData from "@/api/search.json"
import byTypeData from "@/api/by-type.json"

// Types
export interface Tool {
  slug: string
  name: string
  type: string
  description: string
  status: string
}

export interface ToolDetail {
  name: string
  slug: string
  type: string
  status: string
  description: string
  generated?: string
  version?: {
    current: string
    lastUpdated: string
    history: { version: string; date: string; changes: string }[]
  }
  pricing?: {
    model: string
    tiers: { name: string; price: string; features: string[] }[]
  }
  models?: {
    primary: string
    supported: string[]
    customizable: boolean
  }
  features?: Record<string, boolean>
  platforms?: Record<string, boolean>
  languages?: {
    supported: string[]
    optimized: string[]
  }
  integrations?: Record<string, boolean>
  security?: Record<string, string | boolean>
  patterns?: Record<string, string | boolean>
  documentation?: {
    folder: string
    files: Record<string, unknown>
    hasMultipleVersions: boolean
    versions: string[]
  }
  links?: Record<string, string | null>
  tags?: string[]
  metrics?: {
    promptTokens: number
    toolsCount: number
    securityRules: number
    concisenessScore: number
    parallelCapability: number
  }
  analysis?: {
    strengths: string[]
    weaknesses: string[]
    uniqueFeatures: string[]
    bestFor: string[]
  }
  marketPosition?: {
    popularity: string
    userBase: string
    yearLaunched: number
    competition: string[]
  }
}

export interface SearchEntry {
  slug: string
  name: string
  type: string
  description: string
  tags: string[]
  keywords: string[]
}

export interface Statistics {
  total_tools: number
  by_type: Record<string, number>
  by_pricing: Record<string, number>
  feature_adoption: Record<string, number>
  most_common_features: [string, number][]
}

// Data accessors
export function getAllTools(): Tool[] {
  return (indexData as { tools: Tool[] }).tools
}

export function getStatistics(): Statistics {
  return statisticsData as unknown as Statistics
}

export function getFeatures(): Record<string, { slug: string; name: string }[]> {
  return (featuresData as { features: Record<string, { slug: string; name: string }[]> }).features
}

export function getSearchIndex(): SearchEntry[] {
  return (searchData as { index: SearchEntry[] }).index
}

export function getToolsByType(): Record<string, { slug: string; name: string; description: string }[]> {
  return (byTypeData as { types: Record<string, { slug: string; name: string; description: string }[]> }).types
}

export async function getToolDetail(slug: string): Promise<ToolDetail | null> {
  try {
    const data = await import(`@/api/tools/${slug}.json`)
    return data.default as ToolDetail
  } catch {
    return null
  }
}

export async function getToolMetadata(slug: string): Promise<ToolDetail | null> {
  try {
    const data = await import(`@/metadata/${slug}.json`)
    return data.default as ToolDetail
  } catch {
    return null
  }
}

// Feature labels mapping
export const featureLabels: Record<string, string> = {
  codeGeneration: "Code Generation",
  codeCompletion: "Code Completion",
  chatInterface: "Chat Interface",
  agentMode: "Agent Mode",
  parallelExecution: "Parallel Execution",
  memorySystem: "Memory System",
  todoTracking: "Todo Tracking",
  gitIntegration: "Git Integration",
  multiFileEditing: "Multi-file Editing",
  testGeneration: "Test Generation",
  refactoring: "Refactoring",
  debugging: "Debugging",
  composerMode: "Composer Mode",
  prReviews: "PR Reviews",
  commitMessages: "Commit Messages",
}

// Type badge colors
export function getTypeBadgeClass(type: string): string {
  switch (type) {
    case "IDE Plugin":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    case "Web Platform":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "Autonomous Agent":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}
