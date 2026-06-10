const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'my-recipe-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new Database('./recipes.db');
console.log('Connected to SQLite database.');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    emoji TEXT,
    prep_time TEXT,
    difficulty TEXT,
    description TEXT,
    ingredients TEXT,
    steps TEXT,
    category TEXT,
    dish_type TEXT
  )
`);

try { db.exec(`ALTER TABLE recipes ADD COLUMN user_id INTEGER`); } catch {}

// Middleware to verify token
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'לא מחובר' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'טוקן לא תקין' });
  }
}

// REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'נא למלא את כל השדות' });
  const hashed = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`);
    const result = stmt.run(name, email, hashed);
    const token = jwt.sign({ id: result.lastInsertRowid, name }, SECRET);
    res.json({ token, name });
  } catch {
    res.status(400).json({ error: 'האימייל כבר קיים' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  if (!user) return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
  const token = jwt.sign({ id: user.id, name: user.name }, SECRET);
  res.json({ token, name: user.name });
});

// GET all recipes
app.get('/api/recipes', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM recipes WHERE user_id = ?').all(req.user.id);
  res.json(rows);
});

// GET single recipe
app.get('/api/recipes/:id', auth, (req, res) => {
  const row = db.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'מתכון לא נמצא' });
  res.json(row);
});

// POST new recipe
app.post('/api/recipes', auth, (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  const result = db.prepare(
    `INSERT INTO recipes (user_id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type);
  res.json({ id: result.lastInsertRowid, message: 'המתכון נשמר!' });
});

// PUT update recipe
app.put('/api/recipes/:id', auth, (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  db.prepare(
    `UPDATE recipes SET title=?, emoji=?, prep_time=?, difficulty=?, description=?, ingredients=?, steps=?, category=?, dish_type=? WHERE id=? AND user_id=?`
  ).run(title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type, req.params.id, req.user.id);
  res.json({ message: 'המתכון עודכן!' });
});

// Serve uploaded images
app.use('/uploads', express.static('uploads'));

// Upload image
app.post('/api/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'לא נבחרה תמונה' });
  res.json({ path: `/uploads/${req.file.filename}` });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});