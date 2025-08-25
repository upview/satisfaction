"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/star-rating"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TrendingUp, TrendingDown, Minus, Clock, CalendarDays, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { DateRange } from "react-day-picker"

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

type Vote = {
    id: string
    value: number
    created_at: string
}

type MealPeriod = {
    id: string
    name: string
    start_time: string
    end_time: string
    is_active: boolean
}

type DailyVsAllTimeProps = {
    votes: Vote[]
    mealPeriods: MealPeriod[]
}

function getMealPeriodForVote(vote: Vote, mealPeriods: MealPeriod[]): MealPeriod | null {
    try {
        // Extract UTC time for comparison
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
    } catch (error) {
        console.error('Error getting meal period for vote:', error);
        return null;
    }
}

function getVotesForDateRange(votes: Vote[], dateRange: DateRange | undefined): Vote[] {
    try {
        if (!dateRange?.from) {
            return [];
        }

        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
        endDate.setHours(23, 59, 59, 999);

        return votes.filter(vote => {
            try {
                const voteDate = new Date(vote.created_at);
                return voteDate >= startDate && voteDate <= endDate;
            } catch (error) {
                console.error('Error parsing vote date:', error);
                return false;
            }
        });
    } catch (error) {
        console.error('Error getting votes for date range:', error);
        return [];
    }
}

function calculateMealComparison(
    votes: Vote[], 
    mealPeriods: MealPeriod[], 
    primaryRange: DateRange | undefined, 
    comparisonRange: DateRange | undefined
) {
    try {
        const primaryVotes = getVotesForDateRange(votes, primaryRange);
        const comparisonVotes = getVotesForDateRange(votes, comparisonRange);

        return mealPeriods.map(meal => {
            try {
                // Primary period stats for this meal
                const primaryVotesForMeal = primaryVotes.filter(vote => {
                    const voteMeal = getMealPeriodForVote(vote, mealPeriods);
                    return voteMeal?.id === meal.id;
                });

                // Comparison period stats for this meal
                const comparisonVotesForMeal = comparisonVotes.filter(vote => {
                    const voteMeal = getMealPeriodForVote(vote, mealPeriods);
                    return voteMeal?.id === meal.id;
                });

                const primaryAverage = primaryVotesForMeal.length > 0
                    ? primaryVotesForMeal.reduce((sum, vote) => sum + vote.value, 0) / primaryVotesForMeal.length
                    : 0;

                const comparisonAverage = comparisonVotesForMeal.length > 0
                    ? comparisonVotesForMeal.reduce((sum, vote) => sum + vote.value, 0) / comparisonVotesForMeal.length
                    : 0;

                const difference = primaryAverage - comparisonAverage;
                const percentageChange = comparisonAverage > 0 ? ((difference / comparisonAverage) * 100) : 0;

                return {
                    meal,
                    primary: {
                        average: Math.round(primaryAverage * 100) / 100,
                        count: primaryVotesForMeal.length
                    },
                    comparison: {
                        average: Math.round(comparisonAverage * 100) / 100,
                        count: comparisonVotesForMeal.length
                    },
                    difference: Math.round(difference * 100) / 100,
                    percentageChange: Math.round(percentageChange * 10) / 10,
                    trend: difference > 0.1 ? 'up' : difference < -0.1 ? 'down' : 'stable'
                };
            } catch (error) {
                console.error('Error calculating meal comparison:', error);
                return {
                    meal,
                    primary: { average: 0, count: 0 },
                    comparison: { average: 0, count: 0 },
                    difference: 0,
                    percentageChange: 0,
                    trend: 'stable' as const
                };
            }
        });
    } catch (error) {
        console.error('Error in calculateMealComparison:', error);
        return [];
    }
}

