const express = require('express');
const cors = require('cors')
require('dotenv').config();
const playerRoutes = require('./routes/player.routes');
const teamRoutes = require('./routes/team.routes');
const authRoutes = require('./routes/auth.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.get('/',(req,res)=>{
    res.send('Spirit11 backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`);
});