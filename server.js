const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET = 'my-recipe-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./recipes.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
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

  db.run(`ALTER TABLE recipes ADD COLUMN user_id INTEGER`, () => {});
});

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
  db.run(
    `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
    [name, email, hashed],
    function (err) {
      if (err) return res.status(400).json({ error: 'האימייל כבר קיים' });
      const token = jwt.sign({ id: this.lastID, name }, SECRET);
      res.json({ token, name });
    }
  );
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
    const token = jwt.sign({ id: user.id, name: user.name }, SECRET);
    res.json({ token, name: user.name });
  });
});

// GET all recipes for logged in user
app.get('/api/recipes', auth, (req, res) => {
  db.all('SELECT * FROM recipes WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET single recipe
app.get('/api/recipes/:id', auth, (req, res) => {
  db.get('SELECT * FROM recipes WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'מתכון לא נמצא' });
    res.json(row);
  });
});

// POST new recipe
app.post('/api/recipes', auth, (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  db.run(
    `INSERT INTO recipes (user_id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'המתכון נשמר!' });
    }
  );
});

// PUT update recipe
app.put('/api/recipes/:id', auth, (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  db.run(
    `UPDATE recipes SET title=?, emoji=?, prep_time=?, difficulty=?, description=?, ingredients=?, steps=?, category=?, dish_type=? WHERE id=? AND user_id=?`,
    [title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type, req.params.id, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'המתכון עודכן!' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});