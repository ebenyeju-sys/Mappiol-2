// --- INITIALISATION DES SERVICES ---
const auth = window.auth;
const db = window.db;

// --- GESTION DES ÉCRANS ---
const screens = {
    landing: document.getElementById('landing-screen'),
    visitor: document.getElementById('visitor-screen'),
    auth: document.getElementById('auth-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    publish: document.getElementById('modal-publish'),
    validate: document.getElementById('modal-validate')
};

/**
 * Navigue entre les écrans principaux avec fluidité
 */
function navigateTo(screenId) {
    // On cache tous les écrans principaux
    [screens.landing, screens.visitor, screens.auth, screens.dashboard].forEach(s => {
        s.classList.remove('active-screen');
        s.style.display = 'none';
    });

    // On affiche l'écran cible
    const target = screens[screenId];
    target.style.display = 'flex';
    setTimeout(() => {
        target.classList.add('active-screen');
    }, 10);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ÉVÉNEMENTS DE NAVIGATION ---
document.getElementById('btn-enter-visitor').onclick = () => navigateTo('visitor');
document.getElementById('btn-enter-owner').onclick = () => {
    // Si déjà connecté, go dashboard, sinon auth
    auth.currentUser ? navigateTo('dashboard') : navigateTo('auth');
};

document.getElementById('back-visitor').onclick = () => navigateTo('landing');
document.getElementById('back-auth').onclick = () => navigateTo('landing');

/**
 * Affiche un message élégant à l'utilisateur
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Disparition après 3.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

let isSignUpMode = false;

// Basculer entre Connexion et Inscription
document.getElementById('btn-toggle-signup').onclick = function() {
    isSignUpMode = !isSignUpMode;
    const title = document.querySelector('.auth-header-text h2');
    const btn = document.getElementById('btn-auth-action');
    
    title.innerText = isSignUpMode ? "Créer un compte" : "Bienvenue";
    btn.innerText = isSignUpMode ? "S'inscrire" : "Se connecter";
    this.innerText = isSignUpMode ? "Se connecter" : "Créer un compte";
};

// Soumission du formulaire
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const loader = document.getElementById('loading-overlay');

    loader.style.display = 'flex';

    try {
        if (isSignUpMode) {
            await window.firebaseAuth.createUserWithEmailAndPassword(auth, email, pass);
            showNotification("Compte créé avec succès !", "success");
        } else {
            await window.firebaseAuth.signInWithEmailAndPassword(auth, email, pass);
            showNotification("Heureux de vous revoir", "success");
        }
    } catch (error) {
        console.error(error);
        showNotification("Erreur : " + error.message, "error");
    } finally {
        loader.style.display = 'none';
    }
};

// Déconnexion
document.getElementById('btn-logout').onclick = () => {
    window.firebaseAuth.signOut(auth).then(() => {
        showNotification("Déconnecté");
        navigateTo('landing');
    });
};

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('dashboard-username').innerText = user.email.split('@')[0];
        // Charger les données du propriétaire ici
        loadOwnerData(user.uid);
        if(screens.auth.classList.contains('active-screen')) {
            navigateTo('dashboard');
        }
    } else {
        // Optionnel : redirection si on tente d'accéder au dashboard sans être connecté
    }
});

// --- FONCTIONS UTILITAIRES DES MODALES ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Empêche le défilement en arrière-plan
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Si c'est la modale de publication, on reset le formulaire
    if(modalId === 'modal-publish') {
        document.getElementById('upload-preview-area').innerHTML = '<i class="fa-solid fa-camera"></i><span>Ajouter une photo</span>';
        // Reset des autres champs si nécessaire
    }
}

// Liaisons des boutons
document.getElementById('btn-open-add-modal').onclick = () => openModal('modal-publish');
document.getElementById('close-publish').onclick = () => closeModal('modal-publish');
document.getElementById('btn-open-scan-modal').onclick = () => openModal('modal-validate');
document.getElementById('close-validate').onclick = () => closeModal('modal-validate');

document.getElementById('new-prop-image').onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const previewArea = document.getElementById('upload-preview-area');
            previewArea.innerHTML = `<img src="${event.target.result}" class="preview-img">`;
        };
        reader.readAsDataURL(file);
    }
};

import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

document.getElementById('btn-confirm-publish').onclick = async () => {
    const user = auth.currentUser;
    if (!user) return showNotification("Veuillez vous connecter", "error");

    // Récupération des données
    const type = document.getElementById('new-prop-type').value;
    const city = document.getElementById('new-prop-city').value;
    const district = document.getElementById('new-prop-district').value;
    const rent = document.getElementById('new-prop-rent').value;
    const fees = document.getElementById('new-prop-fees').value;

    // Validation simple
    if (!city || !district || !rent || !fees) {
        return showNotification("Veuillez remplir tous les champs", "error");
    }

    const loader = document.getElementById('loading-overlay');
    loader.style.display = 'flex';

    try {
        // Pour le moment, nous utilisons une image de remplacement 
        // En attendant l'étape d'upload vers un serveur d'images (Cloud Storage ou ImgBB)
        const placeholderImg = "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80";

        await addDoc(collection(db, "properties"), {
            ownerId: user.uid,
            ownerEmail: user.email,
            type: type,
            city: city.toLowerCase(),
            district: district.toLowerCase(),
            rent: Number(rent),
            visitFee: Number(fees),
            imageUrl: placeholderImg,
            createdAt: serverTimestamp()
        });

        showNotification("Annonce publiée avec succès !", "success");
        closeModal('modal-publish');
        loadOwnerProperties(user.uid); // Rafraîchit la liste du proprio

    } catch (error) {
        console.error(error);
        showNotification("Erreur lors de la publication", "error");
    } finally {
        loader.style.display = 'none';
    }
};

import { getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

async function loadAllProperties() {
    const feed = document.getElementById('visitor-feed');
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    
    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            feed.innerHTML = '<p class="empty-msg">Aucun bien disponible pour le moment.</p>';
            return;
        }

        feed.innerHTML = ""; // Nettoie le feed
        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = `
                <div class="card-media">
                    <img src="${p.imageUrl}" alt="Bien">
                    <div class="visit-badge">${p.visitFee.toLocaleString()} FCFA / Visite</div>
                </div>
                <div class="card-info">
                    <span class="prop-type-tag">${p.type}</span>
                    <div class="card-header-info">
                        <h3 class="prop-title">${p.district}</h3>
                        <div class="prop-rent">
                            <div class="rent-value">${p.rent.toLocaleString()}</div>
                            <div class="rent-unit">FCFA / mois</div>
                        </div>
                    </div>
                    <p class="prop-location"><i class="fa-solid fa-location-dot"></i> ${p.city}</p>
                </div>
            `;
            feed.appendChild(card);
        });
    } catch (error) {
        showNotification("Erreur de chargement des biens", "error");
    }
}

import { where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Variable pour stocker les biens localement et éviter de recharger Firebase sans arrêt
let allPropertiesCache = [];

/**
 * Filtre les biens en fonction de la saisie et de la puce sélectionnée
 */
function filterProperties() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const activeFilter = document.querySelector('.filter-chip.active').dataset.type;
    const feed = document.getElementById('visitor-feed');

    const filtered = allPropertiesCache.filter(p => {
        const matchesSearch = p.city.includes(searchTerm) || p.district.includes(searchTerm);
        const matchesType = (activeFilter === 'all') || (p.type === activeFilter);
        return matchesSearch && matchesType;
    });

    renderFeed(filtered);
}

/**
 * Affiche les cartes dans le feed (optimisé)
 */
function renderFeed(properties) {
    const feed = document.getElementById('visitor-feed');
    feed.innerHTML = "";

    if (properties.length === 0) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>Aucun résultat pour cette recherche.</p>
            </div>`;
        return;
    }

    properties.forEach(p => {
        const card = document.createElement('div');
        card.className = 'property-card';
        card.innerHTML = `
            <div class="card-media">
                <img src="${p.imageUrl}" alt="Bien">
                <div class="visit-badge">${p.visitFee.toLocaleString()} FCFA / Visite</div>
            </div>
            <div class="card-info">
                <span class="prop-type-tag">${p.type}</span>
                <div class="card-header-info">
                    <h3 class="prop-title">${p.district}</h3>
                    <div class="prop-rent">
                        <div class="rent-value">${p.rent.toLocaleString()}</div>
                        <div class="rent-unit">FCFA / mois</div>
                    </div>
                </div>
                <p class="prop-location"><i class="fa-solid fa-location-dot"></i> ${p.city}</p>
            </div>
        `;
        feed.appendChild(card);
    });
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS (RECHERCHE) ---

// Saisie dans la barre de recherche
document.getElementById('search-input').oninput = filterProperties;

// Clic sur les puces (Filtres)
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.onclick = function() {
        document.querySelector('.filter-chip.active').classList.remove('active');
        this.classList.add('active');
        filterProperties();
    };
});

async function loadOwnerData(uid) {
    const q = query(collection(db, "properties"), where("ownerId", "==", uid));
    
    try {
        const snapshot = await getDocs(q);
        const count = snapshot.size; // Nombre de documents
        
        // Mise à jour de l'affichage
        document.getElementById('stat-ads-count').innerText = count;
        
        // On pourrait aussi charger la liste spécifique ici
        renderOwnerProperties(snapshot);
    } catch (error) {
        console.error("Erreur stats:", error);
    }
}