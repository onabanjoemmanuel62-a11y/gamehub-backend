const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

const app = express();
app.use(cors());
app.use(express.json());

// Simple health check - responds immediately
app.get("/ping", (req, res) => {
  res.send("pong");
});

// ✅ Serve everything inside the Frontend folder
app.use(express.static(path.join(__dirname, "Frontend")));

// Connect to MongoDB
const client = new MongoClient(process.env.MONGO_URI);

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db("gamehub");
    const users = db.collection("users");

    // Register route
    app.post("/register", async (req, res) => {
      const { username, password, email } = req.body;
      const existing = await users.findOne({ username });
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }
      await users.insertOne({ username, password, email });
      res.json({ success: true });
    });

    // Admin login route
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ success: true, user: { username: user.username } });
    });

    // Customer login route (same as admin for now, but separate endpoint)
    app.post("/customer-login", async (req, res) => {
      const { username, password } = req.body;
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ success: true, customer: { username: user.username } });
    });

    // ✅ Root route: serve index.html automatically
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "Frontend/index.html"));
    });

    // Start server - Listen on 0.0.0.0 for Render
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
  }
}

start();