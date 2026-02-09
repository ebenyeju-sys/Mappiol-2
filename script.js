import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- CONFIGURATION FIREBASE (Tes clés Mappiol) ---
const firebaseConfig = {
    apiKey: "AIzaSyBfhlCUVHIH5S0xFZgl74srQv0qGKx60Zo",
    authDomain: "mappiol.firebaseapp.com",
    projectId: "mappiol",
    storageBucket: "mappiol.firebasestorage.app",
    messagingSenderId: "316903605477",
    appId: "1:316903605477:web:c922f5dd7a37a45567000c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- GESTION DES MODALES ---
const authModal = document.getElementById('auth-modal');
const addModal = document.getElementById('add-modal');

const openModal = (m) => m.classList.add('active');
const closeModal = (m) => m.classList.remove('active');

document.getElementById('nav-profile').onclick = () => openModal(authModal);
document.getElementById('nav-add').onclick = () => openModal(addModal);
document.getElementById('close-auth').onclick = () => closeModal(authModal);
document.getElementById('close-add').onclick = () => closeModal(addModal);

// --- AUTHENTIFICATION : CONNEXION & INSCRIPTION ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;

    if (!email || pass.length < 6) return alert("Email valide et 6 caractères min requis.");

    try {
        // Tentative de connexion
        await signInWithEmailAndPassword(auth, email, pass);
        closeModal(authModal);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // Si l'utilisateur n'existe pas, on le crée
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                alert("Compte créé ! Veuillez maintenant compléter votre profil.");
            } catch (e) { alert("Erreur d'inscription : " + e.message); }
        } else {
            alert("Erreur : " + error.message);
        }
    }
};

// --- MOT DE PASSE OUBLIÉ ---
const mainAuthForm = document.getElementById('auth-main-form');
const forgotForm = document.getElementById('auth-forgot-form');

document.getElementById('link-forgot-pw').onclick = (e) => {
    e.preventDefault();
    mainAuthForm.style.display = 'none';
    forgotForm.style.display = 'block';
};

document.getElementById('link-back-login').onclick = (e) => {
    e.preventDefault();
    forgotForm.style.display = 'none';
    mainAuthForm.style.display = 'block';
};

document.getElementById('btn-send-reset').onclick = async () => {
    const email = document.getElementById('reset-email').value;
    if (!email) return alert("Entrez votre email.");
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Lien de réinitialisation envoyé par email !");
        forgotForm.style.display = 'none';
        mainAuthForm.style.display = 'block';
    } catch (e) { alert("Erreur : " + e.message); }
};

// --- GESTION DU PROFIL UTILISATEUR ---
async function checkUserProfile(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const setupDiv = document.getElementById('profile-setup');
    const viewDiv = document.getElementById('profile-view');

    if (userDoc.exists()) {
        const data = userDoc.data();
        setupDiv.style.display = 'none';
        viewDiv.style.display = 'block';
        document.getElementById('display-profile-name').innerText = data.name;
        document.getElementById('display-profile-phone').innerText = data.phone;
        document.getElementById('display-profile-pic').src = data.photo || 'https://via.placeholder.com/100';
    } else {
        setupDiv.style.display = 'block';
        viewDiv.style.display = 'none';
    }
}

document.getElementById('btn-save-profile').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const file = document.getElementById('profile-pic-input').files[0];

    if (!name || !phone) return alert("Nom et téléphone obligatoires.");

    try {
        let photoUrl = "";
        if (file) {
            const picRef = ref(storage, `profiles/${user.uid}`);
            await uploadBytes(picRef, file);
            photoUrl = await getDownloadURL(picRef);
        }

        await setDoc(doc(db, "users", user.uid), {
            name, phone, photo: photoUrl, email: user.email, uid: user.uid
        });

        alert("Profil enregistré !");
        checkUserProfile(user);
    } catch (e) { alert("Erreur profil : " + e.message); }
};

