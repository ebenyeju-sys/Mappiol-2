// ========================================
// MAPPIOL - JAVASCRIPT PRINCIPAL
// ========================================

import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// ========================================
// VARIABLES GLOBALES
// ========================================

let currentUser = null;
let userProfile = null;
let uploadedMediaFiles = [];
let currentProperties = [];

// ========================================
// NAVIGATION ENTRE ÉCRANS
// ========================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active-screen');
    });
    document.getElementById(screenId).classList.add('active-screen');
}

// Navigation depuis landing
document.getElementById('btn-enter-visitor')?.addEventListener('click', () => {
    showScreen('visitor-screen');
});

document.getElementById('btn-enter-owner')?.addEventListener('click', () => {
    showScreen('auth-screen');
});

// Boutons retour
document.getElementById('back-visitor')?.addEventListener('click', () => {
    showScreen('landing-screen');
});

document.getElementById('back-auth')?.addEventListener('click', () => {
    showScreen('landing-screen');
});

// ========================================
// GESTION DES MODALES
// ========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Ouverture des modales
document.getElementById('btn-open-publish')?.addEventListener('click', () => {
    showModal('modal-publish');
});

document.getElementById('btn-open-validate')?.addEventListener('click', () => {
    showModal('modal-validate');
});

document.getElementById('open-profile')?.addEventListener('click', () => {
    showModal('modal-profile');
    loadUserProfile();
});

// Fermeture des modales
document.getElementById('close-publish')?.addEventListener('click', () => {
    hideModal('modal-publish');
    resetPublishForm();
});

document.getElementById('close-validate')?.addEventListener('click', () => {
    hideModal('modal-validate');
});

document.getElementById('close-profile')?.addEventListener('click', () => {
    hideModal('modal-profile');
});

// Fermer modal en cliquant sur l'overlay
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
});

// ========================================
// SYSTÈME DE NOTIFICATIONS (TOAST)
// ========================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// LOADER
// ========================================

function showLoader() {
    document.getElementById('loading-overlay')?.classList.add('active');
}

function hideLoader() {
    document.getElementById('loading-overlay')?.classList.remove('active');
}

// ========================================
// AUTHENTIFICATION
// ========================================

let isSignupMode = false;

// Toggle entre connexion et inscription
document.getElementById('btn-toggle-signup')?.addEventListener('click', () => {
    isSignupMode = !isSignupMode;
    const authAction = document.getElementById('btn-auth-action');
    const toggleText = document.getElementById('btn-toggle-signup');
    
    if (isSignupMode) {
        authAction.textContent = "Créer un compte";
        toggleText.parentElement.innerHTML = `Déjà un compte ? <span id="btn-toggle-signup">Se connecter</span>`;
        document.querySelector('.auth-header h2').textContent = "Créer un compte";
        document.querySelector('.auth-header p').textContent = "Rejoignez Mappiol et gérez vos biens.";
    } else {
        authAction.textContent = "Se connecter";
        toggleText.parentElement.innerHTML = `Pas encore de compte ? <span id="btn-toggle-signup">Créer un compte</span>`;
        document.querySelector('.auth-header h2').textContent = "Bienvenue";
        document.querySelector('.auth-header p').textContent = "Connectez-vous pour gérer vos biens.";
    }
    
    // Re-attacher l'événement
    document.getElementById('btn-toggle-signup').addEventListener('click', arguments.callee);
});

