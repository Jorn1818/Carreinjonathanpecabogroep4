let machines = [];

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="24">Geen afbeelding</text></svg>';

async function loadMachines(category = 'all') {
  const hasCategory = category && category !== 'all';
  const url = hasCategory
    ? `/api/machines?category=${encodeURIComponent(category)}`
    : '/api/machines';
  
  try {
    const response = await fetch(url);
    machines = await response.json();
    console.log(`Loaded ${Array.isArray(machines) ? machines.length : 0} machines`);
    renderMachines();
  } catch (error) {
    console.error('Error loading machines:', error);
  }
}

async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Failed to fetch categories');
    
    const categories = await response.json();

    const filterContainer = document.querySelector('.filters');
    const buttonHTML = ['all', ...categories]
      .map(category => {
        const label = category === 'all' ? 'Alle machines' : category;
        const isActive = category === 'all' ? ' class="active"' : '';
        return `<button data-category="${category}"${isActive}>${label}</button>`;
      })
      .join('');
    
    filterContainer.innerHTML = buttonHTML;
    attachFilterHandlers();
  } catch (error) {
    console.error('Error loading categories:', error);
    attachFilterHandlers();
  }
}

function attachFilterHandlers() {
  const buttons = document.querySelectorAll('.filters button');
  if (!buttons || buttons.length === 0) return;
  
  buttons.forEach(btn => btn.replaceWith(btn.cloneNode(true)));
  
  document.querySelectorAll('.filters button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelector('.filters .active')?.classList.remove('active');
      button.classList.add('active');
      const selectedCategory = button.dataset.category || 'all';
      loadMachines(selectedCategory);
    });
  });
}

function renderMachines() {
  const container = document.getElementById('machines');
  container.innerHTML = '';
  
  const machineList = Array.isArray(machines) ? machines : [];

  machineList.forEach((machine) => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `aankoop.html?id=${machine.machine_id}`;
    card.dataset.id = machine.machine_id;

    let imageSource = PLACEHOLDER_IMAGE;
    if (Array.isArray(machine.images) && machine.images.length > 0) {
      imageSource = machine.images[0];
    } else if (typeof machine.images === 'string' && machine.images.trim()) {
      imageSource = machine.images.trim();
    }

    const machineName = machine.name || 'Onbekende machine';
    const machineDescription = machine.description || '';
    const machineWeight = machine.weight !== undefined ? `${machine.weight} ton` : '';
    const machinePrice = machine.price_per_day !== undefined ? `€${machine.price_per_day}` : '';
    
    const isAvailable = machine.beschikbaar === 1 
      || machine.beschikbaar === true 
      || String(machine.beschikbaar).toLowerCase() === 'true';

    card.innerHTML = `
      ${isAvailable ? '<div class="badge">Beschikbaar</div>' : ''}
      <div class="image-container"><img src="${imageSource}" alt="${machineName}"></div>
      <div class="card-body">
        <h3>${machineName}</h3>
        <p>${machineDescription}</p>
        <div class="specs">
          <span>${machineWeight}</span>
          <span>${machinePrice}</span>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

loadCategories().then(() => loadMachines('all'));