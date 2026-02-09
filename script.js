

const MOCK_DATA = [
    { id: 1, title: "Studio de Luxe", price: 150000, loc: "Bonapriso, Douala", type: "Studio", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600" },
    { id: 2, title: "Appartement Moderne", price: 300000, loc: "Bastos, Yaoundé", type: "Appartement", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600" },
    { id: 3, title: "Villa Panoramique", price: 800000, loc: "Kribi, Littoral", type: "Villa", img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600" },
    { id: 4, title: "Studio Meublé", price: 120000, loc: "Akwa, Douala", type: "Studio", img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600" },
    { id: 5, title: "Duplex Standing", price: 550000, loc: "Santa Barbara, Yaoundé", type: "Villa", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600" },
    { id: 6, title: "Appartement Cosy", price: 200000, loc: "Logpom, Douala", type: "Appartement", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600" }
];

const grid = document.getElementById('router-outlet');
const themeToggle = document.getElementById('theme-toggle');
const modal = document.getElementById('property-modal');

// --- RENDU DES CARTES ---
function render(data) {
    grid.innerHTML = '<div class="listing-grid"></div>';
    const container = grid.querySelector('.listing-grid');
    
    if (data.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 50px; color: var(--text-muted)">
            <i class="fa-solid fa-face-frown" style="font-size: 40px; margin-bottom: 10px"></i>
            <p>Aucun bien ne correspond à votre recherche.</p>
        </div>`;
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'listing-card';
        card.innerHTML = `
            <div class="card-media">
                <img src="${item.img}" loading="lazy" alt="${item.title}">
                <div class="card-badge">${item.type}</div>
            </div>
            <div class="card-body">
                <div class="c-price">${item.price.toLocaleString()} FCFA</div>
                <h3 class="c-title">${item.title}</h3>
                <p class="c-loc"><i class="fa-solid fa-location-dot"></i> ${item.loc}</p>
            </div>
        `;
        card.onclick = () => openModal(item);
        container.appendChild(card);
    });
}

// --- GESTION MODALE ---
function openModal(item) {
    document.getElementById('m-img').src = item.img;
    document.getElementById('m-title').textContent = item.title;
    document.getElementById('m-loc').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${item.loc}`;
    document.getElementById('m-price').textContent = `${item.price.toLocaleString()} FCFA`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Empêche le scroll derrière
}

function closeModal() { 
    modal.classList.remove('active'); 
    document.body.style.overflow = ''; 
}

// --- GESTION DU THÈME ---
themeToggle.onclick = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
    
    localStorage.setItem('mappiol-theme', isDark ? 'dark' : 'light');
};

// --- FILTRES ---
document.getElementById('filter-toggle').onclick = () => {
    document.getElementById('advanced-filters').classList.toggle('active');
};

// Filtre par prix
document.getElementById('filter-price').oninput = (e) => {
    const maxPrice = parseInt(e.target.value);
    document.getElementById('price-val').textContent = maxPrice.toLocaleString() + " FCFA";
    applyFilters();
};

// Filtre par type et recherche globale
document.getElementById('filter-type').onchange = applyFilters;
document.getElementById('global-search').oninput = applyFilters;

function applyFilters() {
    const maxPrice = parseInt(document.getElementById('filter-price').value);
    const selectedType = document.getElementById('filter-type').value;
    const searchQuery = document.getElementById('global-search').value.toLowerCase();

    const filtered = MOCK_DATA.filter(item => {
        const matchPrice = item.price <= maxPrice;
        const matchType = selectedType === 'all' || item.type === selectedType;
        const matchSearch = item.title.toLowerCase().includes(searchQuery) || 
                            item.loc.toLowerCase().includes(searchQuery);
        
        return matchPrice && matchType && matchSearch;
    });

    render(filtered);
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier le thème sauvegardé
    if (localStorage.getItem('mappiol-theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fa-solid fa-sun'
});