import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const authModal = document.getElementById('auth-modal');
const addModal = document.getElementById('add-modal');

// --- UTILITAIRES ---
const closeAll = () => { authModal.classList.remove('active'); addModal.classList.remove('active'); };
document.querySelectorAll('.close').forEach(btn => btn.onclick = closeAll);

document.getElementById('nav-profile').onclick = () => authModal.classList.add('active');
document.getElementById('nav-add').onclick = () => auth.currentUser ? addModal.classList.add('active') : alert("Connectez-vous !");

// --- AUTHENTIFICATION ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        closeAll();
    } catch (e) {
        try { await createUserWithEmailAndPassword(auth, email, pass); alert("Compte créé !"); } 
        catch (err) { alert(err.message); }
    }
};
document.getElementById('btn-logout').onclick = () => { signOut(auth); location.reload(); };

// --- GESTION DU PROFIL (MODIFICATION) ---
async function checkUserProfile(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const setup = document.getElementById('profile-setup');
    const view = document.getElementById('profile-view');
    if (userDoc.exists()) {
        const d = userDoc.data();
        setup.style.display = 'none'; view.style.display = 'block';
        document.getElementById('display-profile-name').innerText = d.name;
        document.getElementById('display-profile-phone').innerText = d.phone;
        document.getElementById('display-profile-pic').src = d.photo || 'https://via.placeholder.com/100';
        // Pré-remplir les champs pour modification facile
        document.getElementById('profile-name').value = d.name;
        document.getElementById('profile-phone').value = d.phone;
    } else {
        setup.style.display = 'block'; view.style.display = 'none';
    }
}

// Bouton pour ré-afficher le formulaire de modification
window.editProfile = () => {
    document.getElementById('profile-setup').style.display = 'block';
    document.getElementById('profile-view').style.display = 'none';
};

document.getElementById('btn-save-profile').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const file = document.getElementById('profile-pic-input').files[0];
    
    if(!name || !phone) return alert("Nom et Tel requis");
    let photoUrl = document.getElementById('display-profile-pic').src;

    if(file) {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: fd });
        const json = await res.json();
        photoUrl = json.data.url;
    }
    
    await setDoc(doc(db, "users", user.uid), { name, phone, photo: photoUrl }, { merge: true });
    alert("Profil mis à jour !");
    checkUserProfile(user);
};

// --- GESTION DES ANNONCES (SUPPRESSION) ---
window.deleteAd = async (adId) => {
    if(confirm("Voulez-vous vraiment supprimer cette annonce ?")) {
        await deleteDoc(doc(db, "properties", adId));
        alert("Annonce supprimée !");
        load();
    }
};

document.getElementById('save-btn').onclick = async () => {
    const user = auth.currentUser;
    const file = document.getElementById('new-img').files[0];
    const title = document.getElementById('new-title').value;
    const price = document.getElementById('new-price').value;

    if(!file || !title || !price) return alert("Remplissez tout !");

    const btn = document.getElementById('save-btn');
    btn.innerText = "Publication..."; btn.disabled = true;

    try {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: fd });
        const json = await res.json();
        const imgUrl = json.data.url;

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        await addDoc(collection(db, "properties"), {
            title, price: parseInt(price), 
            loc: document.getElementById('new-loc').value, 
            img: imgUrl,
            ownerId: user.uid, // Très important pour savoir qui peut supprimer
            ownerPhone: userData.phone,
            ownerName: userData.name,
            createdAt: new Date()
        });
        location.reload();
    } catch (e) { alert(e.message); btn.disabled = false; }
};

// --- CHARGEMENT ---
async function load() {
    const outlet = document.getElementById('router-outlet');
    outlet.innerHTML = "Chargement...";
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    let html = '<div class="listing-grid">';
    
    snap.forEach(res => {
        const d = res.data();
        const id = res.id;
        const isOwner = auth.currentUser && auth.currentUser.uid === d.ownerId;

        html += `
            <div class="card">
                <img src="${d.img}">
                <div class="card-info">
                    <span class="price-tag">${d.price} FCFA</span>
                    <h3>${d.title}</h3>
                    <p>${d.loc}</p>
                    <div style="display:flex; gap:5px;">
                        <button class="btn" style="background:#25d366; flex:3;" onclick="window.open('https://wa.me/${d.ownerPhone}')">WhatsApp</button>
                        ${isOwner ? `<button class="btn" style="background:#ef4444; flex:1;" onclick="deleteAd('${id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>`;
    });
    outlet.innerHTML = html + '</div>';
}

onAuthStateChanged(auth, user => {
    if(user) {
        document.getElementById('auth-logged-in').style.display='block';
        document.getElementById('auth-logged-out').style.display='none';
        checkUserProfile(user);
    } else {
        document.getElementById('auth-logged-in').style.display='none';
        document.getElementById('auth-logged-out').style.display='block';
    }
    load();
});