// Soumission du formulaire d'authentification
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-pass').value;
    
    if (!email || !password) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    showLoader();
    
    try {
        if (isSignupMode) {
            // Inscription
            const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
            currentUser = userCredential.user;
            
            // Créer profil vide
            await setDoc(doc(window.db, 'users', currentUser.uid), {
                email: email,
                createdAt: serverTimestamp(),
                firstname: '',
                lastname: '',
                phone: '',
                phoneVisible: false,
                photoURL: ''
            });
            
            showToast('Compte créé avec succès !', 'success');
            showScreen('dashboard-screen');
            loadDashboard();
        } else {
            // Connexion
            const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
            currentUser = userCredential.user;
            
            showToast('Connexion réussie !', 'success');
            showScreen('dashboard-screen');
            loadDashboard();
        }
    } catch (error) {
        console.error('Erreur auth:', error);
        let errorMessage = 'Une erreur est survenue';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Cet email est déjà utilisé';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email invalide';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Email ou mot de passe incorrect';
        }
        
        showToast(errorMessage, 'error');
    } finally {
        hideLoader();
    }
});

// Déconnexion
document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
        await signOut(window.auth);
        currentUser = null;
        userProfile = null;
        showScreen('landing-screen');
        showToast('Déconnexion réussie', 'success');
    } catch (error) {
        console.error('Erreur déconnexion:', error);
        showToast('Erreur lors de la déconnexion', 'error');
    }
});

// Observer l'état d'authentification
onAuthStateChanged(window.auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserProfile();
    } else {
        currentUser = null;
        userProfile = null;
    }
});

// ========================================
// GESTION DU PROFIL
// ========================================

