// Test script to demonstrate timezone issue with different scenarios
const votes = [
  { created_at: "2024-01-15T08:00:00Z", value: 4, desc: "8:00 UTC (Winter)" },
  { created_at: "2024-07-15T08:00:00Z", value: 3, desc: "8:00 UTC (Summer)" },
  { created_at: "2024-01-15T19:00:00Z", value: 5, desc: "19:00 UTC (Winter)" },
  { created_at: "2024-07-15T19:00:00Z", value: 2, desc: "19:00 UTC (Summer)" },
];

const mealPeriods = [
  { name: "Breakfast", start_time: "07:00", end_time: "10:30" },
  { name: "Lunch", start_time: "11:30", end_time: "14:30" },
  { name: "Dinner", start_time: "18:00", end_time: "21:30" },
];

// Simulate different timezones by setting TZ environment variable
function testInTimezone(timezone, votes, mealPeriods) {
  // Save original TZ
  const originalTZ = process.env.TZ;
  process.env.TZ = timezone;
  
  console.log(`\n=== TESTING IN TIMEZONE: ${timezone} ===`);
  
  votes.forEach((vote, index) => {
    console.log(`\n--- ${vote.desc} ---`);
    
    // OLD method
    const voteTimeOld = new Date(vote.created_at).toTimeString().slice(0, 5);
    const mealOld = mealPeriods.find((meal) => {
      return voteTimeOld >= meal.start_time && voteTimeOld <= meal.end_time;
    });
    
    // NEW method 
    const voteDate = new Date(vote.created_at);
    const utcHours = voteDate.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = voteDate.getUTCMinutes().toString().padStart(2, '0');
    const voteTimeNew = `${utcHours}:${utcMinutes}`;
    const mealNew = mealPeriods.find((meal) => {
      return voteTimeNew >= meal.start_time && voteTimeNew <= meal.end_time;
    });
    
    console.log(`UTC timestamp: ${vote.created_at}`);
    console.log(`OLD method (local): ${voteTimeOld} -> ${mealOld ? mealOld.name : 'No meal'}`);
    console.log(`NEW method (UTC):   ${voteTimeNew} -> ${mealNew ? mealNew.name : 'No meal'}`);
    console.log(`Different result: ${(mealOld?.name || 'No meal') !== (mealNew?.name || 'No meal') ? 'YES ⚠️' : 'NO ✅'}`);
  });
  
  // Restore original TZ
  process.env.TZ = originalTZ;
}

// Test in different timezones
testInTimezone('UTC', votes, mealPeriods);
testInTimezone('America/New_York', votes, mealPeriods); // UTC-5/UTC-4
testInTimezone('Asia/Tokyo', votes, mealPeriods); // UTC+9
testInTimezone('Europe/Zurich', votes, mealPeriods); // UTC+1/UTC+2