// Generate 100 random votes per day for the last 30 days
const { createClient } = require('gel');

const client = createClient();

async function generateTestVotes() {
  try {
    console.log('Starting test vote generation...');
    
    // Get the test device ID
    const device = await client.querySingle(`
      select Device {
        id,
        name
      } filter .name = 'Test Device' limit 1
    `);
    
    if (!device) {
      console.error('Test Device not found! Please create it first.');
      return;
    }
    
    console.log(`Found device: ${device.name} (${device.id})`);
    
    const now = new Date();
    let totalInserted = 0;
    
    // Generate votes for the last 30 days
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      console.log(`Generating 100 votes for ${date.toISOString().split('T')[0]}`);
      
      // Generate 100 votes for this day
      for (let i = 0; i < 100; i++) {
        // Random rating 1-5
        const rating = Math.floor(Math.random() * 5) + 1;
        
        // Random time during the day (spread throughout 24 hours)
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        
        // Create timestamp for this vote
        const voteTime = new Date(date);
        voteTime.setUTCHours(hour, minute, second, 0);
        
        try {
          // Insert vote individually
          await client.query(`
            insert Vote {
              value := <int64>${rating},
              created_at := <datetime>'${voteTime.toISOString()}',
              device := (select Device filter .id = <uuid>'${device.id}')
            }
          `);
          
          totalInserted++;
          
          // Progress indicator every 10 votes
          if (totalInserted % 10 === 0) {
            process.stdout.write('.');
          }
          
        } catch (error) {
          console.error(`\nError inserting vote ${i + 1} for day ${daysAgo}:`, error.message);
        }
      }
      
      console.log(`\n✓ Day ${30 - daysAgo}/30 complete. Total votes: ${totalInserted}`);
    }
    
    console.log(`\n✅ Successfully inserted ${totalInserted} test votes!`);
    
    // Verify the results
    const totalVotes = await client.querySingle(`
      select count(Vote filter .device.name = 'Test Device')
    `);
    
    console.log(`Total votes for Test Device in database: ${totalVotes}`);
    
    // Show distribution by rating
    console.log('\nRating distribution:');
    for (let rating = 1; rating <= 5; rating++) {
      const count = await client.querySingle(`
        select count(Vote filter .device.name = 'Test Device' and .value = ${rating})
      `);
      console.log(`${rating} stars: ${count} votes`);
    }
    
  } catch (error) {
    console.error('Error generating test votes:', error);
  }
}

// Run the script
generateTestVotes().then(() => {
  console.log('\n🎉 Test vote generation completed!');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});