import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// ============== VARIABLES GLOBALES ==============
let auth, db, storage;
let currentUser = null;
let userProfile = null;
let allPropertiesCache = [];
let currentEditPropertyId = null;
let currentDeletePropertyId = null;
let uploadedMediaFiles = [];
let availabilitySlots = [];
let editAvailabilitySlots = [];
let isSignupMode = false;

// ============== INITIALISATION ==============
function waitForFirebase() {
    if (window.auth && window.db && window.storage) {
        auth = window.auth;
        db = window.db;
        storage = window.storage;
        console.log('Firebase initialized, setting up app...');
        setupApp();
    } else {
        console.log('Waiting for Firebase...');
        setTimeout(waitForFirebase, 100);
    }
}

// Démarrer l'attente de Firebase
waitForFirebase();

// ============== CONFIGURATION PRINCIPALE ==============
function setupApp() {
    setupEventListeners();
    setupAuthObserver();
}

// ============== GESTION DES ÉCRANS ==============
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
    document.getElementById(screenId).classList.add('active-screen');
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
        <span class="toast-text">${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============== EVENT LISTENERS ==============
function setupEventListeners() {
    // Navigation
    document.getElementById('btn-enter-visitor').onclick = () => {
        console.log('Explorer clicked');
        showScreen('visitor-screen');
        loadAllProperties();
    };

    document.getElementById('btn-enter-owner').onclick = () => {
        console.log('Espace Propriétaire clicked');
        showScreen('auth-screen');
    };

    document.getElementById('back-visitor').onclick = () => {
        showScreen('landing-screen');
    };

    document.getElementById('back-auth').onclick = () => {
        showScreen('landing-screen');
    };

    document.getElementById('back-profile-setup').onclick = () => {
        showScreen('dashboard-screen');
    };

    document.getElementById('btn-logout').onclick = async () => {
        try {
            await signOut(auth);
            showScreen('landing-screen');
            showNotification('Déconnexion réussie');
        } catch (error) {
            showNotification('Erreur de déconnexion', 'error');
        }
    };

    // Authentification
    setupAuthForm();
    
    // Profil
    setupProfileForm();
    
    // Modals
    setupModals();
    
    // Recherche
    setupSearch();
}

// ============== AUTHENTIFICATION ==============
function setupAuthForm() {
    const toggleSignup = () => {
        isSignupMode = !isSignupMode;
        const btn = document.getElementById('btn-auth-action');
        const toggle = document.querySelector('.auth-toggle p');
        
        if (isSignupMode) {
            btn.textContent = "Créer un compte";
            toggle.innerHTML = 'Déjà un compte ? <span id="btn-toggle-signup">Se connecter</span>';
            document.querySelector('.auth-header-text h2').textContent = "Créer un compte";
            document.querySelector('.auth-header-text p').textContent = "Rejoignez Mappiol dès maintenant.";
        } else {
            btn.textContent = "Se connecter";
            toggle.innerHTML = 'Pas encore de compte ? <span id="btn-toggle-signup">Créer un compte</span>';
            document.querySelector('.auth-header-text h2').textContent = "Bienvenue";
            document.querySelector('.auth-header-text p').textContent = "Connectez-vous pour gérer vos biens.";
        }
        
        document.getElementById('btn-toggle-signup').onclick = toggleSignup;
    };
    
    document.getElementById('btn-toggle-signup').onclick = toggleSignup;

    document.getElementById('auth-form').onsubmit = async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-pass').value;
        
        showLoading();
        
        try {
            if (isSignupMode) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                currentUser = userCredential.user;
                
                await setDoc(doc(db, "users", currentUser.uid), {
                    email: email,
                    createdAt: serverTimestamp(),
                    profileCompleted: false
                });
                
                showScreen('profile-setup-screen');
                showNotification('Compte créé avec succès !');
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                currentUser = userCredential.user;
                
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                
                if (!userDoc.exists() || !userDoc.data().profileCompleted) {
                    showScreen('profile-setup-screen');
                } else {
                    userProfile = userDoc.data();
                    showScreen('dashboard-screen');
                    loadDashboardData();
                }
                
                showNotification('Connexion réussie !');
            }
        } catch (error) {
            console.error(error);
            showNotification(error.message, 'error');
        } finally {
            hideLoading();
        }
    };
}

