const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

async function main() {
  console.log('🧹 Clearing old players...');
  await prisma.teamPlayer.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.user.deleteMany();

  const results = [];
  const filePath = path.join(__dirname, 'sample_data.csv');

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        results.push({
          name: row['Name'],
          university: row['University'],
          position: row['Category'],
          value: 0, // You can adjust this dynamically later
          runs: parseInt(row['Total Runs']),
          ballsFaced: parseInt(row['Balls Faced']),
          inningsPlayed: parseInt(row['Innings Played']),
          wickets: parseInt(row['Wickets']),
          oversBowled: parseFloat(row['Overs Bowled']),
          runsConceded: parseInt(row['Runs Conceded'])
        });
      })
      .on('end', async () => {
        console.log(`📥 Inserting ${results.length} players...`);
        for (const player of results) {
          await prisma.player.create({ data: player });
        }
        console.log('✅ All players seeded!');
        await prisma.$disconnect();
        resolve();
      })
      .on('error', async (err) => {
        console.error('❌ Error reading CSV:', err);
        await prisma.$disconnect();
        reject(err);
      });
  });
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
});
