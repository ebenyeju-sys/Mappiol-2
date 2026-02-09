// --- DONNÉES SIMULÉES ---
const MOCK_DATA = [
    { id: 1, title: "Studio de Luxe", price: 150000, loc: "Bonapriso, Douala", type: "Studio", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600" },
    { id: 2, title: "Appartement Moderne", price: 300000, loc: "Bastos, Yaoundé", type: "Appartement", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600" },
    { id: 3, title: "Villa Panoramique", price: 800000, loc: "Kribi, Littoral", type: "Villa", img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600" },
    { id: 4, title: "Studio Meublé", price: 120000, loc: "Akwa, Douala", type: "Studio", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600" }
];

// --- ÉLÉMENTS DU DOM ---
const grid = document.getElementById('router-outlet');
const themeToggle = document.getElementById('theme-toggle');
const filterToggle = document.getElementById('filter-toggle');
const filterDrawer = document.getElementById('advanced-filters');
const modal = document.getElementById('property-modal');

// --- FONCTION DE RENDU ---
function render(data) {
    grid.innerHTML = '<div class="listing-grid"></div>';
    const container = grid.querySelector('.listing-grid');
    
    if(data.length === 0) {
        container.innerHTML = '<p style="padding: 40px; text-align: center; grid-column: 1/-1;">Aucun bien trouvé.</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        card.innerHTML = `
            <div class="card-media">
                <img src="${item.img}" alt="${item.title}" loading="lazy">
                <div class="card-badge">Location</div>
            </div>
            <div class="card-body">
                <div class="c-price" style="font-weight: 800; color: var(--primary); font-size: 18px;">${item.price.toLocaleString()} FCFA</div>
                <h3 class="c-title" style="font-size: 16px; margin: 5px 0;">${item.title}</h3>
                <p class="c-loc" style="font-size: 13px; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${item.loc}</p>
            </div>
        `;
        card.onclick = () => openModal(item);
        container.appendChild(card);
    });
}

// --- GESTION DE LA MODALE ---
function openModal(item) {
    document.getElementById('m-img').src = item.img;
    document.getElementById('m-title').textContent = item.title;
    document.getElementById('m-loc').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${item.loc}`;
    document.getElementById('m-price').textContent = `${item.price.toLocaleString()} FCFA`;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

// --- ÉVÉNEMENTS ---

// Mode Sombre
themeToggle.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
};

// Afficher/Cacher Filtres
filterToggle.onclick = () => filterDrawer.classList.toggle('active');

// Filtrage par Prix
document.getElementById('filter-price').oninput = (e) => {
    const val = parseInt(e.target.value);
    document.getElementById('price-val').textContent = val.toLocaleString() + " FCFA";
    const filtered = MOCK_DATA.filter(i => i.price <= val);
    render(filtered);
};

// Filtrage par Type
document.getElementById('filter-type').onchange = (e) => {
    const type = e.target.value;
    const filtered = type === 'all' ? MOCK_DATA : MOCK_DATA.filter(i => i.type === type);
    render(filtered);
};

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    render(MOCK_DATA);
});