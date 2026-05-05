const API = 'http://localhost:3000/api/recipes';
let allRecipes = [];

async function loadRecipes() {
  const res = await fetch(API);
  allRecipes = await res.json();
  renderRecipes(allRecipes);
}

function filterRecipes(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  if (category === 'הכל') {
    renderRecipes(allRecipes);
  } else {
    renderRecipes(allRecipes.filter(r => r.category === category));
  }
}

function renderRecipes(recipes) {
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';

  if (recipes.length === 0) {
    grid.innerHTML = '<p style="color:#D4856A; text-align:center; width:100%;">אין מתכונים בקטגוריה זו עדיין</p>';
  } else {
    recipes.forEach(recipe => {
      const card = document.createElement('a');
      card.className = 'card';
      card.href = `recipe.html?id=${recipe.id}`;
      card.innerHTML = `
        <div class="card-emoji">${recipe.emoji || '🍽️'}</div>
        <div class="card-body">
          <div class="card-title">${recipe.title}</div>
          <div class="card-meta">${recipe.difficulty} · ${recipe.prep_time}</div>
          <div class="card-category">${recipe.category || 'פרווה'}</div>
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
  const recipe = {
    emoji: document.getElementById('emoji').value,
    title: document.getElementById('title').value,
    prep_time: document.getElementById('prep_time').value,
    difficulty: document.getElementById('difficulty').value,
    description: document.getElementById('description').value,
    ingredients: document.getElementById('ingredients').value,
    steps: document.getElementById('steps').value,
    category: document.getElementById('category').value,
  };

  if (!recipe.title) {
    alert('נא להוסיף כותרת!');
    return;
  }

  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe)
  });

  document.getElementById('overlay').style.display = 'none';
  loadRecipes();
});

loadRecipes();