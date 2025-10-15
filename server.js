const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve everything inside the Frontend folder
app.use(express.static(path.join(__dirname, "../Frontend")));

// Connect to MongoDB
const client = new MongoClient(process.env.MONGO_URI);

async function start() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db("gamehub"); // database name
    const users = db.collection("users");

    // Register route
    app.post("/register", async (req, res) => {
      const { username, password } = req.body;
      const existing = await users.findOne({ username });
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }
      await users.insertOne({ username, password });
      res.json({ success: true });
    });

    // Login route
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ success: true, user: { username: user.username } });
    });

    // ✅ Root route: serve index.html automatically
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../Frontend/index.html"));
    });

    // Start server (important fix: use Render's PORT if available)
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
  }
}

start();
