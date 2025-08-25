// Test script to verify timezone fix
const votes = [
  { created_at: "2024-01-15T08:00:00Z", value: 4 }, // 08:00 UTC should match Breakfast (07:00-10:30)
  { created_at: "2024-01-15T13:00:00Z", value: 3 }, // 13:00 UTC should match Lunch (11:30-14:30)
  { created_at: "2024-01-15T20:00:00Z", value: 5 }, // 20:00 UTC should match Dinner (18:00-21:30)
];

const mealPeriods = [
  { name: "Breakfast", start_time: "07:00", end_time: "10:30" },
  { name: "Lunch", start_time: "11:30", end_time: "14:30" },
  { name: "Dinner", start_time: "18:00", end_time: "21:30" },
];

// OLD (BROKEN) method using toTimeString()
function getMealPeriodForVoteOLD(vote, mealPeriods) {
  const voteTime = new Date(vote.created_at).toTimeString().slice(0, 5);
  console.log(`OLD: Vote ${vote.created_at} -> Local time: ${voteTime}`);
  
  const meal = mealPeriods.find((meal) => {
    return voteTime >= meal.start_time && voteTime <= meal.end_time;
  });
  
  return meal ? meal.name : 'No meal period';
}

// NEW (FIXED) method using UTC time
function getMealPeriodForVoteNEW(vote, mealPeriods) {
  const voteDate = new Date(vote.created_at);
  const utcHours = voteDate.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = voteDate.getUTCMinutes().toString().padStart(2, '0');
  const voteTime = `${utcHours}:${utcMinutes}`;
  console.log(`NEW: Vote ${vote.created_at} -> UTC time: ${voteTime}`);
  
  const meal = mealPeriods.find((meal) => {
    return voteTime >= meal.start_time && voteTime <= meal.end_time;
  });
  
  return meal ? meal.name : 'No meal period';
}

console.log("=== TIMEZONE FIX TEST ===");
console.log("Current local timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("");

votes.forEach((vote, index) => {
  console.log(`--- Vote ${index + 1}: ${vote.created_at} (${vote.value} stars) ---`);
  const oldResult = getMealPeriodForVoteOLD(vote, mealPeriods);
  const newResult = getMealPeriodForVoteNEW(vote, mealPeriods);
  
  console.log(`OLD method result: ${oldResult}`);
  console.log(`NEW method result: ${newResult}`);
  console.log(`Fixed: ${oldResult !== newResult ? 'YES' : 'NO'}`);
  console.log("");
});