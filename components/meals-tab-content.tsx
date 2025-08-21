"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Vote, Utensils } from "lucide-react"
import { StarRating } from "@/components/star-rating"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MealsTabContentProps {
    mealPeriods: any[]
    mealStats: any[]
    votes: any[] // Add votes prop for dynamic filtering
}

// Function to calculate meal stats for a given time range
function calculateMealStatsForPeriod(votes: any[], mealPeriods: any[], days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredVotes = votes.filter(vote => new Date(vote.created_at) >= cutoffDate);
    
    const mealVotes: { [mealId: string]: any[] } = {};

    filteredVotes.forEach(vote => {
        // Extract UTC time for comparison
        const voteDate = new Date(vote.created_at);
        const voteMinutes = voteDate.getUTCHours() * 60 + voteDate.getUTCMinutes();

        const meal = mealPeriods.find(meal => {
            if (!meal.is_active) return false;
            
            const [startHour, startMin] = meal.start_time.split(':').map(Number);
            const [endHour, endMin] = meal.end_time.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            
            if (startMinutes <= endMinutes) {
                return voteMinutes >= startMinutes && voteMinutes <= endMinutes;
            } else {
                return voteMinutes >= startMinutes || voteMinutes <= endMinutes;
            }
        });

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
            id: meal.id,
            name: meal.name,
            timeRange: `${meal.start_time} - ${meal.end_time}`,
            totalVotes,
            averageRating: Math.round(averageRating * 100) / 100,
            distribution,
        };
    });
}

export function MealsTabContent({ mealPeriods, mealStats, votes = [] }: MealsTabContentProps) {
    const [isClient, setIsClient] = useState(false)
    const [timeRange, setTimeRange] = useState("all")

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Calculate filtered meal stats based on time range
    const filteredMealStats = useMemo(() => {
        if (timeRange === "all" || !votes.length) {
            return mealStats;
        }
        
        let days = 7;
        if (timeRange === "14d") days = 14;
        else if (timeRange === "30d") days = 30;
        else if (timeRange === "90d") days = 90;
        
        return calculateMealStatsForPeriod(votes, mealPeriods, days);
    }, [timeRange, votes, mealPeriods, mealStats]);

    if (!isClient) {
        return (
            <div className="space-y-6">
                {/* Loading state with time selector placeholder */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Meal Analysis</h3>
                        <p className="text-sm text-muted-foreground">
                            Loading meal period data...
                        </p>
                    </div>
                    <div className="w-[160px] h-10 bg-muted rounded animate-pulse" />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="relative">
                            <CardHeader className="pb-3">
                                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="h-32 bg-muted rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    if (mealPeriods.length === 0) {
        return (
            <div className="space-y-6">
                {/* Time selector even when no meal periods */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Meal Analysis</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure meal periods to see analysis ({timeRange})
                        </p>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-[160px] bg-background border border-border">
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
                </div>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <Utensils className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                Aucune période de repas configurée
                            </h3>
                            <p className="text-muted-foreground">
                                Les analyses par repas seront disponibles une fois les
                                périodes configurées.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Time range selector */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold">Meal Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                        Breakdown by meal period for the selected time range ({timeRange})
                    </p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px] bg-background border border-border">
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
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMealStats.map((meal, index) => (
                <Card key={meal.id || `meal-${index}`} className="relative">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center">
                                <Utensils className="w-5 h-5 mr-2 text-muted-foreground" />
                                {meal.name}
                            </CardTitle>
                            <Badge variant="secondary">
                                <Vote className="w-3 h-3 mr-1" />
                                {meal.totalVotes}
                            </Badge>
                        </div>
                        <CardDescription>{meal.timeRange}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {meal.totalVotes > 0 ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-2xl font-bold">
                                                {meal.averageRating}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                / 5
                                            </span>
                                        </div>
                                        <StarRating rating={meal.averageRating} size="sm" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Répartition
                                    </p>
                                    {[5, 4, 3, 2, 1].map((rating) => {
                                        const count = meal.distribution[rating];
                                        const percentage =
                                            meal.totalVotes > 0
                                                ? (count / meal.totalVotes) * 100
                                                : 0;

                                        return (
                                            <div
                                                key={`meal-${meal.id || 'unknown'}-rating-${rating}`}
                                                className="flex items-center gap-2 text-xs"
                                            >
                                                <span className="w-4">{rating}★</span>
                                                <Progress
                                                    value={percentage}
                                                    className="h-1 flex-grow"
                                                />
                                                <span className="w-8 text-muted-foreground">
                                                    {count}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <Utensils className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Aucun avis pour ce repas
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
            </div>
        </div>
    )
}