import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Calendar, Star, TrendingUp, Vote, Utensils, BarChart3, Settings, Clock } from "lucide-react"
import { CopyButton } from "@/components/copy-button"
import { StarRating } from "@/components/star-rating"
import { DevicePageClient } from "@/components/device-page-client"
import { DynamicTimeAgo } from "@/components/dynamic-time-ago"
import { ChartRatings } from "@/components/chart-ratings"
import { MealEvolutionChart } from "@/components/meal-evolution-chart"
import { DailyVsAllTimeStats } from "@/components/daily-vs-alltime-stats"
import { MealsTabContent } from "@/components/meals-tab-content"
import { getMealPeriodForVote, calculateMealStats, getDailyMealEvolution } from "@/lib/meal-analytics"

interface DevicePageProps {
  params: Promise<{
    deviceId: string
  }>
}

import { createClient } from 'gel'

type Device = {
  id: string
  name: string
  votes: Vote[]
}

type Vote = {
  id: string
  value: number
  created_at: string
  device: Device
}

type MealPeriod = {
  id: string;
  name: string;
  start_time: string; // Now always a string
  end_time: string;   // Now always a string
  is_active: boolean;
}

const client = createClient()

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

async function getDeviceStats(deviceId: string): Promise<Device | null> {
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
      } filter .id = <uuid>$deviceId;
    `, { deviceId })

    return (result as Device[])[0] || null
  } catch (error) {
    console.error('Failed to fetch device:', error)
    return null
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
    `)

    // Convert time objects to strings to ensure they're serializable
    return (result as any[]).map(meal => ({
      ...meal,
      start_time: toHHMM(meal.start_time),
      end_time: toHHMM(meal.end_time),
    })) || []
  } catch (error) {
    console.error('Failed to fetch meal periods:', error)
    return []
  }
}


// Disable caching for this page
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function DevicePage({ params }: DevicePageProps) {
  const { deviceId } = await params
  const [stats, mealPeriods] = await Promise.all([
    getDeviceStats(deviceId),
    getMealPeriods()
  ])

  if (!stats) {
    notFound()
  }

  const mealStats = calculateMealStats(stats.votes, mealPeriods);
  const evolutionData = getDailyMealEvolution(stats.votes, mealPeriods);

  // Updated current meal detection using proper time comparison
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

  const totalVotes = stats.votes.length;
  const averageRating = totalVotes > 0
    ? stats.votes.reduce((sum: number, vote: Vote) => sum + vote.value, 0) / totalVotes
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <DevicePageClient pollingInterval={8000}>
        <div className="container mx-auto p-6">
          {/* Header Section */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="mb-6 hover:bg-white/50 dark:hover:bg-slate-800/50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {stats.name}
                  </h1>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-1.5">
                      <p className="text-sm text-muted-foreground">ID: {stats.id.slice(0, 8)}...</p>
                      <CopyButton textToCopy={stats.id} />
                    </div>
                    {currentMeal && (
                      <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        <Utensils className="w-3 h-3 mr-1" />
                        Currently: {currentMeal.name}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Vote className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalVotes}</p>
                        <p className="text-xs text-muted-foreground">Total Reviews</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Average Rating</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 
                <Link href={`/admin/device/${stats.id}`}>
                  <Button variant="outline" className="bg-white/50 hover:bg-white/80 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 backdrop-blur-sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Administration
                  </Button>
                </Link> */}
              </div>
            </div>
          </div>

          {/* Enhanced Tabs */}
          <Tabs defaultValue="overview" className="space-y-8">
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-2 border border-white/20">
              <TabsList className="grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="meals"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  By Meal
                </TabsTrigger>
                <TabsTrigger
                  value="evolution"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Evolution
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-8 mt-8">
              <div className="grid gap-8">
                {/* Rating Chart */}
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
                  <ChartRatings votes={stats.votes} />
                </div>

                {mealPeriods.length > 0 && (
                  <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
                    <DailyVsAllTimeStats
                      votes={stats.votes}
                      mealPeriods={mealPeriods}
                    />
                  </div>
                )}

                {/* Enhanced Overall Summary */}
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 shadow-lg">
                  <div className="absolute top-6 right-6 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800">
                    <StarRating rating={averageRating} size="md" />
                    <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                      {averageRating.toFixed(1)} out of 5
                    </span>
                  </div>
                  <CardHeader className="pb-8">
                    <CardTitle className="text-2xl">Customer Reviews</CardTitle>
                    <CardDescription className="text-base">
                      Based on {totalVotes} customer evaluation{totalVotes !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const count = stats.votes.filter(vote => vote.value === rating).length
                      const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0

                      return (
                        <div key={rating} className="flex items-center gap-4">
                          <div className="flex shrink-0 gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4"
                                fill={i < rating ? "#f59e0b" : "none"}
                                color={i < rating ? "#f59e0b" : "#d1d5db"}
                                strokeWidth={2}
                              />
                            ))}
                          </div>
                          <Progress
                            value={percentage}
                            className="h-3 flex-grow bg-slate-100 dark:bg-slate-700"
                          />
                          <div className="flex items-center gap-2 min-w-[80px] justify-end">
                            <span className="font-medium">
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="text-muted-foreground text-sm">
                              ({count})
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Enhanced Meals Tab */}
            <TabsContent value="meals" className="space-y-8 mt-8">
              <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                <MealsTabContent
                  mealPeriods={mealPeriods}
                  mealStats={mealStats}
                  votes={stats.votes}
                />
              </div>
            </TabsContent>

            {/* Evolution Tab */}
            <TabsContent value="evolution" className="space-y-8 mt-8">
              {mealPeriods.length > 0 && evolutionData.length > 0 ? (
                <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg overflow-hidden">
                  <MealEvolutionChart data={evolutionData} mealNames={mealPeriods.map(m => m.name)} />
                </div>
              ) : (
                <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 shadow-lg">
                  <CardContent className="pt-12 pb-12">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Evolution data unavailable</h3>
                      <p className="text-muted-foreground">
                        {mealPeriods.length === 0
                          ? "Configure meal periods to see evolution trends."
                          : "Not enough data to display evolution trends."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Enhanced History Tab */}
            <TabsContent value="history" className="space-y-8 mt-8">
              <Card className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Complete Vote History</CardTitle>
                  <CardDescription className="text-base">All reviews received by this device</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.votes.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {stats.votes
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((vote: Vote) => {
                          const voteMeal = getMealPeriodForVote(vote, mealPeriods);
                          return (
                            <div key={vote.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              <div className="flex items-center space-x-4">
                                <StarRating rating={vote.value} size="md" />
                                <div>
                                  <p className="font-medium">
                                    <DynamicTimeAgo dateString={vote.created_at} />
                                  </p>
                                  {voteMeal && (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Utensils className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">{voteMeal.name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {new Date(vote.created_at).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(vote.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Vote className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No votes recorded</h3>
                      <p className="text-muted-foreground">This device hasn't received any votes yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DevicePageClient>
    </div>
  )
}
