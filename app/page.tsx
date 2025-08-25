import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Vote, Utensils } from "lucide-react";
import { CreateDeviceForm } from "@/components/create-device-form";
import { StarRating } from "@/components/star-rating";
import { MealStatsCard } from "@/components/meal-stats-card";
import { MealFilter } from "@/components/meal-filter";
import { DailyVsAllTimeStats } from "@/components/daily-vs-alltime-stats"
import { ConfiguredMealPeriods } from "@/components/configured-meal-periods"

import { createClient } from "gel";

type Device = {
  id: string;
  name: string;
  votes: Vote[];
};

type Vote = {
  id: string;
  value: number;
  created_at: string;
  device: Device;
};

type MealPeriod = {
  id: string;
  name: string;
  start_time: string; // Now always a string
  end_time: string;   // Now always a string
  is_active: boolean;
};

const client = createClient({
  instanceName: process.env.GEL_INSTANCE,
  // instance: process.env.GEL_INSTANCE,
  branch: process.env.GEL_BRANCH,
  secretKey: process.env.GEL_SECRET_KEY,
});

// Updated toHHMM function to handle time objects
function toHHMM(timeObj: any): string {
  if (typeof timeObj === 'string') {
    return timeObj; // Already a string
  }

  // Handle time objects with hour/minute properties
  if (timeObj && typeof timeObj === 'object' && 'hour' in timeObj && 'minute' in timeObj) {
    const hour = timeObj.hour.toString().padStart(2, '0');
    const minute = timeObj.minute.toString().padStart(2, '0');
    return `${hour}:${minute}`;
  }

  // Fallback for other formats
  if (timeObj && timeObj.toString) {
    return timeObj.toString();
  }

  return "00:00";
}

async function getDevicesStats(): Promise<Device[]> {
  try {
    const result = await client.query(`
      select Device {
        id,
        name,
        votes: {
          id,
          value,
          created_at,
          device: { id, name }
        }
      };
    `);

    return (result as Device[]) || [];
  } catch (error) {
    console.error("Failed to fetch devices:", error);
    return [];
  }
}

async function getMealPeriods(): Promise<MealPeriod[]> {
  try {
    const result = await client.query(`
      select MealPeriod {
        id,
        name,
        start_time,
        end_time,
        is_active
      } filter .is_active = true
      order by .start_time;
    `);

    // Convert time objects to strings to ensure they're serializable
    return (result as any[]).map(meal => ({
      ...meal,
      start_time: toHHMM(meal.start_time),
      end_time: toHHMM(meal.end_time),
    })) || [];
  } catch (error) {
    console.error("Failed to fetch meal periods:", error);
    return [];
  }
}

function getMealPeriodForVote(
  vote: Vote,
  mealPeriods: MealPeriod[]
): MealPeriod | null {
  // Extract UTC time for comparison
  const voteDate = new Date(vote.created_at);
  const voteMinutes = voteDate.getUTCHours() * 60 + voteDate.getUTCMinutes();

  return (
    mealPeriods.find((meal) => {
      if (!meal.is_active) return false;

      const [startHour, startMin] = meal.start_time.split(':').map(Number);
      const [endHour, endMin] = meal.end_time.split(':').map(Number);

      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Handle normal time range (e.g., 08:00 to 12:00)
      if (startMinutes <= endMinutes) {
        return voteMinutes >= startMinutes && voteMinutes <= endMinutes;
      }
      // Handle midnight crossover (e.g., 22:00 to 02:00)
      else {
        return voteMinutes >= startMinutes || voteMinutes <= endMinutes;
      }
    }) || null
  );
}

function calculateMealStats(votes: Vote[], mealPeriods: MealPeriod[]) {
  const mealVotes: { [mealId: string]: Vote[] } = {};

  // Group votes by meal period
  votes.forEach((vote) => {
    const meal = getMealPeriodForVote(vote, mealPeriods);
    if (meal) {
      if (!mealVotes[meal.id]) {
        mealVotes[meal.id] = [];
      }
      mealVotes[meal.id].push(vote);
    }
  });

  // Calculate stats for each meal
  return mealPeriods.map((meal) => {
    const votesForMeal = mealVotes[meal.id] || [];
    const totalVotes = votesForMeal.length;
    const averageRating =
      totalVotes > 0
        ? votesForMeal.reduce((sum, vote) => sum + vote.value, 0) / totalVotes
        : 0;

    const distribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    votesForMeal.forEach((vote) => {
      distribution[vote.value]++;
    });

    return {
      mealName: meal.name,
      totalVotes,
      averageRating: Math.round(averageRating * 100) / 100,
      distribution,
    };
  });
}

// Disable caching for this page
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [devicesStats, mealPeriods] = await Promise.all([
    getDevicesStats(),
    getMealPeriods(),
  ]);

  const currentTime = new Date();
  const currentMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();

  const currentMeal = mealPeriods.find((meal) => {
    const [startHour, startMin] = meal.start_time.split(':').map(Number);
    const [endHour, endMin] = meal.end_time.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle normal time range
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }
    // Handle midnight crossover
    else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Customer Feedback Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <p className="text-muted-foreground">
                Monitor satisfaction by meal period
              </p>
              {currentMeal && (
                <Badge
                  variant="default"
                  className="bg-emerald-100 text-emerald-800"
                >
                  <Utensils className="w-3 h-3 mr-1" />
                  Currently: {currentMeal.name}
                </Badge>
              )}
            </div>
          </div>
          {/* <CreateDeviceForm /> */}
        </div>
      </div>

      {/* Add meal periods summary */}
      <ConfiguredMealPeriods 
        mealPeriods={mealPeriods} 
        currentMeal={currentMeal} 
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {devicesStats.map((device: Device) => {
          const totalVotes = device.votes.length;
          const averageVote =
            totalVotes > 0
              ? Math.round(
                (device.votes.reduce(
                  (sum: number, vote: Vote) => sum + vote.value,
                  0
                ) /
                  totalVotes) *
                100
              ) / 100
              : 0;

          const mealStats = calculateMealStats(device.votes, mealPeriods);

          return (
            <Link key={device.id} href={`/device/${device.id}`}>
              <MealStatsCard
                mealStats={mealStats}
                deviceName={device.name}
                deviceId={device.id}
                totalVotes={totalVotes}
                overallAverage={averageVote}
              />
            </Link>
          );
        })}
      </div>
      {devicesStats.length > 0 && mealPeriods.length > 0 && (
        <DailyVsAllTimeStats
          votes={devicesStats.flatMap(device => device.votes)}
          mealPeriods={mealPeriods}
        />
      )}
      {devicesStats.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No feedback yet
              </h3>
              <p className="text-muted-foreground">
                Start collecting feedback to see meal-based statistics here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {mealPeriods.length === 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No meal periods configured
              </h3>
              <p className="text-muted-foreground">
                Configure meal schedules to see detailed analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
