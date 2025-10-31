const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("⚠️ Missing or malformed token:", req.originalUrl);
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Handle token-specific errors distinctly
      if (err.name === "TokenExpiredError") {
        console.warn("⚠️ Token expired for request:", req.originalUrl);
        return res.status(401).json({ error: "Token expired" });
      }
      if (err.name === "JsonWebTokenError") {
        console.warn("⚠️ Invalid token:", err.message);
        return res.status(401).json({ error: "Invalid token" });
      }
      console.error("⚠️ Token verification error:", err);
      return res.status(401).json({ error: "Authentication failed" });
    }

    // ✅ Token is valid — attach user payload to request
    req.user = decoded;
    next();
  });
};