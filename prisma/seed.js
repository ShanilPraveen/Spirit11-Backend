const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');
const { calculatePoints, calculateValue } = require('../src/utils/points');

// Formula logic is in src/utils/points.js — imported above.

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function main() {
  console.log('🧹 Clearing existing data...');
  await prisma.teamPlayer.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Seed admin user ────────────────────────────────────────────────────────
  console.log('👤 Seeding admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      money: 10000000,
    },
  });
  console.log('✅ Admin user created  (username: admin / password: admin123)');

  // ── Seed players from CSV ──────────────────────────────────────────────────
  const results = [];
  const filePath = path.join(__dirname, 'sample_data.csv');

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const runs          = parseInt(row['Total Runs']);
        const ballsFaced    = parseInt(row['Balls Faced']);
        const inningsPlayed = parseInt(row['Innings Played']);
        const wickets       = parseInt(row['Wickets']);
        const oversBowled   = parseFloat(row['Overs Bowled']);
        const runsConceded  = parseInt(row['Runs Conceded']);

        const points = calculatePoints(runs, ballsFaced, inningsPlayed, wickets, oversBowled, runsConceded);
        const value  = calculateValue(points);

        results.push({
          name:          row['Name'],
          university:    row['University'],
          position:      row['Category'],
          value,
          runs,
          ballsFaced,
          inningsPlayed,
          wickets,
          oversBowled,
          runsConceded,
        });
      })
      .on('end', async () => {
        console.log(`📥 Inserting ${results.length} players...`);
        for (const player of results) {
          await prisma.player.create({ data: player });
          console.log(`   ✔ ${player.name.padEnd(35)} → value: Rs. ${player.value.toLocaleString()}`);
        }
        console.log('\n✅ All players seeded successfully!');
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
  process.exit(1);
});
