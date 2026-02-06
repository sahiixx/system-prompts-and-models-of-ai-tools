"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface TypeDistributionChartProps {
  data: Record<string, number>
}

const COLORS = [
  "hsl(190 95% 39%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 65% 60%)",
]

export function TypeDistributionChart({ data }: TypeDistributionChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(224 71% 4%)",
              border: "1px solid hsl(216 34% 17%)",
              borderRadius: "8px",
              color: "hsl(213 31% 91%)",
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value} tools`, "Count"]}
          />
          <Legend
            wrapperStyle={{ color: "hsl(215 20% 55%)", fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
