"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { featureLabels } from "@/lib/data"

interface TopFeaturesChartProps {
  data: [string, number][]
  totalTools: number
}

export function TopFeaturesChart({ data, totalTools }: TopFeaturesChartProps) {
  const chartData = data.map(([key, value]) => ({
    name: featureLabels[key] || key,
    count: value,
    pct: Math.round((value / totalTools) * 100),
  }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(216 34% 17%)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
            axisLine={{ stroke: "hsl(216 34% 17%)" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
            axisLine={{ stroke: "hsl(216 34% 17%)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(224 71% 4%)",
              border: "1px solid hsl(216 34% 17%)",
              borderRadius: "8px",
              color: "hsl(213 31% 91%)",
              fontSize: 13,
            }}
            formatter={(value: number, name: string, props: { payload: { pct: number } }) => [
              `${value} tools (${props.payload.pct}%)`,
              "Adoption",
            ]}
          />
          <Bar
            dataKey="count"
            fill="hsl(190 95% 39%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
