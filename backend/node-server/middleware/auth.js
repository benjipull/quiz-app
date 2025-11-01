const jwt = require("jsonwebtoken");

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

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logWarning("Missing or malformed token", req);
    return res.status(401).json({ error: "Missing or malformed token" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
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
    next();
  });
};
