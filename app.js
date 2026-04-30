const API = 'http://localhost:3000/api/recipes';

// Load recipes on page load
async function loadRecipes() {
  const res = await fetch(API);
  const recipes = await res.json();
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';

  recipes.forEach(recipe => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `recipe.html?id=${recipe.id}`;
    card.innerHTML = `
      <div class="card-emoji">${recipe.emoji || '🍽️'}</div>
      <div class="card-body">
        <div class="card-title">${recipe.title}</div>
        <div class="card-meta">${recipe.prep_time} · ${recipe.difficulty}</div>
        <div class="card-desc">${recipe.description}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  const addCard = document.createElement('div');
  addCard.className = 'add-card';
  addCard.id = 'open-form';
  addCard.innerHTML = `
    <div class="add-plus">+</div>
    <div class="add-label"> הוסף מתכון</div>
  `;
  addCard.addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'flex';
  });
  grid.appendChild(addCard);
}

// Show/hide form
// document.getElementById('open-form').addEventListener('click', () => {
//   document.getElementById('overlay').style.display = 'flex';
// });
document.getElementById('cancel-btn').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
});

// Save new recipe
document.getElementById('save-btn').addEventListener('click', async () => {
  const recipe = {
    emoji: document.getElementById('emoji').value,
    title: document.getElementById('title').value,
    prep_time: document.getElementById('prep_time').value,
    difficulty: document.getElementById('difficulty').value,
    description: document.getElementById('description').value,
    ingredients: document.getElementById('ingredients').value,
    steps: document.getElementById('steps').value,
  };

  if (!recipe.title) {
    alert('Please add a title!');
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

// Initial load
loadRecipes();