async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const userDoc = await getDoc(doc(window.db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data();
            updateProfileUI();
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

function updateProfileUI() {
    if (!userProfile) return;
    
    // Mettre à jour le nom d'utilisateur
    const username = `${userProfile.firstname || ''} ${userProfile.lastname || ''}`.trim() || 'Propriétaire';
    document.getElementById('dashboard-username').textContent = username;
    
    // Mettre à jour l'avatar
    if (userProfile.photoURL) {
        document.getElementById('user-avatar').innerHTML = 
            `<img src="${userProfile.photoURL}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
        
        const profilePreview = document.getElementById('profile-photo-preview');
        if (profilePreview) {
            profilePreview.src = userProfile.photoURL;
            profilePreview.style.display = 'block';
            document.getElementById('profile-initial-large').style.display = 'none';
        }
    } else if (userProfile.firstname) {
        const initial = userProfile.firstname.charAt(0).toUpperCase();
        document.getElementById('avatar-initial').textContent = initial;
        document.getElementById('profile-initial-large').textContent = initial;
    }
    
    // Pré-remplir le formulaire de profil
    if (document.getElementById('profile-firstname')) {
        document.getElementById('profile-firstname').value = userProfile.firstname || '';
        document.getElementById('profile-lastname').value = userProfile.lastname || '';
        document.getElementById('profile-phone').value = userProfile.phone || '';
        document.getElementById('phone-visibility-toggle').checked = userProfile.phoneVisible || false;
    }
}

// Upload de la photo de profil
document.getElementById('profile-photo-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;
    
    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image trop volumineuse (max 5MB)', 'error');
        return;
    }
    
    showLoader();
    
    try {
        // Upload vers Firebase Storage
        const storageRef = ref(window.storage, `profiles/${currentUser.uid}/avatar.jpg`);
        await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(storageRef);
        
        // Mettre à jour l'aperçu
        const imgPreview = document.getElementById('profile-photo-preview');
        const initialLarge = document.getElementById('profile-initial-large');
        imgPreview.src = photoURL;
        imgPreview.style.display = 'block';
        initialLarge.style.display = 'none';
        
        // Sauvegarder temporairement
        userProfile.photoURL = photoURL;
        
        showToast('Photo chargée !', 'success');
    } catch (error) {
        console.error('Erreur upload photo:', error);
        showToast('Erreur lors du chargement de la photo', 'error');
    } finally {
        hideLoader();
    }
});

// Enregistrer le profil
document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    if (!currentUser) return;
    
    const firstname = document.getElementById('profile-firstname').value.trim();
    const lastname = document.getElementById('profile-lastname').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const phoneVisible = document.getElementById('phone-visibility-toggle').checked;
    
    if (!firstname || !lastname) {
        showToast('Veuillez remplir le nom et prénom', 'error');
        return;
    }
    
    showLoader();
    
    try {
        await updateDoc(doc(window.db, 'users', currentUser.uid), {
            firstname,
            lastname,
            phone,
            phoneVisible,
            photoURL: userProfile.photoURL || '',
            updatedAt: serverTimestamp()
        });
        
        userProfile = { ...userProfile, firstname, lastname, phone, phoneVisible };
        updateProfileUI();
        hideModal('modal-profile');
        showToast('Profil enregistré !', 'success');
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        hideLoader();
    }
});

// ========================================
// UPLOAD DE MÉDIAS (PHOTOS/VIDÉOS)
// ========================================

document.getElementById('new-prop-media')?.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    const previewContainer = document.getElementById('media-preview');
    
    files.forEach((file) => {
        // Vérifier la taille (max 10MB par fichier)
        if (file.size > 10 * 1024 * 1024) {
            showToast(`Fichier ${file.name} trop volumineux (max 10MB)`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'preview-item';
            
            const mediaIndex = uploadedMediaFiles.length;
            
            if (file.type.startsWith('image/')) {
                mediaItem.innerHTML = `
                    <img src="${event.target.result}" alt="Preview">
                    <button class="remove-preview" data-index="${mediaIndex}">×</button>
                `;
            } else if (file.type.startsWith('video/')) {
                mediaItem.innerHTML = `
                    <video src="${event.target.result}" muted></video>
                    <button class="remove-preview" data-index="${mediaIndex}">×</button>
                `;
            }
            
            previewContainer.appendChild(mediaItem);
            uploadedMediaFiles.push(file);
        };
        reader.readAsDataURL(file);
    });
    
    // Reset input
    e.target.value = '';
});

// Supprimer un média de l'aperçu
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-preview')) {
        const index = parseInt(e.target.dataset.index);
        uploadedMediaFiles.splice(index, 1);
        e.target.parentElement.remove();
        
        // Réindexer les boutons restants
        document.querySelectorAll('.remove-preview').forEach((btn, idx) => {
            btn.dataset.index = idx;
        });
    }
});

// ========================================
// GÉOLOCALISATION
// ========================================

document.getElementById('get-location-btn')?.addEventListener('click', function() {
    if (!navigator.geolocation) {
        showToast('Géolocalisation non supportée par votre navigateur', 'error');
        return;
    }
    
    showToast('Récupération de la position...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude.toFixed(6);
            const lng = position.coords.longitude.toFixed(6);
            document.getElementById('new-prop-location').value = `${lat}, ${lng}`;
            showToast('Position récupérée !', 'success');
        },
        (error) => {
            console.error('Erreur géolocalisation:', error);
            showToast('Impossible de récupérer votre position', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

// ========================================
// GESTION DES CRÉNEAUX DE DISPONIBILITÉ
// ========================================

document.getElementById('btn-add-slot')?.addEventListener('click', function() {
    const slotsContainer = document.getElementById('availability-slots');
    const newSlot = document.createElement('div');
    newSlot.className = 'availability-slot';
    newSlot.innerHTML = `
        <input type="date" class="slot-date">
        <input type="time" class="slot-time">
        <button type="button" class="btn-remove-slot">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    slotsContainer.appendChild(newSlot);
});

document.addEventListener('click', function(e) {
    if (e.target.closest('.btn-remove-slot')) {
        const slot = e.target.closest('.availability-slot');
        const totalSlots = document.querySelectorAll('.availability-slot').length;
        
        if (totalSlots > 1) {
            slot.remove();
        } else {
            showToast('Gardez au moins un créneau de disponibilité', 'error');
        }
    }
});

// ========================================
// PUBLICATION D'UN BIEN
// ========================================

document.getElementById('btn-confirm-publish')?.addEventListener('click', async () => {
    if (!currentUser) {
        showToast('Veuillez vous connecter', 'error');
        return;
    }
    
    // Récupérer les données du formulaire
    const type = document.getElementById('new-prop-type').value;
    const city = document.getElementById('new-prop-city').value.trim();
    const district = document.getElementById('new-prop-district').value.trim();
    const location = document.getElementById('new-prop-location').value.trim();
    const rent = document.getElementById('new-prop-rent').value;
    const fees = document.getElementById('new-prop-fees').value;
    
    // Validation
    if (!city || !district || !rent || !fees) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    if (uploadedMediaFiles.length === 0) {
        showToast('Ajoutez au moins une photo ou vidéo', 'error');
        return;
    }
    
    // Récupérer les créneaux de disponibilité
    const slots = [];
    document.querySelectorAll('.availability-slot').forEach(slot => {
        const date = slot.querySelector('.slot-date').value;
        const time = slot.querySelector('.slot-time').value;
        if (date && time) {
            slots.push({ date, time });
        }
    });
    
    if (slots.length === 0) {
        showToast('Ajoutez au moins un créneau de disponibilité', 'error');
        return;
    }
    
    showLoader();
    
    try {
        // Upload des médias
        const mediaURLs = [];
        for (let i = 0; i < uploadedMediaFiles.length; i++) {
            const file = uploadedMediaFiles[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${i}.${fileExt}`;
            const storageRef = ref(window.storage, `properties/${currentUser.uid}/${fileName}`);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            mediaURLs.push({
                url,
                type: file.type.startsWith('image/') ? 'image' : 'video'
            });
        }
        
        // Créer le document de propriété
        const propertyData = {
            ownerId: currentUser.uid,
            ownerEmail: currentUser.email,
            ownerName: `${userProfile?.firstname || ''} ${userProfile?.lastname || ''}`.trim(),
            ownerPhone: userProfile?.phone || '',
            ownerPhoneVisible: userProfile?.phoneVisible || false,
            type,
            city,
            district,
            location,
            rent: parseInt(rent),
            visitFees: parseInt(fees),
            media: mediaURLs,
            availability: slots,
            isRented: false,
            visits: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        await addDoc(collection(window.db, 'properties'), propertyData);
        
        showToast('Bien publié avec succès !', 'success');
        hideModal('modal-publish');
        resetPublishForm();
        loadDashboard();
    } catch (error) {
        console.error('Erreur publication:', error);
        showToast('Erreur lors de la publication', 'error');
    } finally {
        hideLoader();
    }
});

function resetPublishForm() {
    document.getElementById('new-prop-type').value = 'Studio';
    document.getElementById('new-prop-city').value = '';
    document.getElementById('new-prop-district').value = '';
    document.getElementById('new-prop-location').value = '';
    document.getElementById('new-prop-rent').value = '';
    document.getElementById('new-prop-fees').value = '';
    
    document.getElementById('media-preview').innerHTML = '';
    uploadedMediaFiles = [];
    
    // Réinitialiser les créneaux
    const slotsContainer = document.getElementById('availability-slots');
    slotsContainer.innerHTML = `
        <div class="availability-slot">
            <input type="date" class="slot-date">
            <input type="time" class="slot-time">
            <button type="button" class="btn-remove-slot">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
}

// ========================================
// CHARGEMENT DU DASHBOARD
// ========================================

async function loadDashboard() {
    if (!currentUser) return;
    
    showLoader();
    
    try {
        // Charger les propriétés de l'utilisateur
        const q = query(
            collection(window.db, 'properties'),
            where('ownerId', '==', currentUser.uid),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        currentProperties = [];
        
        querySnapshot.forEach((doc) => {
            currentProperties.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Mettre à jour l'UI
        displayProperties();
        updateStats();
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur lors du chargement des données', 'error');
    } finally {
        hideLoader();
    }
}

function displayProperties() {
    const container = document.getElementById('properties-list');
    
    if (currentProperties.length === 0) {
        container.innerHTML = `
            <div class="empty-dashboard-state">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Vide" width="60">
                <p>Vous n'avez aucune annonce.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    currentProperties.forEach(property => {
        const propertyItem = document.createElement('div');
        propertyItem.className = `property-item ${property.isRented ? 'is-rented' : ''}`;
        propertyItem.dataset.id = property.id;
        
        const mainImage = property.media && property.media.length > 0 
            ? property.media[0].url 
            : 'https://via.placeholder.com/100?text=Pas+d\'image';
        
        propertyItem.innerHTML = `
            <img src="${mainImage}" class="property-item-image" alt="${property.type}">
            <div class="property-item-info">
                <span class="property-item-type">${property.type}</span>
                ${property.isRented ? '<span class="property-status-badge">Loué</span>' : ''}
                <div class="property-item-location">${property.city}, ${property.district}</div>
                <div class="property-item-price">${property.rent.toLocaleString()} FCFA/mois</div>
            </div>
            <div class="property-actions">
                <button class="property-btn toggle-rented" title="${property.isRented ? 'Marquer comme disponible' : 'Marquer comme loué'}">
                    <i class="fa-solid fa-${property.isRented ? 'lock-open' : 'lock'}"></i>
                </button>
                <button class="property-btn delete" title="Supprimer">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(propertyItem);
    });
    
    // Attacher les événements
    attachPropertyEvents();
}

function attachPropertyEvents() {
    // Toggle statut loué/disponible
    document.querySelectorAll('.property-btn.toggle-rented').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const propertyItem = e.target.closest('.property-item');
            const propertyId = propertyItem.dataset.id;
            const property = currentProperties.find(p => p.id === propertyId);
            
            if (!property) return;
            
            showLoader();
            
            try {
                await updateDoc(doc(window.db, 'properties', propertyId), {
                    isRented: !property.isRented,
                    updatedAt: serverTimestamp()
                });
                
                property.isRented = !property.isRented;
                displayProperties();
                showToast(property.isRented ? 'Marqué comme loué' : 'Marqué comme disponible', 'success');
            } catch (error) {
                console.error('Erreur mise à jour statut:', error);
                showToast('Erreur lors de la mise à jour', 'error');
            } finally {
                hideLoader();
            }
        });
    });
    
    // Suppression
    document.querySelectorAll('.property-btn.delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
            
            const propertyItem = e.target.closest('.property-item');
            const propertyId = propertyItem.dataset.id;
            const property = currentProperties.find(p => p.id === propertyId);
            
            if (!property) return;
            
            showLoader();
            
            try {
                // Supprimer les médias du storage
                if (property.media && property.media.length > 0) {
                    for (const media of property.media) {
                        try {
                            const mediaRef = ref(window.storage, media.url);
                            await deleteObject(mediaRef);
                        } catch (err) {
                            console.warn('Erreur suppression média:', err);
                        }
                    }
                }
                
                // Supprimer le document
                await deleteDoc(doc(window.db, 'properties', propertyId));
                
                currentProperties = currentProperties.filter(p => p.id !== propertyId);
                displayProperties();
                updateStats();
                showToast('Annonce supprimée', 'success');
            } catch (error) {
                console.error('Erreur suppression:', error);
                showToast('Erreur lors de la suppression', 'error');
            } finally {
                hideLoader();
            }
        });
    });
}

function updateStats() {
    // Nombre d'annonces
    document.getElementById('stat-ads-count').textContent = currentProperties.length;
    
    // Total des visites
    const totalVisits = currentProperties.reduce((sum, prop) => sum + (prop.visits || 0), 0);
    document.getElementById('stat-visits-count').textContent = totalVisits;
}

// ========================================
// VALIDATION DE VISITE
// ========================================

document.getElementById('btn-confirm-code')?.addEventListener('click', async () => {
    const code = document.getElementById('visit-code-input').value.trim();
    
    if (!code || code.length !== 4) {
        showToast('Entrez un code à 4 chiffres', 'error');
        return;
    }
    
    showLoader();
    
    try {
        // Chercher une visite avec ce code
        const q = query(
            collection(window.db, 'visits'),
            where('code', '==', code),
            where('ownerId', '==', currentUser.uid),
            where('validated', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            showToast('Code invalide ou déjà utilisé', 'error');
            return;
        }
        
        // Valider la visite
        const visitDoc = querySnapshot.docs[0];
        await updateDoc(doc(window.db, 'visits', visitDoc.id), {
            validated: true,
            validatedAt: serverTimestamp()
        });
        
        // Incrémenter le compteur de visites de la propriété
        const propertyId = visitDoc.data().propertyId;
        const propertyRef = doc(window.db, 'properties', propertyId);
        const propertyDoc = await getDoc(propertyRef);
        
        if (propertyDoc.exists()) {
            await updateDoc(propertyRef, {
                visits: (propertyDoc.data().visits || 0) + 1
            });
        }
        
        hideModal('modal-validate');
        document.getElementById('visit-code-input').value = '';
        loadDashboard();
        showToast('Visite validée avec succès !', 'success');
    } catch (error) {
        console.error('Erreur validation visite:', error);
        showToast('Erreur lors de la validation', 'error');
    } finally {
        hideLoader();
    }
});

// ========================================
// FILTRES DE RECHERCHE (VISITEUR)
// ========================================

let selectedFilter = 'all';

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        selectedFilter = this.dataset.type;
        searchProperties();
    });
});

