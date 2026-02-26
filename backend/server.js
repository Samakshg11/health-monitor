// server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// ================== BASIC CHECKS ==================
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing");
}
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing");
}
if (!process.env.CLIENT_URL) {
  console.error("❌ CLIENT_URL is missing");
}

// ================== APP SETUP ==================
const app = express();
const server = http.createServer(app);

// ================== EXPRESS MIDDLEWARE ==================
app.use(
  cors({
    origin: process.env.CLIENT_URL, // EXACT frontend URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ================== SOCKET.IO ==================
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL, // EXACT frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io accessible in routes
app.set("io", io);

// ================== ROUTES ==================
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const alertRoutes = require("./routes/alerts");

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Health Monitor API Running ✅" });
});

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
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
  });

// ================== EXPORT ==================
module.exports = { io };