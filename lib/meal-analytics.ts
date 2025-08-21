export type MealPeriod = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export type Vote = {
  id: string;
  value: number;
  created_at: string;
};

export type MealStats = {
  mealName: string;
  totalVotes: number;
  averageRating: number;
  distribution: { [key: number]: number };
};

export function getMealPeriodForVote(
  vote: Vote,
  mealPeriods: MealPeriod[]
): MealPeriod | null {
  // Extract UTC time as HH:MM format for comparison
  const voteDate = new Date(vote.created_at);
  const utcHours = voteDate.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = voteDate.getUTCMinutes().toString().padStart(2, '0');
  const voteTime = `${utcHours}:${utcMinutes}`;

  return (
    mealPeriods.find((meal) => {
      return (
        voteTime >= meal.start_time &&
        voteTime <= meal.end_time &&
        meal.is_active
      );
    }) || null
  );
}

export function calculateMealStats(
  votes: Vote[],
  mealPeriods: MealPeriod[]
): MealStats[] {
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

export function getDailyMealEvolution(
  votes: Vote[],
  mealPeriods: MealPeriod[],
  days: number = 30
) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const dailyStats: { [date: string]: { [mealId: string]: Vote[] } } = {};

  // Group votes by date and meal
  votes.forEach((vote) => {
    const voteDate = new Date(vote.created_at);
    if (voteDate >= startDate && voteDate <= endDate) {
      const dateKey = voteDate.toISOString().split("T")[0];
      const meal = getMealPeriodForVote(vote, mealPeriods);

      if (meal) {
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {};
        }
        if (!dailyStats[dateKey][meal.id]) {
          dailyStats[dateKey][meal.id] = [];
        }
        dailyStats[dateKey][meal.id].push(vote);
      }
    }
  });

  // Calculate daily averages
  const result: { date: string; [mealName: string]: number | string | undefined }[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split("T")[0];
    const dayData: { date: string; [mealName: string]: number | string | undefined } = {
      date: dateKey,
    };

    mealPeriods.forEach((meal) => {
      const votesForDay = dailyStats[dateKey]?.[meal.id] || [];
      const count = votesForDay.length;
      const average = count > 0
        ? votesForDay.reduce((sum, vote) => sum + vote.value, 0) / count
        : undefined; // Use undefined instead of null for Recharts compatibility
      
      // Only add data points when there are votes (Recharts handles missing data better)
      if (count > 0) {
        dayData[meal.name] = Math.round(average! * 100) / 100;
      }
      dayData[`${meal.name}_count`] = count; // Add vote count for evolution chart
    });

    result.push(dayData);
  }

  return result;
}
