const express = require("express");
const router = express.Router();
const {PrismaClient} = require('@prisma/client');
const prisma  = new PrismaClient();

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

module.exports = router;