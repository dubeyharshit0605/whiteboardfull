const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");
const { rateLimit } = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const Canvas = require("./models/canvasModel");
const User = require("./models/userModel");
const { verifyToken } = require("./middlewares/authMiddleware");
const { access } = require("./controllers/canvasController");
const userRoutes = require("./routes/userRoutes");
const canvasRoutes = require("./routes/canvasRoutes");

const webRoot = path.resolve(__dirname, "../whiteboard-tutorial/build");

function createServer() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.RENDER === "true") app.set("trust proxy", 1);
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 16384 });
  app.set("io", io);

  app.get("/healthz", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ok" : "unavailable" });
  });
  app.use("/api", (req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
  app.use("/api/users", express.json({ limit: "8kb" }),
    rateLimit({ windowMs: 60000, limit: 30, message: { error: "Too many requests. Try again in a minute." } }),
    userRoutes);
  app.use("/api/canvas", express.json({ limit: "1mb" }), canvasRoutes);
  app.use("/api", (req, res) => res.status(404).json({ error: "Unknown API route" }));
  app.use(express.static(webRoot));
  app.get(["/", "/login", "/register", "/:id([a-fA-F0-9]{24})"], (req, res, next) => {
    res.sendFile(path.join(webRoot, "index.html"), (error) => { if (error) next(error); });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    if (status === 500) console.error("Request failed:", error.name);
    res.status(status).json({ error: status === 413 ? "Drawing is too large" :
      status === 400 ? "Invalid request" : status === 404 ? "Not found" : "Request failed" });
  });

  io.use(async (socket, next) => {
    try {
      const { token, canvasId } = socket.handshake.auth;
      const userId = verifyToken(token);
      if (!mongoose.isObjectIdOrHexString(canvasId)) return next(new Error("Canvas unavailable"));
      const id = canvasId.toLowerCase();
      if (!await Canvas.exists({ _id: id, ...access(userId) })) return next(new Error("Canvas unavailable"));
      socket.data.rooms = [id, id + ":" + userId];
      next();
    } catch {
      next(new Error("Canvas unavailable"));
    }
  });
  io.on("connection", (socket) => socket.join(socket.data.rooms));
  return { server, io };
}

async function start() {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
  if (Buffer.byteLength(process.env.JWT_SECRET || "") < 32) throw new Error("Set JWT_SECRET to at least 32 bytes");
  if (!fs.existsSync(path.join(webRoot, "index.html"))) throw new Error("Build the frontend before starting");
  await connectDB();
  await User.init();
  const { server, io } = createServer();
  const port = Number(process.env.PORT || 5000);
  server.listen(port, "0.0.0.0", () => console.log("Whiteboard listening on port", port));
  process.once("SIGTERM", () => io.close(() => mongoose.disconnect()));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.name === "Error" ? error.message : "Whiteboard startup failed: " + error.name);
    process.exit(1);
  });
}

exports.createServer = createServer;
