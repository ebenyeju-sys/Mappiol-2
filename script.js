// 1. IMPORTATIONS FIREBASE (Obligatoires au sommet)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, where, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// CONFIGURATION FIREBASE
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "mappiol.firebaseapp.com",
    projectId: "mappiol",
    storageBucket: "mappiol.firebasestorage.app",
    messagingSenderId: "VOTRE_ID",
    appId: "VOTRE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 2. CONFIGURATION DE LA NAVIGATION
const screens = {
    welcome: document.getElementById('welcome-screen'),
    visitor: document.getElementById('visitor-view'),
    ownerAuth: document.getElementById('owner-auth-view'),
    dashboard: document.getElementById('owner-dashboard'),
    publish: document.getElementById('publish-flow')
};

function navigateTo(targetId) {
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
            screen.classList.remove('active');
        }
    });

    const target = screens[targetId];
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 3. ÉVÉNEMENTS DE NAVIGATION
document.getElementById('start-visitor').onclick = () => {
    navigateTo('visitor');
    loadFilteredProperties(); // Charge tout au début
};

document.getElementById('start-owner').onclick = () => {
    if (auth.currentUser) navigateTo('dashboard');
    else navigateTo('ownerAuth');
};

document.getElementById('back-to-welcome').onclick = () => navigateTo('welcome');
document.getElementById('back-from-auth').onclick = () => navigateTo('welcome');
document.getElementById('btn-trigger-publish').onclick = () => navigateTo('publish');
document.getElementById('close-publish').onclick = () => navigateTo('dashboard');

// 4. LOGIQUE DE PUBLICATION (CORRIGÉE)
let currentStep = 1;
const totalSteps = 3;

function moveStep(direction) {
    if (direction === 1 && !validateCurrentStep()) return;
    currentStep += direction;

    document.querySelectorAll('.step-pane').forEach((pane, index) => {
        pane.classList.toggle('active', (index + 1) === currentStep);
    });

    const progressPercent = (currentStep / totalSteps) * 100;
    document.getElementById('publish-progress').style.width = `${progressPercent}%`;
    document.getElementById('current-step-num').innerText = currentStep;

    document.getElementById('btn-prev-step').style.visibility = currentStep > 1 ? 'visible' : 'hidden';
    document.getElementById('btn-next-step').style.display = currentStep === totalSteps ? 'none' : 'block';
    document.getElementById('btn-final-submit').style.display = currentStep === totalSteps ? 'block' : 'none';
}

function validateCurrentStep() {
    if (currentStep === 1) {
        const file = document.getElementById('ad-image').files[0];
        if (!file) { alert("Ajoutez une photo."); return false; }
    }
    return true;
}

document.getElementById('btn-next-step').onclick = () => moveStep(1);
document.getElementById('btn-prev-step').onclick = () => moveStep(-1);

// 5. ENVOI DES DONNÉES ET IMAGE (IMGBB)
document.getElementById('btn-final-submit').onclick = async () => {
    const btn = document.getElementById('btn-final-submit');
    btn.innerText = "En cours...";
    btn.disabled = true;

    try {
        const file = document.getElementById('ad-image').files[0];
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("https://api.imgbb.com/1/upload?key=VOTRE_CLE_IMGBB", {
            method: "POST",
            body: formData
        });
        const imgResult = await response.json();

        await addDoc(collection(db, "properties"), {
            ownerId: auth.currentUser.uid,
            title: "Beau " + document.getElementById('ad-type-select').value,
            city: document.getElementById('ad-city').value.toLowerCase(),
            district: document.getElementById('ad-district').value.toLowerCase(),
            rent: Number(document.getElementById('ad-rent-price').value),
            visitFee: Number(document.getElementById('ad-visit-price').value),
            imageUrl: imgResult.data.url,
            createdAt: new Date()
        });

        alert("Annonce publiée !");
        location.reload();
    } catch (e) {
        alert("Erreur de connexion.");
        btn.disabled = false;
    }
};

// 6. VALIDATION DU CODE ET DASHBOARD
window.validateVisitCode = async function() {
    const code = document.getElementById('input-visit-code').value;
    if (!code) return;

    // Simulation de succès pour le test (à lier à ta collection transactions)
    showValidationSuccess(2000);
    // Ici : ajouter ta logique de transaction Firestore
}

function showValidationSuccess(amount) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.cssText = "position:fixed; top:20px; right:20px; background:var(--gold); color:white; padding:20px; border-radius:15px; z-index:9999;";
    toast.innerHTML = `<strong>+ ${amount} FCFA</strong> ajoutés !`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 7. SURVEILLANCE CONNEXION
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            document.getElementById('total-balance').innerText = (userSnap.data().balance || 0).toLocaleString();
        }
        navigateTo('dashboard');
    } else {
        navigateTo('welcome');
    }
});