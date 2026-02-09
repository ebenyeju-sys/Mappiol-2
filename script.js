import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURATION FIREBASE ---
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

// --- ELEMENTS UI ---
const authModal = document.getElementById('auth-modal');
const addModal = document.getElementById('add-modal');
const commentModal = document.getElementById('comment-modal');
let userCoords = null;
let currentPropertyId = null;

// Gestion de la fermeture des modales
document.querySelectorAll('.close').forEach(btn => {
    btn.onclick = () => {
        authModal.classList.remove('active');
        addModal.classList.remove('active');
        commentModal.classList.remove('active');
    };
});

// Barre de navigation
document.getElementById('nav-profile').onclick = () => authModal.classList.add('active');
document.getElementById('nav-add').onclick = () => {
    if(!auth.currentUser) return alert("Connectez-vous pour publier !");
    addModal.classList.add('active');
};
document.getElementById('nav-home').onclick = () => load();

// --- 1. AUTHENTIFICATION & RÉCUPÉRATION ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        authModal.classList.remove('active');
    } catch (e) {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            alert("Compte créé ! Complétez votre profil maintenant.");
        } catch (err) { alert("Erreur : " + err.message); }
    }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

document.getElementById('btn-send-reset').onclick = async () => {
    const email = document.getElementById('reset-email').value;
    if(!email) return alert("Entrez votre email");
    await sendPasswordResetEmail(auth, email);
    alert("Lien de réinitialisation envoyé par email !");
};

// --- 2. GESTION DU PROFIL (Lien direct Propriétaire) ---
async function checkUserProfile(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const setup = document.getElementById('profile-setup');
    const view = document.getElementById('profile-view');

    if (userDoc.exists()) {
        const d = userDoc.data();
        setup.style.display = 'none';
        view.style.display = 'block';
        document.getElementById('display-profile-name').innerText = d.name;
        document.getElementById('display-profile-phone').innerText = d.phone;
        document.getElementById('display-profile-pic').src = d.photo || 'https://via.placeholder.com/100';
    } else {
        setup.style.display = 'block';
        view.style.display = 'none';
    }
}

document.getElementById('btn-save-profile').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const file = document.getElementById('profile-pic-input').files[0];
    
    if(!name || !phone) return alert("Nom et numéro WhatsApp requis !");

    let photoUrl = "";
    if(file) {
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: formData });
        const json = await res.json();
        photoUrl = json.data.url;
    }
    await setDoc(doc(db, "users", user.uid), { name, phone, photo: photoUrl, uid: user.uid });
    checkUserProfile(user);
};

// --- 3. PUBLICATION (Chaque annonce garde le numéro de son auteur) ---
document.getElementById('get-location').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById('new-loc').value = "📍 GPS activé";
    }, () => alert("Activez la localisation GPS"));
};

document.getElementById('save-btn').onclick = async () => {
    const user = auth.currentUser;
    const file = document.getElementById('new-img').files[0];
    const title = document.getElementById('new-title').value;
    const price = document.getElementById('new-price').value;
    const loc = document.getElementById('new-loc').value;

    if(!file || !title || !price) return alert("Ajoutez une photo, un titre et un prix");

    const btn = document.getElementById('save-btn');
    btn.innerText = "Téléchargement de l'image...";
    btn.disabled = true;

    try {
        // Envoi vers ImgBB
        const formData = new FormData();
        formData.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: formData });
        const json = await res.json();
        const imgUrl = json.data.url;

        // On récupère les infos de l'utilisateur actuel pour lier son Tel à l'annonce
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        await addDoc(collection(db, "properties"), {
            title, price: parseInt(price), loc, img: imgUrl,
            ownerPhone: userData.phone, // Numéro de l'utilisateur qui publie
            ownerName: userData.name,
            coords: userCoords,
            createdAt: new Date()
        });
        location.reload();
    } catch (e) {
        alert("Erreur lors de la publication : " + e.message);
        btn.disabled = false;
        btn.innerText = "Réessayer";
    }
};

// --- 4. AFFICHAGE DES ANNONCES ---
async function load(searchQuery = "") {
    const outlet = document.getElementById('router-outlet');
    outlet.innerHTML = "<p style='text-align:center; padding:20px;'>Chargement des annonces...</p>";
    
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    let html = '<div class="listing-grid">';
    snap.forEach(res => {
        const d = res.data();
        if (searchQuery && !d.loc.toLowerCase().includes(searchQuery.toLowerCase())) return;
        
        const mapLink = d.coords ? `https://www.google.com/maps?q=${d.coords.lat},${d.coords.lng}` : "#";
        
        html += `
            <div class="card">
                <img src="${d.img}">
                <div class="card-info">
                    <span class="price-tag">${d.price.toLocaleString()} FCFA</span>
                    <h3>${d.title}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${d.loc}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn" style="background:#25d366" onclick="window.open('https://wa.me/${d.ownerPhone}')">
                            <i class="fa-brands fa-whatsapp"></i> WhatsApp
                        </button>
                        ${d.coords ? `<button class="btn" style="background:#4285F4" onclick="window.open('${mapLink}')">📍 GPS</button>` : ''}
                    </div>
                </div>
            </div>`;
    });
    outlet.innerHTML = html + '</div>';
}

// --- INITIALISATION AU CHARGEMENT ---
onAuthStateChanged(auth, user => {
    if(user) {
        document.getElementById('auth-logged-in').style.display='block';
        document.getElementById('auth-logged-out').style.display='none';
        checkUserProfile(user);
    } else {
        document.getElementById('auth-logged-in').style.display='none';
        document.getElementById('auth-logged-out').style.display='block';
    }
});

document.getElementById('search-input').oninput = (e) => load(e.target.value);
document.getElementById('theme-btn').onclick = () => document.body.classList.toggle('dark-mode');

load();