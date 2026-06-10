const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'my-recipe-secret-key';
const DB_PATH = path.join(__dirname, 'recipes.db');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: multerStorage });

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

initSqlJs().then(SQL => {
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS recipes (
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
  )`);

  try { db.run(`ALTER TABLE recipes ADD COLUMN user_id INTEGER`); } catch {}

  saveDb();
  console.log('Database ready.');

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
      db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashed]);
      const result = db.exec(`SELECT last_insert_rowid() as id`);
      const id = result[0].values[0][0];
      saveDb();
      const token = jwt.sign({ id, name }, SECRET);
      res.json({ token, name });
    } catch {
      res.status(400).json({ error: 'האימייל כבר קיים' });
    }
  });

  // LOGIN
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = db.exec(`SELECT * FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
    if (!result.length || !result[0].values.length)
      return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
    const cols = result[0].columns;
    const row = result[0].values[0];
    const user = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'אימייל או סיסמה שגויים' });
    const token = jwt.sign({ id: user.id, name: user.name }, SECRET);
    res.json({ token, name: user.name });
  });

  // GET all recipes
  app.get('/api/recipes', auth, (req, res) => {
    const result = db.exec(`SELECT * FROM recipes WHERE user_id = ${req.user.id}`);
    if (!result.length) return res.json([]);
    const cols = result[0].columns;
    const rows = result[0].values.map(r => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
    res.json(rows);
  });

  // GET single recipe
  app.get('/api/recipes/:id', auth, (req, res) => {
    const result = db.exec(`SELECT * FROM recipes WHERE id = ${req.params.id} AND user_id = ${req.user.id}`);
    if (!result.length || !result[0].values.length)
      return res.status(404).json({ error: 'מתכון לא נמצא' });
    const cols = result[0].columns;
    const row = Object.fromEntries(cols.map((c, i) => [c, result[0].values[0][i]]));
    res.json(row);
  });

  // POST new recipe
  app.post('/api/recipes', auth, (req, res) => {
    const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
    db.run(`INSERT INTO recipes (user_id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type]);
    const result = db.exec(`SELECT last_insert_rowid() as id`);
    const id = result[0].values[0][0];
    saveDb();
    res.json({ id, message: 'המתכון נשמר!' });
  });

  // PUT update recipe
  app.put('/api/recipes/:id', auth, (req, res) => {
    const { title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type } = req.body;
    db.run(`UPDATE recipes SET title=?, emoji=?, prep_time=?, difficulty=?, description=?, ingredients=?, steps=?, category=?, dish_type=? WHERE id=? AND user_id=?`,
      [title, emoji, prep_time, difficulty, description, ingredients, steps, category, dish_type, req.params.id, req.user.id]);
    saveDb();
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
});