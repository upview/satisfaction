"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Vote, Utensils } from "lucide-react"
import { StarRating } from "@/components/star-rating"
import { DynamicTimeAgo } from "@/components/dynamic-time-ago"

interface HistoryTabContentProps {
    votes: any[]
    mealPeriods: any[]
}

export function HistoryTabContent({ votes, mealPeriods }: HistoryTabContentProps) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const getMealPeriodForVote = (vote: any, mealPeriods: any[]) => {
        // Extract UTC time as HH:MM format for comparison
        const voteDate = new Date(vote.created_at);
        const utcHours = voteDate.getUTCHours().toString().padStart(2, '0');
        const utcMinutes = voteDate.getUTCMinutes().toString().padStart(2, '0');
        const voteTime = `${utcHours}:${utcMinutes}`;
        return mealPeriods.find((meal) => {
            return (
                voteTime >= meal.start_time &&
                voteTime <= meal.end_time &&
                meal.is_active
            );
        }) || null;
    };

    if (!isClient) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Historique complet des votes</CardTitle>
                    <CardDescription>
                        Tous les avis reçus par cet appareil
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-4">
                                    <div className="w-20 h-6 bg-muted rounded animate-pulse" />
                                    <div className="space-y-2">
                                        <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                                        <div className="w-24 h-3 bg-muted rounded animate-pulse" />
                                    </div>
                                </div>
                                <div className="w-16 h-4 bg-muted rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    const sortedVotes = votes.sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historique complet des votes</CardTitle>
                <CardDescription>
                    Tous les avis reçus par cet appareil
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {sortedVotes.map((vote) => {
                        const voteMeal = getMealPeriodForVote(vote, mealPeriods);
                        return (
                            <div
                                key={vote.id}
                                className="flex items-center justify-between p-4 border rounded-lg"
                            >
                                <div className="flex items-center space-x-4">
                                    <StarRating rating={vote.value} size="md" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            <DynamicTimeAgo dateString={vote.created_at} />
                                        </p>
                                        {voteMeal && (
                                            <div className="flex items-center space-x-1 mt-1">
                                                <Utensils className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">
                                                    {voteMeal.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(vote.created_at).toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {votes.length === 0 && (
                    <div className="text-center py-8">
                        <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                            Aucun vote enregistré
                        </h3>
                        <p className="text-muted-foreground">
                            Cet appareil n'a pas encore reçu de votes.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}