# Mappiol - Application Immobilière Améliorée

## 🎨 Nouvelles Fonctionnalités Implémentées

### 1. **Design du Logo Mappiol**
- ✅ **Icône de localisation** : Le "o" de Mappiol est remplacé par une icône de pin de localisation animée
- ✅ **Effet carte routière** : Des lignes stylisées dans les lettres évoquent des chemins et routes (comme Google Maps)
- ✅ **Animation** : Le pin de localisation pulse doucement pour attirer l'attention

### 2. **Session Explorer (Visiteurs)**
- ✅ **Titre masqué** : Le texte "Explorer" dans le header est caché pour une interface plus épurée
- ✅ **Bouton retour minimaliste** : Bouton circulaire simple avec icône chevron pour revenir à l'accueil
- ✅ **Recherche et filtres** : Système de recherche par ville/quartier avec filtres par type de bien
- ✅ **Affichage des biens** : Grille responsive de cartes avec photos, prix, et frais de visite

### 3. **Espace Propriétaire - Création de Profil**
Après connexion/inscription, le propriétaire doit compléter son profil :

#### Écran de Configuration du Profil
- ✅ **Photo de profil** : Upload avec prévisualisation circulaire
- ✅ **Nom et Prénom** : Champs obligatoires
- ✅ **Numéro de téléphone** : Champ optionnel
- ✅ **Visibilité du téléphone** : 
  - Case à cocher pour rendre le numéro public
  - Si cochée : les visiteurs peuvent voir et contacter le propriétaire
  - Si non cochée : le numéro reste privé

### 4. **Publication de Biens - Fonctionnalités Avancées**

#### Upload Multiple de Médias
- ✅ **Photos multiples** : Jusqu'à 6 photos par bien
- ✅ **Support vidéo** : Possibilité d'ajouter des vidéos de présentation
- ✅ **Grille de prévisualisation** : Affichage en grille 3x2 avec boutons de suppression
- ✅ **Gestion des médias** : Ajout/suppression facile des médias avant publication

#### Disponibilités pour les Visites
- ✅ **Ajout de créneaux** : Le propriétaire peut définir plusieurs dates et heures de disponibilité
- ✅ **Format date/heure** : Sélecteurs natifs HTML5 pour une meilleure UX
- ✅ **Liste des créneaux** : Affichage formaté des disponibilités avec possibilité de les supprimer
- ✅ **Modification** : Les créneaux peuvent être ajoutés ou retirés à tout moment

#### Informations du Bien
- ✅ **Type de bien** : Studio, Appartement, Chambre, Villa
- ✅ **Localisation** : Ville et quartier
- ✅ **Prix du loyer** : Montant mensuel en FCFA
- ✅ **Frais de visite** : Montant demandé pour visiter le bien

### 5. **Gestion des Publications**

#### Modification des Biens
- ✅ **Modal de modification** : Interface dédiée pour éditer un bien existant
- ✅ **Statut du bien** : 
  - **Disponible** : Le bien est en location
  - **Déjà loué** : Marque le bien comme loué sans le supprimer
- ✅ **Mise à jour des informations** : Tous les champs peuvent être modifiés
- ✅ **Gestion des disponibilités** : Ajout/suppression de créneaux dans les biens existants

#### Suppression de Biens
- ✅ **Modal de confirmation** : Protection contre les suppressions accidentelles
- ✅ **Suppression définitive** : Le bien est retiré de la base de données
- ✅ **Design rouge** : Interface visuelle claire pour une action destructive

### 6. **Annulation de Confirmation de Visite**
- ✅ **Code de validation** : Système à 4 chiffres
- ✅ **Interface dédiée** : Modal spécifique pour valider les visites
- ✅ **Feedback visuel** : Notifications de succès ou d'erreur

## 🎯 Architecture des Fichiers

```
mappiol/
├── index.html          # Structure HTML complète
├── style.css           # Styles avec nouveau design du logo
├── script.js           # Logique JavaScript avec Firebase
└── README.md          # Cette documentation
```

## 🔥 Configuration Firebase

### Collections Firestore

