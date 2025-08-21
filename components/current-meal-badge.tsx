'use client';

import { Badge } from "@/components/ui/badge";
import { Utensils } from "lucide-react";
import { useState, useEffect } from 'react';

interface CurrentMealBadgeProps {
    mealPeriods: Array<{
        id: string;
        name: string;
        start_time: string;
        end_time: string;
        is_active: boolean;
    }>;
}

export function CurrentMealBadge({ mealPeriods }: CurrentMealBadgeProps) {
    const [currentMeal, setCurrentMeal] = useState<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const updateCurrentMeal = () => {
            const now = new Date();
            const utcHours = now.getUTCHours().toString().padStart(2, '0');
            const utcMinutes = now.getUTCMinutes().toString().padStart(2, '0');
            const currentTime = `${utcHours}:${utcMinutes}`;
            const meal = mealPeriods.find((meal) => {
                return currentTime >= meal.start_time && currentTime <= meal.end_time;
            });
            setCurrentMeal(meal || null);
        };

        updateCurrentMeal();

        // Update every minute
        const interval = setInterval(updateCurrentMeal, 60000);

        return () => clearInterval(interval);
    }, [mealPeriods]);

    if (!mounted || !currentMeal) {
        return null;
    }

    return (
        <Badge
            variant="default"
            className="bg-emerald-100 text-emerald-800"
        >
            <Utensils className="w-3 h-3 mr-1" />
            En cours: {currentMeal.name}
        </Badge>
    );
}