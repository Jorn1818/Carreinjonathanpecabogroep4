let machines = [];
let activeCategory = "all";

async function loadMachines(category = 'all') {
  const url = (category && category !== 'all')
    ? `/api/machines?category=${encodeURIComponent(category)}`
    : '/api/machines';
  console.log('Fetching machines from', url);
  const response = await fetch(url);
  machines = await response.json();
  console.log('Received', Array.isArray(machines) ? machines.length : 0, 'machines');
  activeCategory = category;
  renderMachines();
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('Network error');
    const cats = await res.json();
    const filters = document.querySelector('.filters');
    const buttons = ['all', ...cats].map((c, i) => {
      const label = c === 'all' ? 'Alle machines' : c;
      const active = c === 'all' ? ' class="active"' : '';
      return `<button data-category="${c}"${active}>${label}</button>`;
    }).join('');
    filters.innerHTML = buttons;
    attachFilterHandlers();
  } catch (e) {
    console.error('Failed to load categories', e);
    // fallback: attach handlers to any existing static buttons in the HTML
    attachFilterHandlers();
  }
}

function attachFilterHandlers() {
  const btns = document.querySelectorAll('.filters button');
  if (!btns || btns.length === 0) return;
  btns.forEach(btn => {
    // avoid adding duplicate listeners
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('.filters button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector('.filters .active')?.classList.remove('active');
      btn.classList.add('active');
      const category = btn.dataset.category || 'all';
      loadMachines(category);
    });
  });
}

function renderMachines() {
  const container = document.getElementById("machines");
  container.innerHTML = "";
  // Render whatever the server returned. Server handles filtering by category.
  const list = Array.isArray(machines) ? machines : [];
  const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="24">Geen afbeelding</text></svg>';

  list.forEach((machine, idx) => {
    const card = document.createElement("a");
    card.className = "card";
    card.href = `aankoop.html?id=${machine.id ?? idx}`;
    card.target = "_blank";
    card.dataset.id = machine.id ?? idx;

    // determine image src (handle array or string or missing)
    let imgSrc = placeholder;
    if (Array.isArray(machine.images) && machine.images.length) imgSrc = machine.images[0];
    else if (typeof machine.images === 'string' && machine.images.trim()) imgSrc = machine.images.trim();

    const name = machine.name || 'Onbekende machine';
    const desc = machine.description || '';
    const weight = machine.weight !== undefined ? `${machine.weight} ton` : '';
    const price = machine.price_per_day !== undefined ? `€${machine.price_per_day}` : '';
    const beschikbaar = machine.beschikbaar === 1 || machine.beschikbaar === true || String(machine.beschikbaar).toLowerCase() === 'true';

    card.innerHTML = `
      ${beschikbaar ? `<div class="badge">Beschikbaar</div>` : ""}
      <div class="image-container"><img src="${imgSrc}" alt="${name}"></div>
      <div class="card-body">
        <h3>${name}</h3>
        <p>${desc}</p>
        <div class="specs">
          <span>${weight}</span>
          <span>${price}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Filter buttons
// build filters from DB then load machines
loadCategories().then(() => loadMachines('all'));