// --- ÉTAT DE CONNEXION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-logged-out').style.display = 'none';
        document.getElementById('auth-logged-in').style.display = 'block';
        checkUserProfile(user);
    } else {
        document.getElementById('auth-logged-out').style.display = 'block';
        document.getElementById('auth-logged-in').style.display = 'none';
    }
});

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- MODE SOMBRE ---
document.getElementById('theme-btn').onclick = () => {
    document.body.classList.toggle('dark-mode');
};
// --- VARIABLES GLOBALES POUR LA PARTIE 2 ---
let userCoords = null;
let currentPropertyId = null;

// --- GÉOLOCALISATION GPS ---
document.getElementById('get-location').onclick = () => {
    if (navigator.geolocation) {
        const btn = document.getElementById('get-location');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                document.getElementById('new-loc').value = "📍 Position GPS capturée";
                btn.innerHTML = '<i class="fa-solid fa-check"></i>';
                btn.style.background = "#22c55e";
            },
            () => { 
                alert("Impossible de récupérer la position. Activez le GPS.");
                btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';
            }
        );
    }
};

// --- PUBLIER UNE ANNONCE ---
document.getElementById('save-btn').onclick = async () => {
    const user = auth.currentUser;
    const file = document.getElementById('new-img').files[0];
    const title = document.getElementById('new-title').value;
    const price = document.getElementById('new-price').value;
    const loc = document.getElementById('new-loc').value;
    const type = document.getElementById('new-type').value;

    if (!user) return alert("Connectez-vous pour publier.");
    if (!file || !title || !price) return alert("Photo, titre et prix requis !");

    const btn = document.getElementById('save-btn');
    btn.innerText = "Mise en ligne...";
    btn.disabled = true;

    try {
        // 1. Upload de l'image de la maison
        const imgRef = ref(storage, `houses/${Date.now()}_${file.name}`);
        await uploadBytes(imgRef, file);
        const imgUrl = await getDownloadURL(imgRef);

        // 2. Récupérer les infos de l'auteur (Propriétaire)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : { name: "Agent Mappiol", phone: "237..." };

        // 3. Enregistrer dans Firestore
        await addDoc(collection(db, "properties"), {
            title, price: parseInt(price), loc, type,
            img: imgUrl,
            coords: userCoords,
            ownerId: user.uid,
            ownerName: userData.name,
            ownerPhone: userData.phone,
            createdAt: new Date()
        });

        alert("Annonce publiée avec succès !");
        location.reload(); // Rafraîchir pour voir la nouvelle annonce
    } catch (e) {
        alert("Erreur publication : " + e.message);
        btn.innerText = "Réessayer";
        btn.disabled = false;
    }
};

// --- CHARGER ET AFFICHER LES ANNONCES ---
async function loadProperties(filterFavs = false, searchQuery = "") {
    const outlet = document.getElementById('router-outlet');
    outlet.innerHTML = '<p style="text-align:center; padding:50px;">Chargement des offres...</p>';
    
    let docs;
    const user = auth.currentUser;

    try {
        if (filterFavs && user) {
            const q = query(collection(db, "favorites"), where("userId", "==", user.uid));
            docs = await getDocs(q);
        } else {
            const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
            docs = await getDocs(q);
        }

        let html = `<h2 style="padding:10px;">${filterFavs ? 'Mes Favoris ❤️' : 'Annonces Récentes'}</h2>`;
        html += '<div class="listing-grid" style="display:grid; gap:15px;">';
        
        docs.forEach(res => {
            const d = res.data();
            const id = res.id;
            
            // Filtrage par recherche (quartier)
            if (searchQuery && !d.loc.toLowerCase().includes(searchQuery.toLowerCase())) return;

            const mapUrl = d.coords ? `https://www.google.com/maps?q=${d.coords.lat},${d.coords.lng}` : '#';
            const whatsappMsg = encodeURIComponent(`Bonjour ${d.ownerName}, je suis intéressé par votre annonce "${d.title}" sur Mappiol.`);

            html += `
                <div class="card">
                    <img src="${d.img}">
                    <button class="fav-btn" onclick="toggleFavorite('${id}', ${JSON.stringify(d).replace(/"/g, '&quot;')})">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                    <div class="card-info">
                        <span class="price-tag">${d.price.toLocaleString()} FCFA</span>
                        <h3 class="card-title">${d.title}</h3>
                        <p class="card-loc"><i class="fa-solid fa-location-dot"></i> ${d.loc}</p>
                        <div style="display:flex; gap:10px; margin-top:15px;">
                            <button class="btn" onclick="openComments('${id}')" style="background:var(--txt-muted); flex:1;">
                                <i class="fa-solid fa-comment"></i> Avis
                            </button>
                            <a href="https://wa.me/${d.ownerPhone}?text=${whatsappMsg}" class="btn" style="background:#25d366; flex:2; text-decoration:none; text-align:center;">
                                <i class="fa-brands fa-whatsapp"></i> WhatsApp
                            </a>
                        </div>
                        ${d.coords ? `<a href="${mapUrl}" target="_blank" style="display:block; margin-top:10px; font-size:12px; color:var(--primary); text-align:center;">Voir sur la carte 📍</a>` : ''}
                    </div>
                </div>`;
        });
        outlet.innerHTML = html + '</div>';
    } catch (e) { outlet.innerHTML = "<p>Erreur de chargement.</p>"; }
}

