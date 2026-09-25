# 🇲🇦 Concours Maroc

**La plateforme numéro 1 au Maroc pour tous les concours, examens et formations.**

Trouvez les concours des ministères, grandes écoles, universités et instituts marocains. Préparez-vous efficacement avec les ressources, les anciens examens et les formations disponibles.

---

## 🎯 Objectif

Centraliser toutes les informations relatives aux concours au Maroc : dates limites, conditions d'accès, programmes, documents officiels et ressources de préparation.

### Fonctionnalités publiques
- 📋 **Concours** : Liste et détail des concours avec filtres avancés (ministère, école, ville, niveau, statut)
- 🎓 **Masters** : Concours d'accès aux masters universitaires 2026-2027
- 📝 **Examens** : Anciens sujets d'examen avec corrections
- 🏫 **Écoles & Universités** : Catalogue complet des établissements marocains
- 📄 **Documents** : Avis, convocations, résultats, programmes officiels
- 📚 **Préparation** : Cours, exercices et concours blancs
- 🔍 **Recherche globale** : Recherche dans toutes les catégories
- 📱 **Responsive** : Mobile, tablette, desktop
- 🌙 **Mode sombre/clair** : Thème automatique ou manuel

### Espace utilisateur
- 🔐 Authentification (inscription, connexion, mot de passe oublié)
- ⭐ Favoris et suivis
- 🔔 Notifications
- 📊 Tableau de bord personnel
- 👤 Profil et paramètres

### Administration
- 🛠️ CRUD complet du catalogue (concours, masters, écoles, universités, ministères, examens, documents, cours)
- 👥 Gestion des utilisateurs
- 📊 Statistiques et rapports
- 🤖 IA Agent pour le scraping et l'extraction automatique
- 📤 Import/Export de données

---

## 🖥️ Pages / Routes

| Section | Route | Description |
|---------|-------|-------------|
| Public | `/` | Accueil |
| | `/masters` | Liste des masters |
| | `/concours` | Liste des concours |
| | `/concours/:slug` | Détail d'un concours |
| | `/ecoles` | Liste des écoles |
| | `/ecoles/:slug` | Détail d'une école |
| | `/examens` | Liste des examens |
| | `/examens/:slug` | Détail d'un examen |
| | `/examens/viewer/:slug` | Visionneuse PDF |
| | `/documents` | Catalogue des documents |
| | `/preparation` | Liste des cours |
| | `/preparation/cours/:slug` | Détail d'un cours |
| | `/connexion` | Connexion |
| | `/inscription` | Inscription |
| | `/mot-de-passe-oublie` | Réinitialisation du mot de passe |
| | `/a-propos`, `/faq`, `/contact` | Pages statiques |
| Dashboard | `/dashboard` | Tableau de bord utilisateur |
| Admin | `/admin` | Espace d'administration |

---

## 🛠️ Technologies

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7 |
| **UI** | Composants réutilisables (cards, formulaires, badges, modales) |
| **Backend** | Express 5, TypeScript, Prisma 5 (ORM) |
| **Base de données** | PostgreSQL (Prisma) + Supabase (sync, storage) |
| **Auth** | Hash de mots de passe + JWT + Supabase Auth |
| **Email** | Nodemailer (SMTP) |
| **IA** | Google Gemini (Agent de scraping) |
| **Scraping** | Cheerio |
| **CI/CD** | GitHub Actions |
| **Déploiement** | Vercel (frontend), Cloudflare Workers (backend) |

---

## 📁 Structure du projet

```
concours-maroc/
├─ src/                     # Application React
│   ├─ components/         # Layout, cards, UI components, ThemeProvider
│   ├─ pages/             # Toutes les pages (public, dashboard, admin)
│   ├─ lib/               # Auth, DB, Supabase sync, types, seed, utils
│   ├─ services/          # Services (Gemini IA)
│   ├─ data/              # Institutions réelles et logos
│   └─ utils/             # cn() pour classNames
├─ server/                # API Express
│   ├─ routes/           # api.ts, auth.ts, masters.ts, agent.ts
│   ├─ services/         # Logique métier
│   └─ index.ts          # Point d'entrée du serveur
├─ api/                   # Données Masters
├─ prisma/               # Schéma Prisma
├─ public/               # Assets statiques
│   ├─ images/           # Hero, screenshots
│   ├─ assets/logos/     # Logos officiels universités/écoles/ministères
│   ├─ robots.txt        # SEO
│   └─ sitemap.xml       # SEO
├─ supabase/             # Scripts SQL (schema, seed, RLS, stockage)
├─ scripts/              # Scripts de seed et configuration
├─ .github/workflows/     # GitHub Actions (CI/CD, screenshots)
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ vercel.json
├─ index.html
└─ README.md
```

