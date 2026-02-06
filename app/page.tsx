import { getToolIndex, getStatistics } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ToolsOverview } from "@/components/tools-overview";
import { FeatureChart } from "@/components/feature-chart";
import { Box, Layers, Cpu, Activity } from "lucide-react";

export default function DashboardPage() {
  const tools = getToolIndex();
  const stats = getStatistics();

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dashboard"
        description="Overview of the AI Platform ecosystem - tools, models, and feature adoption."
      />

      <div className="flex flex-col gap-6 p-6 md:p-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tools"
            value={stats.total_tools}
            description="Active AI coding assistants"
            icon={<Box className="h-4 w-4" />}
          />
          <StatCard
            label="IDE Plugins"
            value={stats.by_type["IDE Plugin"] || 0}
            description="Editor integrations"
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard
            label="Autonomous Agents"
            value={stats.by_type["Autonomous Agent"] || 0}
            description="Self-operating AI agents"
            icon={<Cpu className="h-4 w-4" />}
          />
          <StatCard
            label="Web Platforms"
            value={stats.by_type["Web Platform"] || 0}
            description="Browser-based tools"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Feature adoption chart */}
        <FeatureChart stats={stats} />

        {/* Tools overview */}
        <ToolsOverview tools={tools.tools} />
      </div>
    </div>
  );
}
