import { HeroSection } from "@/components/hero-section"
import { StatCards } from "@/components/stat-cards"
import { ToolsGrid } from "@/components/tools-grid"
import { FeatureOverview } from "@/components/feature-overview"
import { getAllTools, getStatistics } from "@/lib/data"

export default function HomePage() {
  const tools = getAllTools()
  const stats = getStatistics()

  return (
    <div className="flex flex-col">
      <HeroSection
        totalTools={stats.total_tools}
        totalFeatures={Object.keys(stats.feature_adoption).length}
      />
      <div className="container flex flex-col gap-12 py-12">
        <StatCards
          totalTools={stats.total_tools}
          typeBreakdown={stats.by_type}
          topFeatureCount={stats.most_common_features[0]?.[1] || 0}
        />
        <ToolsGrid tools={tools} />
        <FeatureOverview
          featureAdoption={stats.feature_adoption}
          totalTools={stats.total_tools}
        />
      </div>
    </div>
  )
}