export function DailyVsAllTimeStats({ votes, mealPeriods }: DailyVsAllTimeProps) {
    const [isMounted, setIsMounted] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)
    const [primaryRange, setPrimaryRange] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: new Date()
    })
    const [comparisonRange, setComparisonRange] = React.useState<DateRange | undefined>(undefined)
    const [isComparisonInitialized, setIsComparisonInitialized] = React.useState(false)
    const isMountedRef = React.useRef(false)

    // Track mount state and initialize comparison period to all time
    React.useEffect(() => {
        isMountedRef.current = true
        setIsMounted(true)

        // Initialize comparison period to all time if votes are available
        if (votes?.length > 0 && !isComparisonInitialized) {
            const oldestVote = votes.reduce((oldest, vote) => {
                const voteDate = new Date(vote.created_at);
                const oldestDate = new Date(oldest.created_at);
                return voteDate < oldestDate ? vote : oldest;
            });
            const newestVote = votes.reduce((newest, vote) => {
                const voteDate = new Date(vote.created_at);
                const newestDate = new Date(newest.created_at);
                return voteDate > newestDate ? vote : newest;
            });
            setComparisonRange({
                from: new Date(oldestVote.created_at),
                to: new Date(newestVote.created_at)
            });
            setIsComparisonInitialized(true);
        }

        const timer = setTimeout(() => {
            if (isMountedRef.current) {
                setIsLoading(false)
            }
        }, 50)

        return () => {
            isMountedRef.current = false
            setIsMounted(false)
            clearTimeout(timer)
        }
    }, [votes, isComparisonInitialized])

    // Memoize comparisons to prevent unnecessary recalculations
    const comparisons = React.useMemo(() => {
        if (!isMounted || !votes?.length || !mealPeriods?.length) return []
        return calculateMealComparison(votes, mealPeriods, primaryRange, comparisonRange)
    }, [votes, mealPeriods, primaryRange, comparisonRange, isMounted])

    // Helper function to format date range
    const formatDateRange = React.useCallback((dateRange: DateRange | undefined) => {
        if (!dateRange?.from) return 'Aucune période sélectionnée';
        
        if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
            return format(dateRange.from, 'dd MMM yyyy', { locale: fr });
        }
        
        return `${format(dateRange.from, 'dd MMM yyyy', { locale: fr })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: fr })}`;
    }, []);

    // Reset function - compare today to all time
    const handleReset = React.useCallback(() => {
        setPrimaryRange({ from: new Date(), to: new Date() });
        // Set comparison range to cover all available votes
        if (votes?.length > 0) {
            const oldestVote = votes.reduce((oldest, vote) => {
                const voteDate = new Date(vote.created_at);
                const oldestDate = new Date(oldest.created_at);
                return voteDate < oldestDate ? vote : oldest;
            });
            const newestVote = votes.reduce((newest, vote) => {
                const voteDate = new Date(vote.created_at);
                const newestDate = new Date(newest.created_at);
                return voteDate > newestDate ? vote : newest;
            });
            setComparisonRange({
                from: new Date(oldestVote.created_at),
                to: new Date(newestVote.created_at)
            });
        } else {
            setComparisonRange(undefined);
        }
    }, [votes]);

    // DateRangePicker component
    const DateRangePicker = React.useCallback(({ 
        dateRange, 
        setDateRange, 
        placeholder 
    }: { 
        dateRange: DateRange | undefined, 
        setDateRange: (range: DateRange | undefined) => void, 
        placeholder: string 
    }) => (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`w-[280px] justify-start text-left font-normal ${
                        !dateRange ? "text-muted-foreground" : ""
                    }`}
                >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDateRange(dateRange) || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={fr}
                    className="rdp-french-calendar"
                    classNames={{
                        head_cell: "text-center font-normal text-[0.8rem] w-9",
                        cell: "text-center p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
                    }}
                />
            </PopoverContent>
        </Popover>
    ), [formatDateRange]);

    // Don't render if meal periods are not available
    if (!mealPeriods?.length) {
        return null
    }

    // Loading state
    if (!isMounted || isLoading) {
        return (
            <Card className="mb-6">
                <CardHeader>
                    <div className="space-y-2">
                        <div className="h-6 bg-muted rounded animate-pulse" />
                        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: Math.min(mealPeriods.length, 3) }).map((_, i) => (
                            <div key={i} className="p-4 border rounded-lg space-y-3">
                                <div className="h-4 bg-muted rounded animate-pulse" />
                                <div className="h-8 bg-muted rounded animate-pulse" />
                                <div className="h-8 bg-muted rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mb-6">
            <CardHeader>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center">
                                <CalendarDays className="w-5 h-5 mr-2" />
                                Comparaison de périodes
                            </CardTitle>
                            <CardDescription>
                                Comparez les performances entre deux périodes personnalisées
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={!primaryRange?.from && !comparisonRange?.from}
                        >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reset
                        </Button>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-blue-600 mb-3">
                                Période principale
                            </label>
                            <DateRangePicker
                                dateRange={primaryRange}
                                setDateRange={setPrimaryRange}
                                placeholder="Sélectionner la période principale"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-3">
                                Période de comparaison
                            </label>
                            <DateRangePicker
                                dateRange={comparisonRange}
                                setDateRange={setComparisonRange}
                                placeholder="Sélectionner la période de comparaison"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {comparisons.map(({ meal, primary, comparison, difference, percentageChange, trend }) => (
                        <div key={meal.id} className="p-4 border rounded-lg space-y-3">
                            {/* Meal Header */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{meal.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {convertUTCTimeToLocal(meal.start_time)} - {convertUTCTimeToLocal(meal.end_time)}
                                    </p>
                                </div>
                                {primary.count > 0 && comparison.count > 0 && (
                                    <Badge variant={
                                        trend === 'up' ? 'default' :
                                            trend === 'down' ? 'destructive' :
                                                'secondary'
                                    }>
                                        {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                                        {trend === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                                        {trend === 'stable' && <Minus className="w-3 h-3 mr-1" />}
                                        {difference > 0 ? '+' : ''}{difference}
                                    </Badge>
                                )}
                            </div>

                            {/* Primary Period Stats */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-600">Période principale</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{primary.count} avis</span>
                                </div>

                                {primary.count > 0 ? (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xl font-bold text-blue-600">{primary.average}</span>
                                        <span className="text-sm text-muted-foreground">/ 5</span>
                                        <StarRating rating={primary.average} size="lg" />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun avis pour la période principale</p>
                                )}
                            </div>

                            {/* Comparison Period Stats */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CalendarDays className="w-4 h-4 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-600">Période de comparaison</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{comparison.count} avis</span>
                                </div>

                                {comparison.count > 0 ? (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xl font-bold text-gray-600">{comparison.average}</span>
                                        <span className="text-sm text-muted-foreground">/ 5</span>
                                        <StarRating rating={comparison.average} size="lg" />
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Aucun avis pour la période de comparaison</p>
                                )}
                            </div>

                            {/* Performance Indicator */}
                            {primary.count > 0 && comparison.count > 0 && (
                                <div className="pt-2 border-t">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Évolution</span>
                                        <span className={`font-medium ${trend === 'up' ? 'text-green-600' :
                                            trend === 'down' ? 'text-red-600' :
                                                'text-gray-600'
                                            }`}>
                                            {percentageChange > 0 ? '+' : ''}{percentageChange}%
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Overall Comparison Summary */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium">Résumé de la comparaison</h4>
                            <p className="text-sm text-muted-foreground">
                                {comparisons.reduce((sum, c) => sum + c.primary.count, 0)} avis (période principale) vs{' '}
                                {comparisons.reduce((sum, c) => sum + c.comparison.count, 0)} avis (période de comparaison)
                            </p>
                        </div>
                        <div className="text-right">
                            {(() => {
                                const improvingMeals = comparisons.filter(c => c.trend === 'up').length;
                                const decliningMeals = comparisons.filter(c => c.trend === 'down').length;

                                return (
                                    <div className="space-y-1">
                                        {improvingMeals > 0 && (
                                            <div className="flex items-center text-sm text-green-600">
                                                <TrendingUp className="w-4 h-4 mr-1" />
                                                {improvingMeals} repas en amélioration
                                            </div>
                                        )}
                                        {decliningMeals > 0 && (
                                            <div className="flex items-center text-sm text-red-600">
                                                <TrendingDown className="w-4 h-4 mr-1" />
                                                {decliningMeals} repas en baisse
                                            </div>
                                        )}
                                        {improvingMeals === 0 && decliningMeals === 0 && (
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Minus className="w-4 h-4 mr-1" />
                                                Performance stable
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}