#### Collection `users`
```javascript
{
  email: string,
  firstname: string,
  lastname: string,
  phone: string | null,
  phonePublic: boolean,
  photoURL: string | null,
  profileCompleted: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Collection `properties`
```javascript
{
  type: string,              // Studio, Appartement, Chambre, Villa
  city: string,
  district: string,
  rent: number,
  visitFee: number,
  ownerId: string,
  ownerName: string,
  ownerPhone: string | null,
  mediaUrls: [              // Nouveau : support multi-médias
    {
      url: string,
      type: 'image' | 'video'
    }
  ],
  imageUrl: string,         // Compatibilité
  availabilitySlots: [      // Nouveau : créneaux de visite
    {
      date: string,
      time: string
    }
  ],
  status: 'available' | 'rented',  // Nouveau : statut du bien
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Storage Firebase

```
storage/
├── profiles/
│   └── {userId}/
│       └── photo.jpg
└── properties/
    └── {userId}/
        ├── timestamp_0
        ├── timestamp_1
        └── ...
```

## 🎨 Design System

### Couleurs
- **Primary** : `#4F46E5` (Indigo)
- **Primary Dark** : `#4338CA`
- **Secondary** : `#10B981` (Green)
- **Danger** : `#EF4444` (Red)
- **Text Primary** : `#1F2937`
- **Text Secondary** : `#6B7280`
- **Background** : `#F9FAFB`

### Typographie
- **Font Family** : Plus Jakarta Sans
- **Weights** : 400, 500, 600, 700, 800

## 📱 Responsive Design

- **Mobile First** : Design optimisé pour mobile
- **Tablet (768px+)** : Grille 2 colonnes
- **Desktop (1024px+)** : Grille 3 colonnes

## ⚙️ Fonctionnalités Principales

### Pour les Visiteurs
1. Explorer les biens disponibles
2. Rechercher par ville/quartier
3. Filtrer par type de bien
4. Voir les photos/vidéos
5. Consulter les prix et frais de visite

### Pour les Propriétaires
1. **Authentification** : Inscription/Connexion
2. **Profil** : Configuration complète avec photo
3. **Publication** : 
   - Upload multiple de photos/vidéos
   - Définir les disponibilités
   - Fixer les prix
4. **Gestion** :
   - Modifier les biens
   - Marquer comme loué
   - Supprimer les publications
5. **Validation** : Confirmer les visites avec code

## 🚀 Démarrage

1. **Ouvrir `index.html`** dans un navigateur
2. **Firebase** est déjà configuré et initialisé
3. Les routes fonctionnent sans serveur (Firebase Hosting compatible)

## 📝 Utilisation

### Création d'un Compte Propriétaire
1. Cliquer sur "Espace Propriétaire"
2. Créer un compte avec email/mot de passe
3. Compléter le profil (photo, nom, prénom, téléphone)
4. Accéder au dashboard

### Publication d'un Bien
1. Cliquer sur "Publier"
2. Ajouter 1 à 6 photos/vidéos
3. Remplir les informations du bien
4. Ajouter des créneaux de disponibilité
5. Publier

### Modification d'un Bien
1. Cliquer sur "Modifier" sur un bien
2. Modifier les informations
3. Changer le statut (Disponible/Déjà loué)
4. Gérer les disponibilités
5. Enregistrer

## 🎯 Améliorations Implémentées

✅ Logo avec effet carte routière  
✅ Session explorer épurée  
✅ Création de profil complète  
✅ Upload multiple de médias  
✅ Gestion des disponibilités  
✅ Modification des biens  
✅ Suppression avec confirmation  
✅ Statut "Déjà loué"  
✅ Interface responsive  
✅ Notifications toast  
✅ Loading states  
✅ Validation des formulaires  

## 🔐 Sécurité

- Authentification Firebase
- Upload sécurisé via Storage
- Validation côté client
- Protection contre les suppressions accidentelles

## 📊 Statistiques Dashboard

- Nombre de visites reçues
- Nombre d'annonces actives
- Liste détaillée des biens
- Actions rapides (Publier, Valider)

---

**Développé avec ❤️ pour Mappiol - L'immobilier simplifié**