// ============== PROFIL ==============
function setupProfileForm() {
    document.getElementById('profile-photo-input').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const circle = document.querySelector('.profile-photo-circle');
                circle.innerHTML = `<img src="${event.target.result}" alt="Photo de profil">`;
            };
            reader.readAsDataURL(file);
        }
    };

    document.getElementById('btn-save-profile').onclick = async () => {
        const firstname = document.getElementById('profile-firstname').value.trim();
        const lastname = document.getElementById('profile-lastname').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();
        const phonePublic = document.getElementById('phone-public').checked;
        
        if (!firstname || !lastname) {
            showNotification('Veuillez remplir votre nom et prénom', 'error');
            return;
        }
        
        showLoading();
        
        try {
            let photoURL = null;
            const photoInput = document.getElementById('profile-photo-input');
            
            if (photoInput.files[0]) {
                const photoRef = ref(storage, `profiles/${currentUser.uid}/photo.jpg`);
                await uploadBytes(photoRef, photoInput.files[0]);
                photoURL = await getDownloadURL(photoRef);
            }
            
            const profileData = {
                firstname,
                lastname,
                phone: phone || null,
                phonePublic,
                photoURL,
                profileCompleted: true,
                updatedAt: serverTimestamp()
            };
            
            await updateDoc(doc(db, "users", currentUser.uid), profileData);
            
            userProfile = profileData;
            updateDashboardProfile();
            
            showScreen('dashboard-screen');
            loadDashboardData();
            showNotification('Profil enregistré avec succès !');
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de l\'enregistrement', 'error');
        } finally {
            hideLoading();
        }
    };
}

