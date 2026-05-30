const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Formula helpers
// ---------------------------------------------------------------------------

/**
 * Batting Strike Rate = (Total Runs / Total Balls Faced) * 100
 */
function battingStrikeRate(runs, ballsFaced) {
  if (ballsFaced === 0) return 0;
  return (runs / ballsFaced) * 100;
}

/**
 * Batting Average = Total Runs / Innings Played
 */
function battingAverage(runs, inningsPlayed) {
  if (inningsPlayed === 0) return 0;
  return runs / inningsPlayed;
}

/**
 * Bowling Strike Rate = Total Balls Bowled / Total Wickets Taken
 */
function bowlingStrikeRate(ballsBowled, wickets) {
  if (wickets === 0) return null; // Cannot divide by zero — excluded from bowling component
  return ballsBowled / wickets;
}

/**
 * Economy Rate = (Total Runs Conceded / Total Balls Bowled) * 6
 */
function economyRate(runsConceded, ballsBowled) {
  if (ballsBowled === 0) return null; // Cannot divide by zero — excluded from bowling component
  return (runsConceded / ballsBowled) * 6;
}

/**
 * Player Points =
 *   (Batting Strike Rate / 5)
 *   + (Batting Average * 0.8)
 *   + (500 / Bowling Strike Rate)   [only if wickets > 0]
 *   + (140 / Economy Rate)          [only if balls bowled > 0]
 */
function calculatePoints(runs, ballsFaced, inningsPlayed, wickets, oversBowled, runsConceded) {
  const ballsBowled = Math.round(oversBowled * 6);

  const bsr = battingStrikeRate(runs, ballsFaced);
  const ba  = battingAverage(runs, inningsPlayed);
  const bwsr = bowlingStrikeRate(ballsBowled, wickets);
  const er   = economyRate(runsConceded, ballsBowled);

  let points = 0;
  points += bsr / 5;
  points += ba * 0.8;
  if (bwsr !== null) points += 500 / bwsr;
  if (er   !== null) points += 140 / er;

  return points;
}

/**
 * Player Value = round( ((9 * Points) + 100) * 1000 ) to nearest 50,000
 */
function calculateValue(points) {
  const rawValue = ((9 * points) + 100) * 1000;
  return Math.round(rawValue / 50000) * 50000;
}

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
