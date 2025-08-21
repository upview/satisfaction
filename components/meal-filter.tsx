"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

type MealPeriod = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type MealFilterProps = {
  mealPeriods: MealPeriod[];
  selectedMeal: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onMealChange: (mealId: string) => void;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  onReset: () => void;
};

export function MealFilter({
  mealPeriods,
  selectedMeal,
  dateFrom,
  dateTo,
  onMealChange,
  onDateFromChange,
  onDateToChange,
  onReset,
}: MealFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filtres:</span>
      </div>

      {/* Meal Period Selector */}
      <Select value={selectedMeal} onValueChange={onMealChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les repas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les repas</SelectItem>
          {mealPeriods.map((meal) => (
            <SelectItem key={meal.id} value={meal.id}>
              {meal.name} ({convertUTCTimeToLocal(meal.start_time)} - {convertUTCTimeToLocal(meal.end_time)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[140px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom
              ? format(dateFrom, "dd/MM/yyyy", { locale: fr })
              : "Date début"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={onDateFromChange}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[140px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: fr }) : "Date fin"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={onDateToChange}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>

      {/* Reset Button */}
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Réinitialiser
      </Button>
    </div>
  );
}
