import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, TrendingUp, Vote, Utensils, Settings, Plus } from "lucide-react"
import { CreateDeviceForm } from "@/components/create-device-form"
import { StarRating } from "@/components/star-rating"
import { MealStatsCard } from "@/components/meal-stats-card"

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

const client = createClient({
    instanceName: process.env.GEL_INSTANCE,
    branch: process.env.GEL_BRANCH,
    secretKey: process.env.GEL_SECRET_KEY,
})

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
    `)

        return (result as Device[]) || []
    } catch (error) {
        console.error('Failed to fetch devices:', error)
        return []
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

function getMealPeriodForVote(vote: Vote, mealPeriods: MealPeriod[]): MealPeriod | null {
    const voteDate = new Date(vote.created_at);
    const voteMinutes = voteDate.getUTCHours() * 60 + voteDate.getUTCMinutes();

    return mealPeriods.find(meal => {
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
    }) || null;
}

function calculateMealStats(votes: Vote[], mealPeriods: MealPeriod[]) {
    const mealVotes: { [mealId: string]: Vote[] } = {};

    votes.forEach(vote => {
        const meal = getMealPeriodForVote(vote, mealPeriods);
        if (meal) {
            if (!mealVotes[meal.id]) {
                mealVotes[meal.id] = [];
            }
            mealVotes[meal.id].push(vote);
        }
    });

    return mealPeriods.map(meal => {
        const votesForMeal = mealVotes[meal.id] || [];
        const totalVotes = votesForMeal.length;
        const averageRating = totalVotes > 0
            ? votesForMeal.reduce((sum, vote) => sum + vote.value, 0) / totalVotes
            : 0;

        const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        votesForMeal.forEach(vote => {
            distribution[vote.value]++;
        });

        return {
            mealName: meal.name,
            totalVotes,
            averageRating: Math.round(averageRating * 100) / 100,
            distribution
        };
    });
}

// Disable caching for this page
export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const [devicesStats, mealPeriods] = await Promise.all([
        getDevicesStats(),
        getMealPeriods()
    ])

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

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <Settings className="w-6 h-6 text-orange-600" />
                            <h1 className="text-3xl font-bold">Administration - Tableau de bord</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <p className="text-muted-foreground">Gestion des appareils et configuration des repas</p>
                            {currentMeal && (
                                <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                                    <Utensils className="w-3 h-3 mr-1" />
                                    Actuellement: {currentMeal.name}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <Link href="/admin/meal-periods">
                            <Button variant="outline">
                                <Utensils className="w-4 h-4 mr-2" />
                                Gérer les repas
                            </Button>
                        </Link>
                        <CreateDeviceForm />
                    </div>
                </div>
            </div>

            {/* Admin Actions Bar */}
            <Card className="mb-6 border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-orange-600" />
                        Actions d'administration
                    </CardTitle>
                    <CardDescription>Raccourcis vers les fonctions de gestion</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/admin/meal-periods">
                            <Button variant="outline" size="sm">
                                <Utensils className="w-4 h-4 mr-2" />
                                Configuration des repas
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" size="sm">
                                <Vote className="w-4 h-4 mr-2" />
                                Vue publique
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Meal periods summary with admin controls */}
            {mealPeriods.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Périodes de repas configurées</CardTitle>
                                <CardDescription>Horaires actifs pour l'analyse des avis</CardDescription>
                            </div>
                            <Link href="/admin/meal-periods">
                                <Button variant="outline" size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Modifier
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4">
                            {mealPeriods.map((meal) => (
                                <div
                                    key={meal.id}
                                    className={`p-3 rounded-lg border ${currentMeal?.id === meal.id
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-muted/50'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Utensils className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{meal.name}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {meal.start_time} - {meal.end_time}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {devicesStats.map((device: Device) => {
                    const totalVotes = device.votes.length;
                    const averageVote = totalVotes > 0
                        ? Math.round((device.votes.reduce((sum: number, vote: Vote) => sum + vote.value, 0) / totalVotes) * 100) / 100
                        : 0;

                    const mealStats = calculateMealStats(device.votes, mealPeriods);

                    return (
                        <Link key={device.id} href={`/admin/device/${device.id}`}>
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

            {devicesStats.length === 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Aucun appareil configuré</h3>
                            <p className="text-muted-foreground mb-4">Créez votre premier appareil pour commencer à collecter des avis.</p>
                            <CreateDeviceForm />
                        </div>
                    </CardContent>
                </Card>
            )}

            {mealPeriods.length === 0 && (
                <Card className="mt-6 border-amber-200 bg-amber-50/50">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <Utensils className="w-12 h-12 mx-auto text-amber-600 mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Configuration requise</h3>
                            <p className="text-muted-foreground mb-4">Configurez les horaires des repas pour activer l'analyse par repas.</p>
                            <Link href="/admin/meal-periods">
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Configurer les repas
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}