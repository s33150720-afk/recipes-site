const token = localStorage.getItem('token');
const userName = localStorage.getItem('name');

if (!token) {
  window.location.href = 'login.html';
}

const API = 'http://localhost:3000/api/recipes';
let allRecipes = [];
let activeKosher = 'הכל';
let activeDish = 'הכל';

document.getElementById('welcome-msg').textContent = `הי ${userName} ! `;

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('name');
  window.location.href = 'login.html';
}

async function loadRecipes() {
  const res = await fetch(API, {
    headers: { 'Authorization': token }
  });
  allRecipes = await res.json();
  renderRecipes();
}

function setKosher(value, btn) {
  activeKosher = value;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const dishFilters = document.getElementById('dish-filters');
  if (value === 'הכל') {
    dishFilters.style.display = 'none';
    activeDish = 'הכל';
  } else {
    dishFilters.style.display = 'flex';
  }

  renderRecipes();
}

function setDish(value, btn) {
  activeDish = value;
  document.querySelectorAll('.filter-btn-dish').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRecipes();
}

function renderRecipes() {
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';

  let filtered = allRecipes;
  if (activeKosher !== 'הכל') filtered = filtered.filter(r => r.category === activeKosher);
  if (activeDish !== 'הכל') filtered = filtered.filter(r => r.dish_type === activeDish);

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:#D4856A;text-align:center;width:100%;padding:20px;">אין מתכונים בקטגוריה זו עדיין</p>';
  } else {
    filtered.forEach(r => {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = `recipe.html?id=${r.id}`;
  const isImage = r.emoji && r.emoji.startsWith('/uploads/');
  card.innerHTML = `
    <div class="card-emoji">
      ${isImage 
        ? `<img src="${r.emoji}" style="width:100%;height:140px;object-fit:cover;">` 
        : (r.emoji || '<img src="cutlery.png" style="width:48px;height:48px;">')}
    </div>
    <div class="card-body">
      <div class="card-title">${r.title}</div>
      <div class="card-meta">${r.difficulty} · ${r.prep_time}</div>
      <div class="card-tags">
        <span class="card-category">${r.category || 'פרווה'}</span>
        <span class="card-dish">${r.dish_type || ''}</span>
      </div>
    </div>
  `;
  grid.appendChild(card);
});
  }

  const addCard = document.createElement('div');
  addCard.className = 'add-card';
  addCard.innerHTML = `
    <div class="add-plus">+</div>
    <div class="add-label">הוסף מתכון</div>
  `;
  addCard.addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'flex';
  });
  grid.appendChild(addCard);
}

document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
});

document.getElementById('save-btn').addEventListener('click', async () => {
  let imagePath = null;
  const imageFile = document.getElementById('image-upload').files[0];

  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const uploadRes = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { 'Authorization': token },
      body: formData
    });
    const uploadData = await uploadRes.json();
    imagePath = uploadData.path;
  }

  const recipe = {
    emoji: imagePath || document.getElementById('emoji').value,
    title: document.getElementById('title').value,
    prep_time: document.getElementById('prep_time').value,
    difficulty: document.getElementById('difficulty').value,
    description: document.getElementById('description').value,
    ingredients: document.getElementById('ingredients').value,
    steps: document.getElementById('steps').value,
    category: document.getElementById('category').value,
    dish_type: document.getElementById('dish_type').value,
  };

  if (!recipe.title) {
    alert('נא להוסיף כותרת!');
    return;
  }

  await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify(recipe)
  });

  document.getElementById('overlay').style.display = 'none';
  loadRecipes();
});

loadRecipes();