---

## 🚀 Installation

```bash
# 1️⃣ Cloner le dépôt
git clone https://github.com/abdertalibi-gif/concours.git
cd concours

# 2️⃣ Installer les dépendances
npm ci

# 3️⃣ Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase et SMTP

# 4️⃣ Lancer le développement
npm run dev   # Serveur Express + Vite en mode dev

# 5️⃣ Build de production
npm run build

# 6️⃣ Lancer en production
npm start
```

---

## 🔐 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (client) | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase (client) | `sb_publishable_...` |
| `SUPABASE_URL` | URL du projet Supabase (serveur) | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clé anonyme Supabase (serveur) | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (PRIVÉE, jamais côté client) | `sb_service_...` |
| `SMTP_HOST` | Serveur SMTP | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `465` |
| `SMTP_USER` | Identifiant email | `user@gmail.com` |
| `SMTP_PASSWORD` | Mot de passe application | `votre_app_password` |
| `EMAIL_FROM` | Adresse From | `"Concours Maroc" <noreply@...>` |
| `JWT_SECRET` | Secret JWT (long, aléatoire) | `votre_secret_ici` |
| `APP_URL` | URL de base | `http://localhost:3000` |
| `DATABASE_URL` | URL Prisma PostgreSQL | `postgresql://...` |

> **⚠️ SECURITÉ** : Ne jamais commiter les valeurs réelles. Utiliser `.env.local` qui est exclu par `.gitignore`.

---

## 🗄️ Base de données

- **Prisma** (ORM) : `prisma/schema.prisma` — schéma complet (User, School, University, Ministry, Competition, Exam, Document, Course, Favorite, Follow, Application, Notification, UserProgress, Report, Master, SyncSummary)
- **Supabase** : Synchronisation bidirectionnelle localStorage ↔ Supabase pour les données publiques
- **Tables principales** : `profiles`, `app_users`, `ministries`, `universities`, `schools`, `competitions`, `exams`, `documents`, `courses`, `favorites`, `follows`, `applications`, `notifications`, `user_progress`, `reports`, `masters`
- **RLS** : Activé sur toutes les tables. Lecture publique pour les contenus publiés, écriture admin uniquement
- **Storage** : Bucket `documents` pour les fichiers PDF (20 Mo max)

---

## 🌐 Démo

**Démo en ligne** : [https://concours-hub-maroc212.vercel.app/](https://concours-hub-maroc212.vercel.app/)

---

## 📸 Captures d'écran

Des captures d'écran réelles sont générées automatiquement par GitHub Actions et stockées dans `public/images/screenshots/` :

| Page | Capture |
|------|---------|
| Accueil | `public/images/screenshots/home.png` |
| Masters | `public/images/screenshots/masters.png` |
| Concours | `public/images/screenshots/concours.png` |
| Documents | `public/images/screenshots/documents.png` |

Le README affiche automatiquement ces captures via la GitHub Actions workflow `screenshots.yml`.

---

## 🚀 Déploiement

### Frontend — Vercel
- Hébergé sur **Vercel** (`vercel.json` configuration)
- Build automatique sur push vers `main`
- Domaine : `concours-hub-maroc212.vercel.app`

### Backend — Cloudflare Workers
- Déployé via `npm run deploy` (utilise `wrangler`)
- Routes API : `/api/masters`, `/api/auth`, `/api/agent`, `/api/*`

### CI/CD — GitHub Actions
- **`ci.yml`** : Lint TypeScript → Build → Déploiement Vercel
- **`screenshots.yml`** : Capture automatique des pages après déploiement

---

## 🔒 Sécurité

- **Secrets** : JAMAIS de clés secrètes dans le frontend ou dans GitHub
- **`.env`** : Fichiers `.env.local` et `.env.vercel` exclus par `.gitignore`
- **RLS Supabase** : Policies restrictives — lecture publique limitée, écriture admin uniquement
- **JWT** : Secret configurable, durée de 1 heure
- **Password** : Hash avec bcrypt-equivalent (via `src/lib/utils.ts`)
- **CORS** : Configuré sur le serveur Express
- **Service Role** : Jamais exposé côté client

---

## ♿ Accessibilité

- Labels `aria-label` sur les icônes interactives
- Navigation clavier complète
- Contraste WCAG AA
- Focus visible sur tous les éléments interactifs
- `alt` text sur toutes les images
- `role` et `aria-modal` sur les modales

---

## 📄 Licence

© 2026 **Abderrahim Talibi** — Licence d'Excellence SDIA, Université Moulay Ismaïl, Faculté des Sciences de Meknès. Tous droits réservés.

---

*Dernière mise à jour : Septembre 2026*
