// --- CONFIGURATION DE LA NAVIGATION ---

const screens = {
    welcome: document.getElementById('welcome-screen'),
    visitor: document.getElementById('visitor-view'),
    ownerAuth: document.getElementById('owner-auth-view'),
    dashboard: document.getElementById('owner-dashboard'),
    publish: document.getElementById('publish-flow')
};

/**
 * Fonction de transition fluide entre les écrans
 * @param {string} targetId - L'identifiant de l'écran cible
 */
function navigateTo(targetId) {
    // 1. Cacher tous les écrans avec une petite transition sortante
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
            screen.classList.remove('active');
        }
    });

    // 2. Afficher l'écran cible
    const target = screens[targetId];
    if (target) {
        target.style.display = 'block';
        // On laisse un micro-délai pour que le navigateur capte le changement de display
        // avant de déclencher l'animation CSS fadeIn
        setTimeout(() => {
            target.classList.add('active');
        }, 10);
    }
    
    // 3. Remonter en haut de page automatiquement
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// --- ÉVÉNEMENTS DE L'ÉCRAN D'ACCUEIL ---

// Passage au flux Visiteur
document.getElementById('start-visitor').onclick = () => {
    navigateTo('visitor');
    // Ici, on lancera plus tard le chargement des données Firebase
};

// Passage au flux Propriétaire (avec vérification)
document.getElementById('start-owner').onclick = () => {
    // Simulation : si l'utilisateur n'est pas connecté
    navigateTo('ownerAuth');
};

// --- BOUTONS RETOUR (L'expérience utilisateur aérée) ---

document.getElementById('back-to-welcome').onclick = () => {
    navigateTo('welcome');
};

document.getElementById('back-from-auth').onclick = () => {
    navigateTo('welcome');
};
// --- LOGIQUE DE RECHERCHE ET FILTRAGE ---

/**
 * Charge les biens immobiliers en fonction des filtres
 * @param {string} city - La ville recherchée
 * @param {string} district - Le quartier recherché
 */
async function loadFilteredProperties(city = '', district = '') {
    const feed = document.getElementById('feed-container');
    
    // 1. État de chargement aéré (Squelette ou message simple)
    feed.innerHTML = '<div class="loading-state">Recherche des meilleurs biens...</div>';

    try {
        let q = collection(db, "properties");

        // Construction de la requête Firebase selon les entrées
        if (city || district) {
            if (city && district) {
                q = query(q, where("city", "==", city.toLowerCase()), where("district", "==", district.toLowerCase()));
            } else if (city) {
                q = query(q, where("city", "==", city.toLowerCase()));
            } else {
                q = query(q, where("district", "==", district.toLowerCase()));
            }
        } else {
            // Par défaut, on montre les plus récents
            q = query(q, orderBy("createdAt", "desc"));
        }

        const querySnapshot = await getDocs(q);
        renderProperties(querySnapshot);

    } catch (error) {
        console.error("Erreur de chargement:", error);
        feed.innerHTML = '<div class="error-msg">Une erreur est survenue. Réessayez.</div>';
    }
}
/**
 * Affiche les cartes avec un effet de cascade
 */
function renderProperties(snapshot) {
    const feed = document.getElementById('feed-container');
    feed.innerHTML = ""; // On vide l'écran

    if (snapshot.empty) {
        feed.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-map-pin"></i>
                <p>Aucun bien trouvé dans cette zone.</p>
            </div>`;
        return;
    }

    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const card = document.createElement('div');
        card.className = 'property-card';
        card.style.animationDelay = `${index * 0.1}s`; // Effet cascade

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${data.imageUrl}" alt="${data.title}" class="card-img" loading="lazy">
                <span class="price-visit">${data.visitFee.toLocaleString()} FCFA / Visite</span>
            </div>
            <div class="card-content">
                <div class="card-location">
                    <i class="fa-solid fa-location-dot"></i> ${data.city}, ${data.district}
                </div>
                <div class="card-footer-prices">
                    <h3 class="card-title">${data.title}</h3>
                    <div class="price-rent">
                        <span class="amount">${data.rent.toLocaleString()}</span> <small>FCFA/mois</small>
                    </div>
                </div>
            </div>
        `;
        
        card.onclick = () => openPropertyDetails(doc.id, data);
        feed.appendChild(card);
    });
}// --- LOGIQUE DU FORMULAIRE DE PUBLICATION ---