function updateDashboardProfile() {
    if (userProfile) {
        const avatar = document.getElementById('dashboard-avatar');
        const username = document.getElementById('dashboard-username');
        
        if (userProfile.photoURL) {
            avatar.innerHTML = `<img src="${userProfile.photoURL}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            avatar.textContent = userProfile.firstname.charAt(0).toUpperCase();
        }
        
        username.textContent = `${userProfile.firstname} ${userProfile.lastname}`;
    }
}

// ============== MODALS ==============
function setupModals() {
    // Modal Publier
    document.getElementById('btn-open-add-modal').onclick = () => {
        document.getElementById('modal-publish').classList.add('active');
        resetPublishForm();
    };

    document.getElementById('close-publish').onclick = () => {
        document.getElementById('modal-publish').classList.remove('active');
    };
    
    // Médias multiples
    document.getElementById('new-prop-media').onchange = handleMediaUpload;
    
    // Disponibilités
    document.getElementById('btn-add-availability').onclick = addAvailabilitySlot;
    
    // Publication
    document.getElementById('btn-confirm-publish').onclick = publishProperty;
    
    // Modal Modifier
    document.getElementById('close-edit-property').onclick = () => {
        document.getElementById('modal-edit-property').classList.remove('active');
    };
    
    document.getElementById('btn-add-edit-availability').onclick = addEditAvailabilitySlot;
    document.getElementById('btn-save-edit-property').onclick = savePropertyEdit;
    
    // Modal Suppression
    document.getElementById('btn-cancel-delete').onclick = () => {
        document.getElementById('modal-delete-confirm').classList.remove('active');
    };
    
    document.getElementById('btn-confirm-delete').onclick = confirmDelete;
    
    // Modal Validation
    document.getElementById('btn-open-scan-modal').onclick = () => {
        document.getElementById('modal-validate').classList.add('active');
    };

    document.getElementById('close-validate').onclick = () => {
        document.getElementById('modal-validate').classList.remove('active');
    };

    document.getElementById('btn-confirm-code').onclick = validateVisit;
}

// Gestion des médias
function handleMediaUpload(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (uploadedMediaFiles.length >= 6) {
            showNotification('Maximum 6 médias autorisés', 'error');
            return;
        }
        
        uploadedMediaFiles.push(file);
    });
    
    renderMediaPreview();
    e.target.value = '';
}

function renderMediaPreview() {
    const grid = document.getElementById('media-preview-grid');
    grid.innerHTML = `
        <label class="add-media-btn">
            <i class="fa-solid fa-plus"></i>
            <span>Ajouter</span>
            <input type="file" id="new-prop-media" hidden accept="image/*,video/*" multiple>
        </label>
    `;
    
    uploadedMediaFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const addBtn = grid.querySelector('.add-media-btn');
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            
            const isVideo = file.type.startsWith('video/');
            
            if (isVideo) {
                mediaItem.innerHTML = `
                    <video src="${event.target.result}"></video>
                    <button class="remove-media-btn" onclick="window.removeMedia(${index})">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
            } else {
                mediaItem.innerHTML = `
                    <img src="${event.target.result}" alt="Média">
                    <button class="remove-media-btn" onclick="window.removeMedia(${index})">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
            }
            
            grid.insertBefore(mediaItem, addBtn);
        };
        reader.readAsDataURL(file);
    });
    
    if (uploadedMediaFiles.length >= 6) {
        grid.querySelector('.add-media-btn').style.display = 'none';
    }
    
    document.getElementById('new-prop-media').onchange = handleMediaUpload;
}

window.removeMedia = (index) => {
    uploadedMediaFiles.splice(index, 1);
    renderMediaPreview();
};

// Gestion des disponibilités
function addAvailabilitySlot() {
    const date = document.getElementById('availability-date').value;
    const time = document.getElementById('availability-time').value;
    
    if (!date || !time) {
        showNotification('Veuillez sélectionner une date et une heure', 'error');
        return;
    }
    
    availabilitySlots.push({ date, time });
    renderAvailabilityList();
    
    document.getElementById('availability-date').value = '';
    document.getElementById('availability-time').value = '';
}

function renderAvailabilityList() {
    const list = document.getElementById('availability-list');
    list.innerHTML = '';
    
    availabilitySlots.forEach((slot, index) => {
        const item = document.createElement('div');
        item.className = 'availability-item';
        item.innerHTML = `
            <div class="availability-info">
                <div class="availability-date">${new Date(slot.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                })}</div>
                <div class="availability-time">${slot.time}</div>
            </div>
            <button class="remove-availability-btn" onclick="window.removeAvailability(${index})">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

window.removeAvailability = (index) => {
    availabilitySlots.splice(index, 1);
    renderAvailabilityList();
};

function resetPublishForm() {
    document.getElementById('new-prop-type').value = 'Studio';
    document.getElementById('new-prop-city').value = '';
    document.getElementById('new-prop-district').value = '';
    document.getElementById('new-prop-rent').value = '';
    document.getElementById('new-prop-fees').value = '';
    document.getElementById('availability-date').value = '';
    document.getElementById('availability-time').value = '';
    
    uploadedMediaFiles = [];
    availabilitySlots = [];
    
    renderMediaPreview();
    renderAvailabilityList();
}

async function publishProperty() {
    const type = document.getElementById('new-prop-type').value;
    const city = document.getElementById('new-prop-city').value.trim();
    const district = document.getElementById('new-prop-district').value.trim();
    const rent = parseInt(document.getElementById('new-prop-rent').value);
    const visitFee = parseInt(document.getElementById('new-prop-fees').value);
    
    if (!city || !district || !rent || !visitFee) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }
    
    if (uploadedMediaFiles.length === 0) {
        showNotification('Veuillez ajouter au moins une photo', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const mediaUrls = [];
        for (let i = 0; i < uploadedMediaFiles.length; i++) {
            const file = uploadedMediaFiles[i];
            const mediaRef = ref(storage, `properties/${currentUser.uid}/${Date.now()}_${i}`);
            await uploadBytes(mediaRef, file);
            const url = await getDownloadURL(mediaRef);
            mediaUrls.push({
                url,
                type: file.type.startsWith('video/') ? 'video' : 'image'
            });
        }
        
        const propertyData = {
            type,
            city,
            district,
            rent,
            visitFee,
            ownerId: currentUser.uid,
            ownerName: `${userProfile.firstname} ${userProfile.lastname}`,
            ownerPhone: userProfile.phonePublic ? userProfile.phone : null,
            mediaUrls,
            imageUrl: mediaUrls[0].url,
            availabilitySlots,
            status: 'available',
            createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, "properties"), propertyData);
        
        document.getElementById('modal-publish').classList.remove('active');
        loadDashboardData();
        showNotification('Bien publié avec succès !');
        resetPublishForm();
    } catch (error) {
        console.error(error);
        showNotification('Erreur lors de la publication', 'error');
    } finally {
        hideLoading();
    }
}

// Modification de bien
window.openEditPropertyModal = async (propertyId) => {
    currentEditPropertyId = propertyId;
    
    try {
        const docRef = doc(db, "properties", propertyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            document.getElementById('edit-prop-status').value = data.status || 'available';
            document.getElementById('edit-prop-type').value = data.type;
            document.getElementById('edit-prop-city').value = data.city;
            document.getElementById('edit-prop-district').value = data.district;
            document.getElementById('edit-prop-rent').value = data.rent;
            document.getElementById('edit-prop-fees').value = data.visitFee;
            
            editAvailabilitySlots = data.availabilitySlots || [];
            renderEditAvailabilityList();
            
            document.getElementById('modal-edit-property').classList.add('active');
        }
    } catch (error) {
        console.error(error);
        showNotification('Erreur de chargement', 'error');
    }
};

function addEditAvailabilitySlot() {
    const date = document.getElementById('edit-availability-date').value;
    const time = document.getElementById('edit-availability-time').value;
    
    if (!date || !time) {
        showNotification('Veuillez sélectionner une date et une heure', 'error');
        return;
    }
    
    editAvailabilitySlots.push({ date, time });
    renderEditAvailabilityList();
    
    document.getElementById('edit-availability-date').value = '';
    document.getElementById('edit-availability-time').value = '';
}

function renderEditAvailabilityList() {
    const list = document.getElementById('edit-availability-list');
    list.innerHTML = '';
    
    editAvailabilitySlots.forEach((slot, index) => {
        const item = document.createElement('div');
        item.className = 'availability-item';
        item.innerHTML = `
            <div class="availability-info">