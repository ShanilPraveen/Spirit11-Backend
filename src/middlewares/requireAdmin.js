function requireAdmin(req,res,next){
    if(req.user?.role === 'admin'){
        next();
    }else{
        res.status(403).json({ error: "Admin Access Required" });
    }
}

module.exports = requireAdmin;