document.getElementById('search-input')?.addEventListener('input', debounce(searchProperties, 300));

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function searchProperties() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const feedContainer = document.getElementById('visitor-feed');
    
    if (!searchTerm && selectedFilter === 'all') {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-map"></i>
                <p>Cherchez une zone pour voir les biens.</p>
            </div>
        `;
        return;
    }
    
    showLoader();
    
    try {
        let q = query(
            collection(window.db, 'properties'),
            where('isRented', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        let properties = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            properties.push({
                id: doc.id,
                ...data
            });
        });
        
        // Filtrer par type
        if (selectedFilter !== 'all') {
            properties = properties.filter(p => p.type === selectedFilter);
        }
        
        // Filtrer par recherche
        if (searchTerm) {
            properties = properties.filter(p => 
                p.city.toLowerCase().includes(searchTerm) ||
                p.district.toLowerCase().includes(searchTerm)
            );
        }
        
        displayVisitorProperties(properties);
    } catch (error) {
        console.error('Erreur recherche:', error);
        showToast('Erreur lors de la recherche', 'error');
    } finally {
        hideLoader();
    }
}

function displayVisitorProperties(properties) {
    const feedContainer = document.getElementById('visitor-feed');
    
    if (properties.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-map"></i>
                <p>Aucun bien trouvé pour cette recherche.</p>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = '';
    
    properties.forEach(property => {
        const card = document.createElement('div');
        card.className = 'property-card';
        
        const mainImage = property.media && property.media.length > 0 
            ? property.media[0].url 
            : 'https://via.placeholder.com/400x200?text=Pas+d\'image';
        
        card.innerHTML = `
            <img src="${mainImage}" class="property-image" alt="${property.type}">
            <div class="property-info">
                <span class="property-type">${property.type}</span>
                <div class="property-location">${property.city}</div>
                <div class="property-district">${property.district}</div>
                <div class="property-price">${property.rent.toLocaleString()} FCFA<span style="font-size: 14px; font-weight: 500;">/mois</span></div>
                <div class="property-visit-fee">
                    <i class="fa-solid fa-eye"></i> Frais de visite: ${property.visitFees.toLocaleString()} FCFA
                </div>
            </div>
        `;
        
        feedContainer.appendChild(card);
    });
}

// ========================================
// INITIALISATION
// ========================================

console.log('Mappiol JavaScript chargé ✓');

// Exporter les fonctions globales
window.showToast = showToast;
window.showScreen = showScreen;
window.loadDashboard = loadDashboard;
