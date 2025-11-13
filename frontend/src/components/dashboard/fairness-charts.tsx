"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fairnessMetricsData } from "@/lib/mock-data";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  "Statistical Parity": {
    label: "Statistical Parity",
    color: "hsl(var(--chart-1))",
  },
  "Equal Opportunity": {
    label: "Equal Opportunity",
    color: "hsl(var(--chart-2))",
  },
  "Disparate Impact": {
    label: "Disparate Impact",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

export function FairnessCharts() {
  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart data={fairnessMetricsData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="group"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <Tooltip
              cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }}
              content={<ChartTooltipContent />}
            />
            <Legend />
            <Bar dataKey="Statistical Parity" fill="var(--color-Statistical Parity)" radius={4} />
            <Bar dataKey="Equal Opportunity" fill="var(--color-Equal Opportunity)" radius={4} />
            <Bar dataKey="Disparate Impact" fill="var(--color-Disparate Impact)" radius={4} />
          </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
