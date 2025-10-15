const express = require('express');
const fs = require('fs');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: true
}));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Admin credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'password123';

// Helpers for games
function readGamesSafe() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'games.json'), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeGamesSafe(games) {
  fs.writeFileSync(path.join(__dirname, 'games.json'), JSON.stringify(games, null, 2));
}

// Helpers for orders
function readOrdersSafe() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'orders.json'), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeOrdersSafe(orders) {
  fs.writeFileSync(path.join(__dirname, 'orders.json'), JSON.stringify(orders, null, 2));
}

// Helpers for customers
function readCustomersSafe() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'customers.json'), 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function writeCustomersSafe(customers) {
  fs.writeFileSync(path.join(__dirname, 'customers.json'), JSON.stringify(customers, null, 2));
}

// Auth guard for admin
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(403).send({ error: 'Not authorized' });
}

// -------------------- CUSTOMER AUTH --------------------
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).send({ error: 'All fields required' });
  }

  const customers = readCustomersSafe();
  if (customers.find(c => c.username === username)) {
    return res.status(400).send({ error: 'Username already exists' });
  }

  const newCustomer = {
    id: customers.length ? Math.max(...customers.map(c => c.id)) + 1 : 1,
    username,
    password, // ⚠️ plain text for now
    email
  };
  customers.push(newCustomer);
  writeCustomersSafe(customers);

  res.send({ success: true, customer: { id: newCustomer.id, username, email } });
});

app.post('/customer-login', (req, res) => {
  const { username, password } = req.body;
  const customers = readCustomersSafe();
  const customer = customers.find(c => c.username === username && c.password === password);
  if (!customer) {
    return res.status(401).send({ error: 'Invalid credentials' });
  }
  req.session.customer = { id: customer.id, username: customer.username };
  res.send({ success: true, customer: req.session.customer });
});

app.get('/customer-logout', (req, res) => {
  delete req.session.customer;
  res.redirect('/index.html');
});

app.get('/customer-check', (req, res) => {
  res.send({ authenticated: !!req.session.customer, customer: req.session.customer || null });
});

// -------------------- ADMIN AUTH --------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    res.send({ success: true });
  } else {
    res.status(401).send({ error: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

app.get('/check-auth', (req, res) => {
  res.send({ authenticated: !!req.session.authenticated });
});

// -------------------- GAME ROUTES --------------------
app.post('/add-game', requireAuth, upload.single('image'), (req, res) => {
  const name = req.body.name;
  const price = parseFloat(req.body.price);
  const category = req.body.category || 'Uncategorized';
  const imagePath = req.file ? '/uploads/' + req.file.filename : '';

  if (!name || Number.isNaN(price)) {
    return res.status(400).send({ error: 'Name and numeric price are required' });
  }

  const games = readGamesSafe();
  const newId = games.length ? Math.max(...games.map(g => g.id)) + 1 : 1;
  const newGame = { id: newId, name, price, image: imagePath, category };
  games.push(newGame);
  writeGamesSafe(games);
  res.send({ success: true, game: newGame });
});

app.post('/update-game', requireAuth, upload.single('image'), (req, res) => {
  const id = parseInt(req.body.id, 10);
  const price = parseFloat(req.body.price);
  const category = req.body.category;
  const games = readGamesSafe();
  const game = games.find(g => g.id === id);
  if (!game) return res.status(404).send({ error: 'Game not found' });

  if (!Number.isNaN(price)) {
    game.price = price;
  }
  if (category) {
    game.category = category;
  }
  if (req.file) {
    game.image = '/uploads/' + req.file.filename;
  }

  writeGamesSafe(games);
  res.send({ success: true, game });
});

app.post('/delete-game', requireAuth, (req, res) => {
  const id = parseInt(req.body.id, 10);
  const games = readGamesSafe();
  const next = games.filter(g => g.id !== id);
  if (next.length === games.length) return res.status(404).send({ error: 'Game not found' });
  writeGamesSafe(next);
  res.send({ success: true });
});

// -------------------- ORDER ROUTES --------------------
app.post('/place-order', (req, res) => {
  const { name, email, address, payment, items, total } = req.body;
  if (!name || !email || !address || !payment || !items || !total) {
    return res.status(400).send({ error: 'Missing order fields' });
  }

  const orders = readOrdersSafe();
  const newOrder = {
    id: orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1,
    name,
    email,
    address,
    payment,
    items,
    total,
    date: new Date().toISOString(),
    status: "Pending",
    customerId: req.session.customer ? req.session.customer.id : null
  };
  orders.push(newOrder);
  writeOrdersSafe(orders);

  res.send({ success: true, order: newOrder });
});

// Admin: view all orders
app.get('/orders', requireAuth, (req, res) => {
  const orders = readOrdersSafe();
  res.send(orders);
});

// Customer: view only their orders
app.get('/my-orders', (req, res) => {
  if (!req.session.customer) {
    return res.status(401).send({ error: 'Not logged in' });
  }
  const orders = readOrdersSafe();
  const my = orders.filter(o => o.customerId === req.session.customer.id);
  res.send(my);
});

// Admin: update order status
app.post('/update-order-status', requireAuth, (req, res) => {
  const orderId = parseInt(req.body.orderId, 10);
  const { status } = req.body;
  const orders = readOrdersSafe();
  const order = orders.find(o => o.id === orderId);
  if (!order) return res.status(404).send({ error: 'Order not found' });

  order.status = status;
  writeOrdersSafe(orders);
  res.send({ success: true, order });
});

// -------------------- START SERVER --------------------
app.listen(3000, () => console.log('Server running at http://localhost:3000'));