// --- GÉRER LES FAVORIS ---
window.toggleFavorite = async (propId, data) => {
    const user = auth.currentUser;
    if (!user) return alert("Connectez-vous pour ajouter en favoris.");
    
    const favRef = collection(db, "favorites");
    const q = query(favRef, where("userId", "==", user.uid), where("propertyId", "==", propId));
    const snap = await getDocs(q);

    if (snap.empty) {
        await addDoc(favRef, { userId: user.uid, propertyId: propId, ...data });
        alert("Ajouté aux favoris ❤️");
    } else {
        snap.forEach(async (d) => await deleteDoc(doc(db, "favorites", d.id)));
        alert("Retiré des favoris.");
    }
};

// --- GÉRER LES COMMENTAIRES ---
window.openComments = async (propId) => {
    currentPropertyId = propId;
    document.getElementById('comment-modal').classList.add('active');
    const area = document.getElementById('comments-display-area');
    area.innerHTML = "Chargement...";

    const q = query(collection(db, "comments"), where("propertyId", "==", propId), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    
    let html = "";
    snap.forEach(res => {
        const c = res.data();
        html += `
            <div style="margin-bottom:15px; background:var(--bg); padding:10px; border-radius:10px;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:5px;">
                    <img src="${c.userPhoto || 'https://via.placeholder.com/30'}" style="width:25px; height:25px; border-radius:50%;">
                    <strong style="font-size:13px;">${c.userName}</strong>
                </div>
                <p style="font-size:14px; margin-left:35px;">${c.text}</p>
            </div>`;
    });
    area.innerHTML = html || "<p>Aucun commentaire.</p>";
};

document.getElementById('btn-post-comment').onclick = async () => {
    const user = auth.currentUser;
    const text = document.getElementById('new-comment-text').value;
    if (!user || !text) return alert("Connectez-vous et écrivez un message.");

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    await addDoc(collection(db, "comments"), {
        propertyId: currentPropertyId,
        userName: userData.name,
        userPhoto: userData.photo,
        text,
        createdAt: new Date()
    });

    document.getElementById('new-comment-text').value = "";
    openComments(currentPropertyId);
};

// --- RECHERCHE & NAVIGATION ---
document.getElementById('search-input').oninput = (e) => {
    loadProperties(false, e.target.value);
};

document.getElementById('nav-home').onclick = () => loadProperties();
document.getElementById('btn-show-favs').onclick = () => {
    closeModal(authModal);
    loadProperties(true);
};
document.getElementById('close-comment').onclick = () => {
    document.getElementById('comment-modal').classList.remove('active');
};

// Lancement initial
loadProperties();