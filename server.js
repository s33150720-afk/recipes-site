const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // serves your HTML files

// Connect to database (creates the file if it doesn't exist)
const db = new sqlite3.Database('./recipes.db', (err) => {
  if (err) console.error(err.message);
  else console.log('Connected to SQLite database.');
});

// Create recipes table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    emoji TEXT,
    prep_time TEXT,
    difficulty TEXT,
    description TEXT,
    ingredients TEXT,
    steps TEXT,
    category TEXT DEFAULT 'פרווה'
    dish_type TEXT DEFAULT 'מנות עיקריות'
  )
`);
db.run(`ALTER TABLE recipes ADD COLUMN category TEXT DEFAULT 'פרווה'`, (err) => {
  // ignore error if column already exists
});
db.run(`ALTER TABLE recipes ADD COLUMN dish_type TEXT DEFAULT 'מנות עיקריות'`, (err) => {
  // ignore error if column already exists
});
// GET all recipes
app.get('/api/recipes', (req, res) => {
  db.all('SELECT * FROM recipes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST a new recipe
app.post('/api/recipes', (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  db.run(
    `INSERT INTO recipes (title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Recipe saved!' });
    }
  );
});
// GET single recipe by id
app.get('/api/recipes/:id', (req, res) => {
  db.get('SELECT * FROM recipes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Recipe not found' });
    res.json(row);
  });
});
// UPDATE recipe by id
app.put('/api/recipes/:id', (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
  db.run(
    `UPDATE recipes SET title=?, emoji=?, prep_time=?, difficulty=?, description=?, ingredients=?, steps=?, category=?, dish_type=? WHERE id=?`,
    [title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Recipe updated!' });
    }
  );
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});