let currentStep = 1;
const totalSteps = 3;

/**
 * Gère la progression dans le formulaire de publication
 * @param {number} direction - 1 pour Suivant, -1 pour Précédent
 */
function moveStep(direction) {
    // 1. Validation simple avant de passer à la suite
    if (direction === 1 && !validateCurrentStep()) return;

    // 2. Mise à jour de l'index
    currentStep += direction;

    // 3. Affichage du bon panneau
    document.querySelectorAll('.step-pane').forEach((pane, index) => {
        pane.classList.toggle('active', (index + 1) === currentStep);
    });

    // 4. Mise à jour de la barre de progression et des indicateurs
    const progressPercent = (currentStep / totalSteps) * 100;
    document.getElementById('publish-progress').style.width = `${progressPercent}%`;
    document.getElementById('current-step-num').innerText = currentStep;

    // 5. Gestion des boutons (Afficher/Cacher)
    document.getElementById('btn-prev-step').style.visibility = currentStep > 1 ? 'visible' : 'hidden';
    
    if (currentStep === totalSteps) {
        document.getElementById('btn-next-step').style.display = 'none';
        document.getElementById('btn-final-submit').style.display = 'block';
    } else {
        document.getElementById('btn-next-step').style.display = 'block';
        document.getElementById('btn-final-submit').style.display = 'none';
    }
}

// Validation basique pour ne pas laisser de champs vides
function validateCurrentStep() {
    if (currentStep === 1) {
        const file = document.getElementById('ad-image').files[0];
        if (!file) { alert("Veuillez sélectionner une photo."); return false; }
    }
    if (currentStep === 2) {
        const city = document.getElementById('ad-city').value;
        const district = document.getElementById('ad-district').value;
        if (!city || !district) { alert("La ville et le quartier sont requis."); return false; }
    }
    return true;
}

// Liaison des boutons
document.getElementById('btn-next-step').onclick = () => moveStep(1);
document.getElementById('btn-prev-step').onclick = () => moveStep(-1);
// --- GESTION DE L'IMAGE ---

document.getElementById('ad-image').onchange = (e) => {
    const file = e.target.files[0];
    const previewContainer = document.getElementById('image-preview-container');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewContainer.innerHTML = `<img src="${event.target.result}" class="preview-img-aere">`;
        };
        reader.readAsDataURL(file);
    }
};
document.getElementById('btn-final-submit').onclick = async () => {
    const btn = document.getElementById('btn-final-submit');
    btn.innerText = "Mise en ligne en cours...";
    btn.disabled = true;

    try {
        // 1. Upload de l'image vers ImgBB
        const file = document.getElementById('ad-image').files[0];
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("https://api.imgbb.com/1/upload?key=VOTRE_CLE_IMGBB", {
            method: "POST",
            body: formData
        });
        const imgResult = await response.json();
        const imageUrl = imgResult.data.url;

        // 2. Enregistrement dans Firestore
        await publishProperty({
            title: "Beau " + document.getElementById('ad-type-select').value,
            city: document.getElementById('ad-city').value,
            district: document.getElementById('ad-district').value,
            rent: document.getElementById('ad-rent-price').value,
            visitFee: document.getElementById('ad-visit-price').value,
            description: document.getElementById('ad-description').value,
            url: imageUrl
        });

        alert("Bravo ! Votre bien est visible par tous.");
        location.reload(); // On rafraîchit pour nettoyer proprement

    } catch (error) {
        alert("Erreur lors de l'envoi. Vérifiez votre connexion.");
        btn.disabled = false;
        btn.innerText = "Réessayer";
    }
};// --- LOGIQUE DE VALIDATION DU CODE DE VISITE ---

