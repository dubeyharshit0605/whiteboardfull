const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

function verifyToken(token) {
  const { userId } = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
  if (!mongoose.isObjectIdOrHexString(userId)) throw new Error("Invalid identity");
  return userId;
}

exports.verifyToken = verifyToken;
exports.authMiddleware = (req, res, next) => {
  try {
    const match = /^Bearer (\S+)$/.exec(req.get("Authorization") || "");
    req.userId = verifyToken(match?.[1]);
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  next();
};
