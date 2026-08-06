"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export type TicketTrendPoint = {
  date: string;
  created: number;
  resolved: number;
};

const chartConfig = {
  created: {
    label: "Created",
    color: "var(--chart-1)",
  },
  resolved: {
    label: "Resolved",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const ranges = [
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
] as const;

type RangeDays = (typeof ranges)[number]["days"];

function formatDate(value: string, includeYear = false) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: includeYear ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function ChartAreaInteractive({ data }: { data: TicketTrendPoint[] }) {
  const [range, setRange] = React.useState<RangeDays>(14);
  const gradientId = React.useId().replace(/:/g, "");
  const filteredData = React.useMemo(() => data.slice(-range), [data, range]);
  const hasActivity = filteredData.some(
    (point) => point.created > 0 || point.resolved > 0,
  );

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Ticket activity</CardTitle>
        <CardDescription>
          Created and resolved tickets over the selected period.
        </CardDescription>
        <CardAction>
          <div className="hidden items-center gap-1 rounded-lg border bg-muted/40 p-0.5 sm:flex">
            {ranges.map((option) => (
              <Button
                key={option.days}
                onClick={() => setRange(option.days)}
                size="sm"
                type="button"
                variant={range === option.days ? "secondary" : "ghost"}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <NativeSelect
            aria-label="Ticket activity range"
            className="sm:hidden"
            onChange={(event) => setRange(Number(event.target.value) as RangeDays)}
            size="sm"
            value={range}
          >
            {ranges.map((option) => (
              <NativeSelectOption key={option.days} value={option.days}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        {hasActivity ? (
          <ChartContainer
            className="aspect-auto h-[270px] w-full"
            config={chartConfig}
          >
            <AreaChart accessibilityLayer data={filteredData}>
              <defs>
                <linearGradient
                  id={`created-${gradientId}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-created)"
                    stopOpacity={0.04}
                  />
                </linearGradient>
                <linearGradient
                  id={`resolved-${gradientId}`}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-resolved)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-resolved)"
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={28}
                tickFormatter={(value: string | number) =>
                  formatDate(String(value))
                }
                tickLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(value) => formatDate(String(value), true)}
                  />
                }
                cursor={false}
              />
              <Area
                dataKey="created"
                fill={`url(#created-${gradientId})`}
                stroke="var(--color-created)"
                strokeWidth={2}
                type="natural"
              />
              <Area
                dataKey="resolved"
                fill={`url(#resolved-${gradientId})`}
                stroke="var(--color-resolved)"
                strokeWidth={2}
                type="natural"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[270px] items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm text-muted-foreground">
            No ticket activity was recorded during this period.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
