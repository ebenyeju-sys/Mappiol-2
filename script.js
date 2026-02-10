import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// TA CONFIGURATION FIREBASE
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

// ELEMENTS
const outlet = document.getElementById('router-outlet');
const addModal = document.getElementById('add-modal');
const authModal = document.getElementById('auth-modal');

// 1. SURVEILLER LA CONNEXION
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-logged-out').style.display = 'none';
        document.getElementById('auth-logged-in').style.display = 'block';
        document.getElementById('user-display-email').innerText = user.email;
    } else {
        document.getElementById('auth-logged-out').style.display = 'block';
        document.getElementById('auth-logged-in').style.display = 'none';
    }
});

// 2. CHARGER LES ANNONCES
async function load() {
    outlet.innerHTML = '<p style="text-align:center; padding:50px;">Chargement des offres...</p>';
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    let html = '<div class="listing-grid">';
    snap.forEach(doc => {
        const d = doc.data();
        html += `
            <div class="card">
                <img src="${d.img || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600'}">
                <div class="card-info">
                    <span class="price-tag">${parseInt(d.price).toLocaleString()} FCFA</span>
                    <h3 class="card-title">${d.title}</h3>
                    <p class="card-loc"><i class="fa-solid fa-location-dot"></i> ${d.loc} • ${d.type}</p>
                </div>
            </div>`;
    });
    outlet.innerHTML = html + '</div>';
}

// 3. PUBLIER (AVEC VÉRIFICATION)
document.getElementById('save-btn').onclick = async () => {
    const user = auth.currentUser;
    if(!user) return alert("Connectez-vous d'abord !");

    const t = document.getElementById('new-title').value;
    const p = parseInt(document.getElementById('new-price').value);
    const l = document.getElementById('new-loc').value;
    const ty = document.getElementById('new-type').value;

    if(!t || !p || !l) return alert("Remplissez tout !");
    if(p < 10000) return alert("Le prix minimal est de 10 000 FCFA");

    await addDoc(collection(db, "properties"), {
        title: t, price: p, loc: l, type: ty, 
        owner: user.uid, createdAt: new Date()
    });
    location.reload();
};

// 4. CONNEXION / INSCRIPTION
document.getElementById('btn-login').onclick = async () => {
    const e = document.getElementById('auth-email').value;
    const p = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, e, p);
        authModal.classList.remove('active');
    } catch {
        try {
            await createUserWithEmailAndPassword(auth, e, p);
            authModal.classList.remove('active');
        } catch (err) { alert("Erreur d'authentification"); }
    }
};

// ACTIONS BOUTONS
document.getElementById('btn-logout').onclick = () => signOut(auth);
document.getElementById('nav-add').onclick = () => addModal.classList.add('active');
document.getElementById('nav-profile').onclick = () => authModal.classList.add('active');
document.getElementById('close-add').onclick = () => addModal.classList.remove('active');
document.getElementById('close-auth').onclick = () => authModal.classList.remove('active');
document.getElementById('theme-btn').onclick = () => document.body.classList.toggle('dark-mode');
document.getElementById('nav-home').onclick = () => location.reload();

load();