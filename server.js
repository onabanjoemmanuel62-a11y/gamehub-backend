const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Session middleware for authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  },
  proxy: true // Important for Render
}));

// Simple health check
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
    const orders = db.collection("orders");

    // Register route
    app.post("/register", async (req, res) => {
      const { username, password, email } = req.body;
      const existing = await users.findOne({ username });
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }
      await users.insertOne({ username, password, email, createdAt: new Date() });
      res.json({ success: true });
    });

    // Admin login route
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.isAdmin = true;
      res.json({ success: true, user: { username: user.username } });
    });

    // Customer login route
    app.post("/customer-login", async (req, res) => {
      const { username, password } = req.body;
      const user = await users.findOne({ username, password });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.isCustomer = true;
      res.json({ success: true, customer: { username: user.username } });
    });

    // Check if customer is authenticated
    app.get("/customer-check", (req, res) => {
      if (req.session.userId && req.session.isCustomer) {
        res.json({ 
          authenticated: true, 
          username: req.session.username 
        });
      } else {
        res.json({ authenticated: false });
      }
    });

    // Customer logout
    app.post("/customer-logout", (req, res) => {
      req.session.destroy();
      res.json({ success: true });
    });

    // Get customer's orders
    app.get("/my-orders", async (req, res) => {
      if (!req.session.userId || !req.session.isCustomer) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      try {
        const userOrders = await orders.find({ 
          customerId: req.session.userId.toString() 
        }).toArray();
        res.json(userOrders);
      } catch (err) {
        console.error("Error fetching orders:", err);
        res.status(500).json({ error: "Failed to fetch orders" });
      }
    });

    // Create order (you'll need this for checkout)
    app.post("/create-order", async (req, res) => {
      if (!req.session.userId || !req.session.isCustomer) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { items, total, email, address, payment, customerName } = req.body;
      const newOrder = {
        id: `ORD-${Date.now()}`,
        customerId: req.session.userId.toString(),
        customerName: customerName || req.session.username,
        name: customerName || req.session.username,
        email,
        address,
        payment,
        items,
        total,
        status: "Pending",
        date: new Date()
      };

      await orders.insertOne(newOrder);
      res.json({ success: true, orderId: newOrder.id });
    });

    // Get all orders (admin only)
    app.get("/orders", async (req, res) => {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      try {
        const allOrders = await orders.find({}).sort({ date: -1 }).toArray();
        res.json(allOrders);
      } catch (err) {
        console.error("Error fetching all orders:", err);
        res.status(500).json({ error: "Failed to fetch orders" });
      }
    });

    // Update order status (admin only)
    app.post("/update-order-status", async (req, res) => {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { orderId, status } = req.body;
      
      try {
        const result = await orders.updateOne(
          { id: orderId },
          { $set: { status: status } }
        );

        if (result.modifiedCount > 0) {
          res.json({ success: true });
        } else {
          res.status(404).json({ error: "Order not found" });
        }
      } catch (err) {
        console.error("Error updating order:", err);
        res.status(500).json({ error: "Failed to update order" });
      }
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