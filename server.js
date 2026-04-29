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
    steps TEXT
  )
`);

// GET all recipes
app.get('/api/recipes', (req, res) => {
  db.all('SELECT * FROM recipes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST a new recipe
app.post('/api/recipes', (req, res) => {
  const { title, emoji, prep_time, difficulty, description, ingredients, steps } = req.body;
  db.run(
    `INSERT INTO recipes (title, emoji, prep_time, difficulty, description, ingredients, steps)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, emoji, prep_time, difficulty, description, ingredients, steps],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Recipe saved!' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});