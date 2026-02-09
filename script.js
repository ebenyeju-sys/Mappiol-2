import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// --- UI ELEMENTS ---
const authModal = document.getElementById('auth-modal');
const addModal = document.getElementById('add-modal');
let userCoords = null;

// Fermeture simple
document.querySelectorAll('.close').forEach(btn => {
    btn.onclick = () => {
        authModal.classList.remove('active');
        addModal.classList.remove('active');
    };
});

document.getElementById('nav-profile').onclick = () => authModal.classList.add('active');
document.getElementById('nav-add').onclick = () => {
    if(!auth.currentUser) return alert("Connectez-vous pour publier !");
    addModal.classList.add('active');
};

// --- AUTH ---
document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        authModal.classList.remove('active');
    } catch (e) {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (err) { alert("Erreur : " + err.message); }
    }
};

document.getElementById('btn-logout').onclick = () => signOut(auth);

// --- PROFIL ---
async function checkUserProfile(user) {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const setup = document.getElementById('profile-setup');
    const view = document.getElementById('profile-view');
    if (userDoc.exists()) {
        const d = userDoc.data();
        setup.style.display = 'none'; view.style.display = 'block';
        document.getElementById('display-profile-name').innerText = d.name;
        document.getElementById('display-profile-phone').innerText = d.phone;
        document.getElementById('display-profile-pic').src = d.photo || '';
    } else {
        setup.style.display = 'block'; view.style.display = 'none';
    }
}

document.getElementById('btn-save-profile').onclick = async () => {
    const user = auth.currentUser;
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const file = document.getElementById('profile-pic-input').files[0];
    
    let photoUrl = "";
    if(file) {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: fd });
        const json = await res.json();
        photoUrl = json.data.url;
    }
    await setDoc(doc(db, "users", user.uid), { name, phone, photo: photoUrl });
    checkUserProfile(user);
};

// --- PUBLICATION (CORRECTION ERREUR URL) ---
document.getElementById('get-location').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        document.getElementById('new-loc').value = "📍 Position capturée";
    });
};

document.getElementById('save-btn').onclick = async () => {
    const user = auth.currentUser;
    const file = document.getElementById('new-img').files[0];
    const title = document.getElementById('new-title').value;
    const price = document.getElementById('new-price').value;
    const loc = document.getElementById('new-loc').value;

    if(!file || !title || !price) return alert("Photo, titre et prix requis !");

    const btn = document.getElementById('save-btn');
    btn.innerText = "Téléchargement..."; btn.disabled = true;

    try {
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch("https://api.imgbb.com/1/upload?key=6df25977a41981a34341908b9814a09a", { method: "POST", body: fd });
        const json = await res.json();

        // Vérification si ImgBB a bien répondu
        if(!json.success) throw new Error("Erreur ImgBB : " + json.error.message);
        
        const imgUrl = json.data.url;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data() || { name: "Anonyme", phone: "" };

        await addDoc(collection(db, "properties"), {
            title, price: parseInt(price), loc, img: imgUrl,
            ownerPhone: userData.phone,
            ownerName: userData.name,
            coords: userCoords,
            createdAt: new Date()
        });
        location.reload();
    } catch (e) {
        alert("Erreur publication : " + e.message);
        btn.disabled = false; btn.innerText = "Réessayer";
    }
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
        html += `
            <div class="card">
                <img src="${d.img}">
                <div class="card-info">
                    <span class="price-tag">${d.price.toLocaleString()} FCFA</span>
                    <h3>${d.title}</h3>
                    <p>${d.loc}</p>
                    <button class="btn" style="background:#25d366" onclick="window.open('https://wa.me/${d.ownerPhone}')">WhatsApp</button>
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
});

load();