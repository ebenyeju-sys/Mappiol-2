import { collection, addDoc, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const modal = document.getElementById('app-modal');
const outlet = document.getElementById('router-outlet');

// 1. RÉCUPÉRER LES MAISONS DEPUIS FIREBASE
async function loadProperties() {
    outlet.innerHTML = '<p style="text-align:center; padding:20px;">Chargement...</p>';
    try {
        const q = query(collection(window.db, "properties"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        let html = '<div class="listing-grid">';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            html += `
                <div class="listing-card" onclick="showDetails('${data.title}', '${data.price}', '${data.img}', '${data.loc}')">
                    <div class="card-media"><img src="${data.img}"></div>
                    <div class="card-body">
                        <div style="color:var(--primary); font-weight:800;">${parseInt(data.price).toLocaleString()} F</div>
                        <h3 style="font-size:16px; margin:5px 0;">${data.title}</h3>
                        <p style="font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${data.loc}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        outlet.innerHTML = html;
    } catch (e) {
        outlet.innerHTML = '<p>Erreur de chargement.</p>';
    }
}

// 2. MONTRER LES DÉTAILS
window.showDetails = (title, price, img, loc) => {
    document.getElementById('m-view-mode').style.display = 'block';
    document.getElementById('m-edit-mode').style.display = 'none';
    document.getElementById('m-img').src = img;
    document.getElementById('m-img').style.display = 'block';
    document.getElementById('m-title').textContent = title;
    document.getElementById('m-price').textContent = parseInt(price).toLocaleString() + " FCFA";
    document.getElementById('m-loc').textContent = loc;
    modal.classList.add('active');
};

// 3. OUVRIR FORMULAIRE AJOUT
document.getElementById('btn-add-main').onclick = () => {
    document.getElementById('m-view-mode').style.display = 'none';
    document.getElementById('m-edit-mode').style.display = 'block';
    document.getElementById('m-img').style.display = 'none';
    modal.classList.add('active');
};

// 4. SAUVEGARDER DANS FIREBASE
document.getElementById('btn-save-fire').onclick = async () => {
    const title = document.getElementById('new-title').value;
    const price = document.getElementById('new-price').value;
    const type = document.getElementById('new-type').value;

    if(!title || !price) return alert("Remplissez tout !");

    try {
        await addDoc(collection(window.db, "properties"), {
            title: title,
            price: price,
            type: type,
            loc: "Douala, Cameroun",
            img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
            createdAt: new Date()
        });
        modal.classList.remove('active');
        loadProperties(); // Recharger la liste
    } catch (e) {
        alert("Erreur Firebase : " + e.message);
    }
};

// ACTIONS UI
document.getElementById('close-modal').onclick = () => modal.classList.remove('active');
document.getElementById('theme-toggle').onclick = () => document.body.classList.toggle('dark-mode');
document.getElementById('filter-toggle').onclick = () => document.getElementById('advanced-filters').classList.toggle('active');

// LANCEMENT
window.onload = loadProperties;