/**
 * Valide le code donné par le visiteur et transfère les fonds
 */
async function validateVisitCode() {
    const codeInput = document.getElementById('input-visit-code');
    const code = codeInput.value;
    const user = auth.currentUser;

    if (!code || code.length < 4) {
        alert("Veuillez entrer le code à 4 chiffres fourni par le visiteur.");
        return;
    }

    // 1. On cherche la transaction correspondante dans Firebase
    try {
        const q = query(
            collection(db, "transactions"),
            where("ownerId", "==", user.uid),
            where("visitCode", "==", code),
            where("status", "==", "en_attente")
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Code incorrect ou déjà validé. Vérifiez avec le visiteur.");
            return;
        }

        // 2. Si le code est bon, on procède au paiement
        const transactionDoc = querySnapshot.docs[0];
        const amount = transactionDoc.data().amount;

        // A. On marque la transaction comme terminée
        await updateDoc(doc(db, "transactions", transactionDoc.id), {
            status: "termine",
            validatedAt: new Date()
        });

        // B. On met à jour le solde (Balance) du propriétaire
        await updateOwnerBalance(user.uid, amount);

        // 3. Succès visuel
        showValidationSuccess(amount);
        codeInput.value = ""; // On vide le champ
        
    } catch (error) {
        console.error("Erreur de validation:", error);
        alert("Une erreur technique est survenue.");
    }
}/**
 * Met à jour le solde de l'utilisateur dans la collection 'users'
 */
async function updateOwnerBalance(uid, amountToAdd) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    let currentBalance = 0;
    if (userSnap.exists()) {
        currentBalance = userSnap.data().balance || 0;
    }

    await setDoc(userRef, {
        balance: currentBalance + amountToAdd
    }, { merge: true });
    
    // On rafraîchit l'affichage du dashboard
    document.getElementById('total-balance').innerText = (currentBalance + amountToAdd).toLocaleString();
}
function showValidationSuccess(amount) {
    const dashboard = document.getElementById('owner-dashboard');
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>+ ${amount.toLocaleString()} FCFA ajoutés à votre solde</span>
    `;
    
    dashboard.appendChild(toast);

    // Disparition en douceur après 3 secondes
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
// --- INITIALISATION ET ÉTAT DE CONNEXION ---

/**
 * Surveille l'état de l'utilisateur (Connecté ou non)
 * C'est ici que l'application décide quel écran afficher au démarrage
 */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // L'utilisateur est connecté (Propriétaire)
        console.log("Propriétaire connecté:", user.email);
        
        // 1. On récupère ses données de solde en temps réel
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            // Mise à jour du nom et du solde sur le dashboard
            document.querySelector('.user-welcome strong').innerText = userData.email.split('@')[0];
            document.getElementById('total-balance').innerText = (userData.balance || 0).toLocaleString();
        }

        // 2. On charge ses annonces personnelles
        loadMyProperties(user.uid);

        // 3. On le dirige directement vers son espace pro, sans transition inutile
        navigateTo('dashboard');
        
    } else {
        // Aucun utilisateur connecté
        console.log("Mode visiteur ou déconnecté");
        // On reste sur l'écran d'accueil pour laisser le choix
        navigateTo('welcome');
    }
});

/**
 * Fonction de déconnexion épurée
 */
document.querySelector('.btn-icon-logout').onclick = async () => {
    const confirmation = confirm("Voulez-vous vraiment vous déconnecter ?");
    if (confirmation) {
        try {
            await signOut(auth);
            location.reload(); // On recharge pour réinitialiser tous les états
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
        }
    }
};