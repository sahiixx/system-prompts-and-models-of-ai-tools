"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Statistics } from "@/lib/data";

const featureLabels: Record<string, string> = {
  codeGeneration: "Code Gen",
  memorySystem: "Memory",
  testGeneration: "Testing",
  chatInterface: "Chat",
  agentMode: "Agent",
  debugging: "Debug",
  parallelExecution: "Parallel",
  gitIntegration: "Git",
  todoTracking: "Todos",
  refactoring: "Refactor",
  multiFileEditing: "Multi-File",
  codeCompletion: "Completion",
  composerMode: "Composer",
  prReviews: "PR Review",
  commitMessages: "Commits",
};

export function FeatureChart({ stats }: { stats: Statistics }) {
  const data = stats.most_common_features.map(([feature, count]) => ({
    name: featureLabels[feature] || feature,
    count,
  }));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">
        Feature Adoption
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Number of tools supporting each feature
      </p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(240 4% 14%)"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(240 5% 55%)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240 5% 7%)",
                border: "1px solid hsl(240 4% 14%)",
                borderRadius: "8px",
                color: "hsl(0 0% 95%)",
                fontSize: 13,
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index < 3
                      ? "hsl(160 84% 39%)"
                      : "hsl(160 84% 39% / 0.5)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
