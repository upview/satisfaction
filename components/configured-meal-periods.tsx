"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Utensils } from "lucide-react"
import { useState, useEffect } from "react"

// Helper function to convert UTC time to local time for display
function convertUTCTimeToLocal(utcTime: string): string {
  if (!utcTime) return '';
  
  const today = new Date().toISOString().split('T')[0];
  // Handle both HH:MM and HH:MM:SS formats
  const timeWithSeconds = utcTime.length === 5 ? `${utcTime}:00` : utcTime;
  const utcDateTime = `${today}T${timeWithSeconds}Z`;
  
  // Create UTC date, then format in local timezone
  const utcDate = new Date(utcDateTime);
  return utcDate.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

type MealPeriod = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

interface ConfiguredMealPeriodsProps {
  mealPeriods: MealPeriod[];
  currentMeal?: MealPeriod | null;
}

export function ConfiguredMealPeriods({ mealPeriods, currentMeal }: ConfiguredMealPeriodsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            Configured Meal Periods
          </CardTitle>
          <CardDescription>
            Active schedules for feedback analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-muted-foreground" />
                  <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-16 h-3 bg-muted rounded animate-pulse mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (mealPeriods.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">
          Configured Meal Periods
        </CardTitle>
        <CardDescription>
          Active schedules for feedback analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {mealPeriods.map((meal) => (
            <div
              key={meal.id}
              className={`p-3 rounded-lg border ${currentMeal?.id === meal.id
                ? "bg-emerald-50 border-emerald-200"
                : "bg-muted/50"
                }`}
            >
              <div className="flex items-center space-x-2">
                <Utensils className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{meal.name}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {convertUTCTimeToLocal(meal.start_time)} - {convertUTCTimeToLocal(meal.end_time)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}