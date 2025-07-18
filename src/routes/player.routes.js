const express = require("express");
const router = express.Router();
const {PrismaClient} = require('@prisma/client');
const prisma  = new PrismaClient();
const authenticateToken = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');

router.get("/",async(req,res)=>{
    try{
        const players = await prisma.player.findMany({
            orderBy: {
                name: 'asc'}
        });
        res.status(200).json(players);
    }
    catch(error){
        console.error("Error fetching players:", error);
        res.status(500).json({error: "Internal Server Error"});
    }

})

router.get("/:id",async(req,res)=>{
    try{
        const player = await prisma.player.findUnique({
            where: {id: req.params.id}
        });
        if(!player){
            return res.status(404).json({error: "Player not found"});
        }
        res.status(200).json(player);
        //console.log(player);
    }
    catch(error){
        console.error("Error fetching player:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
})

router.get("/teams",async(req,res)=>{
    try{
        const teams = await prisma.team.findMany({
            include: {
                players: true
            }
        });
        res.status(200).json(teams);
    }
    catch(error){
        console.error("Error fetching teams:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});


router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const {
    name, university, position,
    value, runs, ballsFaced, inningsPlayed,
    wickets, oversBowled, runsConceded
  } = req.body;

  try {
    const player = await prisma.player.create({
      data: {
        name,
        university,
        position,
        value,
        runs,
        ballsFaced,
        inningsPlayed,
        wickets,
        oversBowled,
        runsConceded
      }
    });
    res.status(201).json(player);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});


router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const player = await prisma.player.update({
      where: { id },
      data: updates
    });
    res.status(200).json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.player.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;