# 🇲🇦 Concours Hub Maroc

Une plateforme web dédiée à la centralisation et à la recherche des opportunités académiques, concours, masters, formations et informations institutionnelles au Maroc.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2399FF?logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-148?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI/CD-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)

**🌐 Live Demo**

[https://concours-hub-maroc212.vercel.app/](https://concours-hub-maroc212.vercel.app/)

---

## 📋 À propos du projet

**Concours Hub Maroc** est une plateforme Full-Stack qui centralise les opportunités académiques et professionnelles au Maroc. Elle permet aux utilisateurs de rechercher, consulter et suivre les concours, masters, examens et formations disponibles.

Le projet est structuré autour de trois grands espaces :

- **Espace public** — consultation libre de tout le catalogue
- **Espace utilisateur** — espace personnel avec authentification, favoris et notifications
- **Espace administration** — gestion complète du catalogue et des utilisateurs

### Domaines couverts

- 🎓 **Concours** — concours officiels des ministères, universités, écoles et institutions marocaines
- 📚 **Masters** — concours d'accès aux masters universitaires
- 📝 **Examens** — anciens sujets d'examen avec corrections
- 🏫 **Écoles** — catalogue des écoles marocaines avec détails
- 🎓 **Universités** — catalogue des universités marocaines
- 🏛️ **Ministères** — référencement des concours par ministère
- 📖 **Formations** — cours et supports de préparation
- 📄 **Documents** — avis, convocations, programmes officiels

---

## ✨ Fonctionnalités

### 🔍 Recherche et filtrage
- Recherche avancée dans toutes les catégories
- Filtres par type (concours, master, examen, école, université, ministère)
- Filtres par statut (ouvert, à venir, clôturé)
- Recherche par mots-clés avec résultats instantanés

### 📋 Gestion du catalogue
- Liste paginée des concours avec statuts automatiques (ouvert, à venir, clôturé, à vérifier)
- Détail complet de chaque concours avec dates, conditions et documents
- Gestion des masters (import, liste, statuts)
- Gestion des examens avec visionneuse PDF
- Catalogue d'écoles, universités et ministères avec logos officiels
- Catalogue de documents (PDF, avis, convocations)
- Catalogue de formations et cours

### 🔐 Authentification
- Inscription avec validation (email, mot de passe 8+ caractères)
- Connexion avec vérification de compte actif
- Réinitialisation du mot de passe par email
- Gestion du profil (modification des informations personnelles)
- Changement de mot de passe
- Suspension de compte

### 👤 Espace utilisateur
- Tableau de bord personnel
- Suivi des concours favoris
- Historique des candidatures
- Notifications en temps réel
- Gestion des préférences et paramètres

### 🛠️ Administration
- CRUD complet sur tout le catalogue (concours, masters, écoles, universités, ministères, examens, documents, cours)
- Gestion des utilisateurs et des rôles (USER, ADMIN, SUPER_ADMIN)
- Tableau de bord avec statistiques et rapports
- Système de signalements
- Gestion des notifications
- Agent IA pour le scraping et l'extraction automatique

### 🎨 Interface
- Design responsive (mobile, tablette, desktop)
- Mode sombre / clair (automatique ou manuel)
- Navigation par routes avec React Router
- Composants réutilisables (cards, formulaires, badges, modales)
- Vue PDF intégrée pour les documents et examens

---

## 🖥️ Pages et modules

### Pages publiques

| Page | Route | Description |
|------|-------|-------------|
| Accueil | `/` | Présentation, recherche globale, statistiques |
| Masters | `/masters` | Liste des masters avec filtres |
| Concours | `/concours` | Liste des concours avec recherche et filtres |
| Concours détail | `/concours/:slug` | Détail complet d'un concours |
| Écoles | `/ecoles` | Catalogue des écoles marocaines |
| École détail | `/ecoles/:slug` | Détail d'une école |
| Examens | `/examens` | Liste des examens |
| Examen détail | `/examens/:slug` | Détail d'un examen |
| Visionneuse PDF | `/examens/viewer/:slug` | Lecture du sujet d'examen |
| Documents | `/documents` | Catalogue de documents officiels |
| Préparation | `/preparation` | Cours et supports de préparation |
| Cours | `/preparation/cours/:slug` | Détail d'un cours |
| Connexion | `/connexion` | Espace de connexion |
| Inscription | `/inscription` | Création de compte |
| Mot de passe oublié | `/mot-de-passe-oublie` | Réinitialisation du mot de passe |
| Réinitialisation | `/mot-de-passe-reinitialisation` | Formulaire de réinitialisation |
| À propos | `/a-propos` | Présentation du projet |
| FAQ | `/faq` | Foire aux questions |
| Contact | `/contact` | Contact |
| Confidentialité | `/confidentialite` | Politique de confidentialité |
| Conditions | `/conditions` | Conditions d'utilisation |
| 404 | `*` | Page non trouvée |

### Espace utilisateur

| Page | Route | Description |
|------|-------|-------------|
| Tableau de bord | `/dashboard` | Vue d'ensemble personnel |
| Mes concours | `/dashboard/concours` | Concours suivis |
| Mes cours | `/dashboard/cours` | Cours en cours |
| Favoris | `/dashboard/favoris` | Liste des favoris |
| Notifications | `/dashboard/notifications` | Notifications reçues |
| Profil | `/dashboard/profil` | Informations personnelles |
| Paramètres | `/dashboard/parametres` | Configuration du compte |

### Administration

| Page | Route | Description |
|------|-------|-------------|
| Dashboard admin | `/admin` | Vue d'ensemble de l'administration |
| Concours | `/admin/concours` | Gestion des concours |
| Masters | `/admin/masters` | Gestion et import des masters |
| Écoles | `/admin/ecoles` | Gestion des écoles |
| Universités | `/admin/universites` | Gestion des universités |
| Ministères | `/admin/ministeres` | Gestion des ministères |
| Examens | `/admin/examens` | Gestion des examens |
| Documents | `/admin/documents` | Gestion des documents |
| Cours | `/admin/cours` | Gestion des cours |
| Utilisateurs | `/admin/utilisateurs` | Gestion des comptes |
| Rapports | `/admin/rapports` | Statistiques et rapports |
| Paramètres | `/admin/parametres` | Configuration générale |
| Agent IA | `/admin/ai-agent` | Agent de scraping IA |
| Notifications | `/admin/notifications` | Gestion des notifications |
| Signalements | `/admin/signalements` | Signalements des utilisateurs |

---

## 🛠️ Technologies

### Frontend
- **React 19** — bibliothèque UI
- **TypeScript 5.9** — typage statique
- **Vite 7** — outil de build et dev server
- **Tailwind CSS 4** — framework CSS
- **React Router 7** — routage côté client
- **Lucide React** — icônes

### Backend
- **Node.js** — environnement d'exécution
- **Express 5** — framework serveur
- **Prisma 5** — ORM pour PostgreSQL
- **Nodemailer** — envoi d'emails (réinitialisation de mot de passe)

### Base de données
- **PostgreSQL** — base de données relationnelle (via Prisma)
- **Supabase** — synchronisation, stockage de fichiers, authentification

### Intelligence Artificielle
- **Google Gemini** — agent de scraping et extraction automatique de données
- **Cheerio** — parsing HTML pour le scraping

### Déploiement
- **Vercel** — hébergement frontend
- **Cloudflare Workers** — déploiement backend API

### Development
- **Git** — contrôle de version
- **GitHub Actions** — CI/CD automatique

---

## 🏗️ Architecture

```
Frontend (React + TypeScript + Vite + Tailwind)
  │
  │ React Router (navigation client)
  │
  ├── pages publiques (accès libre)
  ├── dashboard utilisateur (authentifié)
  └── pages admin (rôle ADMIN)
  │
  ↓
API Backend (Express 5 + TypeScript)
  │
  ├── /api/masters — données masters
  ├── /api/auth — authentification
  ├── /api/agent — agent IA
  └── /api/* — routes REST
  │
  ↓
Base de données
  │
  ├── PostgreSQL (Prisma ORM)
  ├── Supabase (sync, storage, auth)
  └── localStorage (cache client)
```

---

## 📁 Structure du projet

```
concours/
├── src/                          # Application React
│   ├── components/              # Layouts, cards, UI components, ThemeProvider
│   ├── pages/                   # Toutes les pages (public, dashboard, admin)
│   │   ├── admin/               # Pages d'administration
│   │   └── ...                  # Pages publiques, Auth, Dashboard
│   ├── lib/                     # Auth, DB, types, Supabase sync, utils
│   ├── services/                # Services (Gemini IA)
│   ├── data/                    # Institutions réelles et logos
│   └── utils/                   # Utilitaires (cn, hash, etc.)
├── server/                      # API Express
│   ├── routes/                 # api.ts, auth.ts, masters.ts, agent.ts
│   ├── services/               # Logique métier
│   └── index.ts                # Point d'entrée du serveur
├── api/                         # Données Masters (JSON)
├── prisma/                      # Schéma Prisma et migrations
├── public/                      # Assets statiques
│   ├── images/                 # Hero image (hero-morocco.jpg)
│   ├── robots.txt              # SEO
│   └── sitemap.xml             # SEO
├── supabase/                    # Scripts SQL (schema, seed, RLS, stockage)
├── scripts/                     # Scripts de seed et configuration
├── .github/workflows/           # GitHub Actions (CI/CD, screenshots)
├── scraper/                     # Outils de scraping de données
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json
├── index.html
└── README.md
```

---

## 🚀 Installation

```bash
# 1️⃣ Cloner le dépôt
git clone https://github.com/abdertalibi-gif/concours.git
cd concours

# 2️⃣ Installer les dépendances
npm install

# 3️⃣ Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase et SMTP

# 4️⃣ Lancer le développement
npm run dev

# 5️⃣ Build de production
npm run build

# 6️⃣ Lancer en production
npm start
```

---

## 🔐 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (client) |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase (client) |
| `SUPABASE_URL` | URL du projet Supabase (serveur) |
| `SUPABASE_ANON_KEY` | Clé anonyme Supabase (serveur) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (PRIVÉE — jamais côté client) |
| `SMTP_HOST` | Serveur SMTP pour les emails |
| `SMTP_PORT` | Port SMTP |
| `SMTP_USER` | Identifiant email |
| `SMTP_PASSWORD` | Mot de passe application |
| `EMAIL_FROM` | Adresse d'envoi des emails |
| `JWT_SECRET` | Secret pour la signature des tokens |
| `APP_URL` | URL de base de l'application |
| `DATABASE_URL` | URL de connexion PostgreSQL (Prisma) |

> **⚠️ Sécurité** : Ne jamais commiter les valeurs réelles. Le fichier `.env` est exclu par `.gitignore`.

---

## 🌐 Déploiement

### Frontend — Vercel
- Hébergé sur **Vercel** avec configuration `vercel.json`
- Build automatique sur push vers `main` via GitHub Actions
- Domaine : `concours-hub-maroc212.vercel.app`

### Backend — Cloudflare Workers
- Déployé via `npm run deploy` (utilise `wrangler`)
- Routes API : `/api/masters`, `/api/auth`, `/api/agent`

### CI/CD — GitHub Actions
- **`ci.yml`** : Lint TypeScript → Build → Déploiement Vercel
- **`screenshots.yml`** : Capture automatique des pages après déploiement

---

## 👨‍💻 Développeur

**Abderrahim Talibi**

Étudiant en Master d'Excellence en Sciences des Données et Intelligence Artificielle (SDIA) à l'Université Moulay Ismaïl — Faculté des Sciences de Meknès.

Intérêts professionnels :
- Software Engineering
- Full-Stack Development
- Backend Development
- AI & Data Engineering

---

## 🔗 Liens

- **Live Demo** : [https://concours-hub-maroc212.vercel.app/](https://concours-hub-maroc212.vercel.app/)
- **GitHub Repository** : [https://github.com/abdertalibi-gif/concours](https://github.com/abdertalibi-gif/concours)

---

## 📄 Licence

© 2026 **Abderrahim Talibi** — Licence d'Excellence SDIA, Université Moulay Ismaïl, Faculté des Sciences de Meknès. Tous droits réservés.
