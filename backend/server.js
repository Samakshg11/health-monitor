const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

// ================== BASIC CHECKS ==================
if (!process.env.MONGO_URI) console.error("❌ MONGO_URI is missing");
if (!process.env.JWT_SECRET) console.error("❌ JWT_SECRET is missing");
if (!process.env.CLIENT_URL) console.error("❌ CLIENT_URL is missing");

// ================== APP SETUP ==================
const app = express();
const server = http.createServer(app);

// ================== MIDDLEWARE ==================
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_ALT,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5001',
].filter(Boolean);

const corsOriginValidator = (origin, callback) => {
  // Allow non-browser clients and same-origin server calls.
  if (!origin) return callback(null, true);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
  })
);

app.use(express.json());

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// ================== ROUTES ==================
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const alertRoutes = require("./routes/alerts");
const billingRoutes = require("./routes/billing");

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/billing", billingRoutes);

// ================== SERVE FRONTEND ==================
// CRA outputs to "build" (not "dist")
const frontendPath = path.join(__dirname, "../frontend/build");
const frontendIndex = path.join(frontendPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndex);

if (hasFrontendBuild) {
  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(frontendIndex);
  });
} else {
  console.warn(`⚠️ Frontend build not found at ${frontendIndex}`);
}

// ================== SOCKET EVENTS ==================
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ================== CONNECT MONGODB ==================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) =>
    console.error("❌ MongoDB connection failed:", err.message)
  );

