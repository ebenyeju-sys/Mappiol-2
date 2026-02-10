import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIGURATION ---
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
const IMGBB_KEY = "6df25977a41981a34341908b9814a09a";

// --- ÉTATS & VARIABLES ---
let currentProperty = null;

// --- GESTION DES OUVERTURES/FERMETURES ---
const ui = {
    modal: (id, action) => document.getElementById(id).classList[action]('active'),
    toast: (msg) => {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.add('active');
        setTimeout(() => t.classList.remove('active'), 3000);
    }
};

// Événements de navigation
document.getElementById('nav-publish').onclick = () => auth.currentUser ? ui.modal('modal-publish-ad', 'add') : ui.modal('modal-auth', 'add');
document.getElementById('nav-wallet').onclick = () => auth.currentUser ? openWallet() : ui.modal('modal-auth', 'add');
document.getElementById('close-publish').onclick = () => ui.modal('modal-publish-ad', 'remove');
document.getElementById('back-to-feed').onclick = () => ui.modal('modal-item-detail', 'remove');
document.getElementById('close-wallet').onclick = () => ui.modal('modal-wallet', 'remove');

// --- LOGIQUE AUTHENTIFICATION ---
document.getElementById('btn-auth-action').onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        location.reload();
    } catch {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
            // Créer le profil initial avec un solde à 0
            await setDoc(doc(db, "users", auth.currentUser.uid), { 
                balance: 0, 
                email: email,
                createdAt: new Date() 
            });
            location.reload();
        } catch (e) { ui.toast("Erreur d'accès"); }
    }
};

// --- LOGIQUE PUBLICATION (LOIER + VISITE) ---
document.getElementById('btn-submit-ad').onclick = async () => {
    const user = auth.currentUser;
    const file = document.getElementById('ad-photos').files[0];
    if(!file) return ui.toast("Photo obligatoire !");

    const btn = document.getElementById('btn-submit-ad');
    btn.innerText = "Mise en ligne..."; btn.disabled = true;

    try {
        // 1. Image vers ImgBB
        const fd = new FormData(); fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {method:"POST", body:fd});
        const imgData = await res.json();

        // 2. Enregistrement Firestore
        await addDoc(collection(db, "properties"), {
            title: document.getElementById('ad-title').value,
            price: parseInt(document.getElementById('ad-price').value),
            visitFee: parseInt(document.getElementById('ad-visit-fee').value) || 0,
            type: document.getElementById('ad-type').value,
            desc: document.getElementById('ad-desc').value,
            img: imgData.data.url,
            ownerId: user.uid,
            rating: 0,
            createdAt: new Date()
        });
        ui.toast("Publié avec succès !");
        location.reload();
    } catch (e) { 
        ui.toast("Erreur de réseau"); 
        btn.disabled = false; btn.innerText = "Réessayer";
    }
};

// --- CHARGEMENT DU FEED ---
async function loadFeed() {
    const feed = document.getElementById('main-feed');
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    
    feed.innerHTML = "";
    snap.forEach(dDoc => {
        const d = dDoc.data();
        const card = document.createElement('div');
        card.className = "card";
        card.innerHTML = `
            <img src="${d.img}">
            <div class="card-info">
                <span class="price-tag">${d.price.toLocaleString()} FCFA</span>
                <h3>${d.title}</h3>
                <p><i class="fa-solid fa-person-walking"></i> Visite : ${d.visitFee} FCFA</p>
            </div>
        `;
        card.onclick = () => openItemDetail(dDoc.id, d);
        feed.appendChild(card);
    });
}

// --- DÉTAILS ET RÉSERVATION DE VISITE ---
function openItemDetail(id, data) {
    currentProperty = {id, ...data};
    document.getElementById('view-img').src = data.img;
    document.getElementById('view-title').innerText = data.title;
    document.getElementById('view-price').innerText = data.price.toLocaleString();
    document.getElementById('view-visit-price').innerText = data.visitFee.toLocaleString();
    document.getElementById('view-desc').innerText = data.desc;
    ui.modal('modal-item-detail', 'add');
}

document.getElementById('btn-book-visit').onclick = () => {
    if(!auth.currentUser) return ui.modal('modal-auth', 'add');
    
    const amount = currentProperty.visitFee;
    const confirmPay = confirm(`Payer ${amount} FCFA pour réserver la visite ?`);
    
    if(confirmPay) {
        processVisitPayment(amount);
    }
};

// --- LOGIQUE FINANCIÈRE (REVENUS) ---
async function processVisitPayment(amount) {
    ui.toast("Traitement Mobile Money...");
    
    setTimeout(async () => {
        // 1. Créer la transaction de visite
        await addDoc(collection(db, "transactions"), {
            propertyId: currentProperty.id,
            ownerId: currentProperty.ownerId,
            clientId: auth.currentUser.uid,
            amount: amount,
            type: "visite",
            status: "terminé",
            createdAt: new Date()
        });

        // 2. Créditer le portefeuille du propriétaire
        const ownerRef = doc(db, "users", currentProperty.ownerId);
        const ownerSnap = await getDoc(ownerRef);
        let newBalance = amount;
        
        if(ownerSnap.exists()) {
            newBalance = (ownerSnap.data().balance || 0) + amount;
        }
        await setDoc(ownerRef, { balance: newBalance }, { merge: true });

        ui.toast("Visite réservée ! Le propriétaire vous contactera.");
    }, 2000);
}

// --- DASHBOARD PORTEFEUILLE ---
async function openWallet() {
    const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const balance = uSnap.exists() ? uSnap.data().balance : 0;
    document.getElementById('wallet-balance').innerText = `${balance.toLocaleString()} FCFA`;
    
    // Charger l'historique
    const q = query(collection(db, "transactions"), 
              where("ownerId", "==", auth.currentUser.uid),
              orderBy("createdAt", "desc"));
    const tSnap = await getDocs(q);
    const list = document.getElementById('transaction-list');
    list.innerHTML = "";
    
    tSnap.forEach(tDoc => {
        const t = tDoc.data();
        list.innerHTML += `
            <div class="transaction-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <span>Visite reçue</span>
                <strong style="color:var(--secondary)">+${t.amount}</strong>
            </div>
        `;
    });
    
    ui.modal('modal-wallet', 'add');
}

// --- DÉMARRAGE ---
onAuthStateChanged(auth, user => {
    loadFeed();
});