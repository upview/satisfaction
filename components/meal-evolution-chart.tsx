"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

type EvolutionData = {
  date: string;
  [mealName: string]: number | string | undefined;
  [key: `${string}_count`]: number; // Add vote count support
};

type MealEvolutionChartProps = {
  data: EvolutionData[];
  mealNames: string[];
};

const COLORS = [
  "#8884d8", // Blue
  "#82ca9d", // Green
  "#ffc658", // Yellow
  "#ff7c7c", // Red
  "#8dd1e1", // Light Blue
  "#d084d0", // Purple
];

export function MealEvolutionChart({
  data,
  mealNames,
}: MealEvolutionChartProps) {
  const [timeRange, setTimeRange] = useState("14d");

  // Filter data by time range
  const timeFilteredData = useMemo(() => {
    if (!data.length || timeRange === "all") return data;

    const now = new Date();
    let daysToSubtract = 14;
    
    if (timeRange === "7d") {
      daysToSubtract = 7;
    } else if (timeRange === "14d") {
      daysToSubtract = 14;
    } else if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "90d") {
      daysToSubtract = 90;
    }
    
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    
    return data.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [data, timeRange]);

  // Memoize filtered data to prevent unnecessary re-renders
  // Only filter out days where ALL meals have 0 votes (not just 0 ratings)
  const filteredData = useMemo(() => {
    return timeFilteredData.filter((day) =>
      mealNames.some((meal) => {
        const countKey = `${meal}_count` as keyof EvolutionData;
        const count = day[countKey] as number || 0;
        return count > 0; // Only show days with actual votes
      })
    );
  }, [timeFilteredData, mealNames]);

  // Memoize chart lines to prevent recreation on every render
  const chartLines = useMemo(() => {
    return mealNames.map((mealName, index) => (
      <Line
        key={`meal-line-${mealName}-${index}`} // More stable key
        type="monotone"
        dataKey={mealName}
        stroke={COLORS[index % COLORS.length]}
        strokeWidth={2}
        dot={{
          fill: COLORS[index % COLORS.length],
          strokeWidth: 2,
          r: 4,
        }}
        connectNulls={false}
        isAnimationActive={false} // Disable animations to prevent DOM issues
      />
    ));
  }, [mealNames]);

  const formatXAxisDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MM/dd", { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">
            {format(new Date(label), "MMMM dd, yyyy", { locale: enUS })}
          </p>
          {payload.map((entry: any, index: number) => {
            const mealName = entry.dataKey;
            const rating = entry.value;
            const countKey = `${mealName}_count`;
            const count = entry.payload[countKey] || 0;
            
            return (
              <p key={`tooltip-${index}`} style={{ color: entry.color }} className="text-sm">
                {mealName}:{" "}
                {count > 0 ? (
                  <>
                    <span className="font-medium">{rating}/5</span>
                    <span className="text-muted-foreground ml-1">({count} vote{count !== 1 ? 's' : ''})</span>
                  </>
                ) : (
                  "No reviews"
                )}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>Rating Evolution by Meal</CardTitle>
          <CardDescription>
            Daily averages over the selected period
            {filteredData.length > 0 &&
              ` (${filteredData.length} days with reviews)`}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="14d">Last 14 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatXAxisDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  domain={[1, 5]}
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Rating /5",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {chartLines}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-center">
            <div>
              <p className="text-muted-foreground mb-2">
                No evolution data available
              </p>
              <p className="text-sm text-muted-foreground">
                Data will appear as reviews are received
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}