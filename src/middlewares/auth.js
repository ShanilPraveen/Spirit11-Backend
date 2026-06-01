const jwt = require("jsonwebtoken");
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Access token is required" });
    }

    jwt.verify(token, ACCESS_SECRET, (err, user) => {
        if (err) {
            // Return 401 for expired tokens so the frontend interceptor
            // can silently refresh via the HttpOnly cookie.
            // Return 403 only for tokens with an invalid signature.
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Access token expired" });
            }
            return res.status(403).json({ error: "Invalid access token" });
        }
        req.user = user;
        next();
    });
}

module.exports = authenticateToken;