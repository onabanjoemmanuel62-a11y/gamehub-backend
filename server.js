const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

console.log("DEBUG MONGO_URI:", process.env.MONGO_URI);

const app = express();

// Helper functions for games.json
function readGamesFromFile() {
  try {
    const gamesPath = path.join(__dirname, 'Frontend', 'games.json');
    const data = fs.readFileSync(gamesPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading games.json:', err);
    return [];
  }
}

function writeGamesToFile(games) {
  try {
    const gamesPath = path.join(__dirname, 'Frontend', 'games.json');
    fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing games.json:', err);
    return false;
  }
}

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'Frontend/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow all origins for now (you can restrict this later)
    return callback(null, true);
  },
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
    const games = db.collection("games");

    // Register route with password hashing
    app.post("/register", async (req, res) => {
      const { username, password, email } = req.body;
      
      // Input validation
      if (!username || !password || !email) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const existing = await users.findOne({ username });
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await users.insertOne({ 
        username, 
        password: hashedPassword, 
        email, 
        createdAt: new Date() 
      });
      
      res.json({ success: true });
    });

    // Admin login route with bcrypt
    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await users.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Compare hashed password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.isAdmin = true;
      res.json({ success: true, user: { username: user.username } });
    });

    // Customer login route with bcrypt
    app.post("/customer-login", async (req, res) => {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const user = await users.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Compare hashed password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
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
        const customerId = req.session.userId.toString();
        const username = req.session.username;
        
        // Find orders by either customerId OR customerName (more flexible)
        const userOrders = await orders.find({ 
          $or: [
            { customerId: customerId },
            { customerName: username }
          ]
        }).sort({ date: -1 }).toArray();
        
        console.log(`Found ${userOrders.length} orders for customer: ${username}`);
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

    // ==================== GAME MANAGEMENT API (JSON FILE) ====================
    
    // GET all games (public)
    app.get("/api/games", (req, res) => {
      try {
        const allGames = readGamesFromFile();
        res.json(allGames);
      } catch (err) {
        console.error("Error fetching games:", err);
        res.status(500).json({ error: "Failed to fetch games" });
      }
    });

    // GET single game (public)
    app.get("/api/games/:id", (req, res) => {
      try {
        const gameId = parseInt(req.params.id);
        const allGames = readGamesFromFile();
        const game = allGames.find(g => g.id === gameId);
        
        if (!game) {
          return res.status(404).json({ error: "Game not found" });
        }
        
        res.json(game);
      } catch (err) {
        console.error("Error fetching game:", err);
        res.status(500).json({ error: "Failed to fetch game" });
      }
    });

    // POST create new game (admin only)
    app.post("/api/games", upload.single('image'), (req, res) => {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      try {
        const { name, price, category } = req.body;
        
        if (!name || !price) {
          return res.status(400).json({ error: "Name and price are required" });
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
          return res.status(400).json({ error: "Price must be a valid number" });
        }

        const allGames = readGamesFromFile();
        
        // Generate new ID
        const newId = allGames.length > 0 ? Math.max(...allGames.map(g => g.id)) + 1 : 1;

        const newGame = {
          id: newId,
          name,
          price: parsedPrice,
          category: category || 'Uncategorized',
          image: req.file ? `/uploads/${req.file.filename}` : ''
        };

        allGames.push(newGame);
        
        if (!writeGamesToFile(allGames)) {
          return res.status(500).json({ error: "Failed to save game" });
        }

        res.json({ success: true, game: newGame });
      } catch (err) {
        console.error("Error creating game:", err);
        res.status(500).json({ error: "Failed to create game" });
      }
    });

    // PUT update game (admin only)
    app.put("/api/games/:id", upload.single('image'), (req, res) => {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      try {
        const gameId = parseInt(req.params.id);
        const { name, price, category } = req.body;

        const allGames = readGamesFromFile();
        const gameIndex = allGames.findIndex(g => g.id === gameId);
        
        if (gameIndex === -1) {
          return res.status(404).json({ error: "Game not found" });
        }

        // Update game properties
        if (name) allGames[gameIndex].name = name;
        if (price) {
          const parsedPrice = parseFloat(price);
          if (isNaN(parsedPrice)) {
            return res.status(400).json({ error: "Price must be a valid number" });
          }
          allGames[gameIndex].price = parsedPrice;
        }
        if (category) allGames[gameIndex].category = category;
        if (req.file) allGames[gameIndex].image = `/uploads/${req.file.filename}`;

        if (!writeGamesToFile(allGames)) {
          return res.status(500).json({ error: "Failed to update game" });
        }
        
        res.json({ success: true, game: allGames[gameIndex] });
      } catch (err) {
        console.error("Error updating game:", err);
        res.status(500).json({ error: "Failed to update game" });
      }
    });

    // DELETE game (admin only)
    app.delete("/api/games/:id", (req, res) => {
      if (!req.session.userId || !req.session.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      try {
        const gameId = parseInt(req.params.id);
        const allGames = readGamesFromFile();
        const filteredGames = allGames.filter(g => g.id !== gameId);

        if (filteredGames.length === allGames.length) {
          return res.status(404).json({ error: "Game not found" });
        }

        if (!writeGamesToFile(filteredGames)) {
          return res.status(500).json({ error: "Failed to delete game" });
        }

        res.json({ success: true, message: "Game deleted successfully" });
      } catch (err) {
        console.error("Error deleting game:", err);
        res.status(500).json({ error: "Failed to delete game" });
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