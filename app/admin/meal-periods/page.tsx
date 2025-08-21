"use client";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import Link from "next/link";
import TimePicker from 'react-time-picker';
// import 'react-time-picker/dist/TimePicker.css';
// import 'react-clock/dist/Clock.css';
import './time-picker.css'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Clock, Trash2, Utensils } from "lucide-react";

type MealPeriod = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

type TimeValue = string | null;

// Helper function to convert local time to UTC using browser timezone
function convertLocalTimeToUTC(localTime: string): string {
  const today = new Date().toISOString().split('T')[0];
  const localDateTime = `${today}T${localTime}:00`;
  
  // Create date in local timezone, then get UTC equivalent
  const localDate = new Date(localDateTime);
  const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${utcHours}:${utcMinutes}`;
}

// Helper function to convert UTC time to local time for display using browser timezone
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

export default function MealPeriodsAdmin() {
  const [mealPeriods, setMealPeriods] = useState<MealPeriod[]>([]);
  const [newMeal, setNewMeal] = useState({
    name: "",
    startTime: "",
    endTime: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchMealPeriods();
  }, []);

  const fetchMealPeriods = async () => {
    try {
      const response = await fetch("/api/meal-periods");
      if (response.ok) {
        const data = await response.json();
        setMealPeriods(data);
      } else {
        console.error("Failed to fetch meal periods: HTTP", response.status);
      }
    } catch (error) {
      console.error("Failed to fetch meal periods:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeal.name || !newMeal.startTime || !newMeal.endTime) return;

    setIsLoading(true);
    try {
      // Convert local times to UTC before sending to API
      const startTimeUTC = convertLocalTimeToUTC(newMeal.startTime);
      const endTimeUTC = convertLocalTimeToUTC(newMeal.endTime);
      
      const response = await fetch("/api/meal-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMeal.name,
          startTime: startTimeUTC,
          endTime: endTimeUTC,
        }),
      });

      if (response.ok) {
        setNewMeal({ name: "", startTime: "", endTime: "" });
        await fetchMealPeriods();
      } else {
        console.error("Failed to create meal period: HTTP", response.status);
      }
    } catch (error) {
      console.error("Failed to create meal period:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meal-periods/${mealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMealPeriods(prev => prev.filter(meal => meal.id !== mealId));
      } else {
        console.error("Failed to delete meal period: HTTP", response.status);
      }
    } catch (error) {
      console.error("Failed to delete meal period:", error);
    }
  };

  const handleStartTimeChange = (time: TimeValue) => {
    setNewMeal({ ...newMeal, startTime: time || '' });
  };

  const handleEndTimeChange = (time: TimeValue) => {
    setNewMeal({ ...newMeal, endTime: time || '' });
  };

  return (
    <Suspense fallback={"loading..."}>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <Link href="/admin">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Administration
            </Button>
          </Link>

          <h1 className="text-3xl font-bold mb-2">
            Meal Periods Management
          </h1>
          <p className="text-muted-foreground">
            Configure time slots for meal-based review analysis
          </p>
        </div>

        {/* Add New Meal Period */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add Meal Period</CardTitle>
            <CardDescription>
              Define a new time slot for meals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Meal Name</Label>
                  <Input
                    id="name"
                    value={newMeal.name}
                    onChange={(e) =>
                      setNewMeal({ ...newMeal, name: e.target.value })
                    }
                    placeholder="e.g., Breakfast"
                    required
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <div className="mt-1">
                    <TimePicker
                      onChange={handleStartTimeChange}
                      value={newMeal.startTime || null}
                      disableClock={true}
                      format="HH:mm"
                      clockIcon={null}
                      clearIcon={null}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <Label>End Time</Label>
                  <div className="mt-1">
                    <TimePicker
                      onChange={handleEndTimeChange}
                      value={newMeal.endTime || null}
                      disableClock={true}
                      format="HH:mm"
                      clockIcon={null}
                      clearIcon={null}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? "Adding..." : "Add Period"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Meal Periods */}
        <Card>
          <CardHeader>
            <CardTitle>Configured Periods</CardTitle>
            <CardDescription>
              {mealPeriods.length} active meal period{mealPeriods.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mealPeriods.length > 0 ? (
              <div className="space-y-4">
                {mealPeriods.map((meal) => (
                  <div
                    key={meal.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <Utensils className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{meal.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>
                            {convertUTCTimeToLocal(meal.start_time)} - {convertUTCTimeToLocal(meal.end_time)} (local time)
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDelete(meal.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Periods Configured
                </h3>
                <p className="text-muted-foreground">
                  Add your first meal period above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}