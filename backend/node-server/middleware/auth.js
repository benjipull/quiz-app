const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure you have JWT_SECRET in .env
        req.user = decoded; // Attach user payload to request
        console.log("Decoded Token:", req.user);
        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
};
