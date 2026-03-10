const jwt = require("jsonwebtoken");
const User = require("../models/user");

function logWarning(message, req) {
  console.log(JSON.stringify({
    severity: "WARNING",
    message,
    route: req?.originalUrl || "N/A",
  }));
}

function logError(message, err, req) {
  console.log(JSON.stringify({
    severity: "ERROR",
    message,
    route: req?.originalUrl || "N/A",
    error: err?.message || err,
    stack: err?.stack,
  }));
}

async function touchLastLogin(userId, req) {
  if (!userId) return;

  try {
    await User.updateOne(
      { _id: userId },
      { $set: { lastlogin_at: new Date() } }
    );
  } catch (err) {
    logError("Failed to update lastlogin_at", err, req);
  }
}

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logWarning("Missing or malformed token", req);
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        logWarning("Token expired", req);
        return res.status(401).json({ error: "Token expired" });
      }

      if (err.name === "JsonWebTokenError") {
        logWarning(`Invalid token: ${err.message}`, req);
        return res.status(401).json({ error: "Invalid token" });
      }

      logError("Unexpected token verification error", err, req);
      return res.status(401).json({ error: "Authentication failed" });
    }

    // ✅ Token is valid — attach user payload to request
    req.user = decoded;
    await touchLastLogin(decoded.id, req);
    next();
  });
};
