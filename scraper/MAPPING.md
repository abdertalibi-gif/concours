# Mapping Almaster — Spécification Phase 2A

> **Règle absolue respectée :** ce document est une spécification seule.
> Aucune donnée n'est injectée dans `src/`, `server/`, `api/`, Supabase, localStorage
> ou tables de production. Le scraper reste indépendant (`scraper/`).

Source : `scraper/lib/types.ts:19-47` (`ScrapedItem`) — 150 annonces validées
`scraper/logs/validation-20260919172550.txt:1`
Cibles : `src/lib/types.ts:120-171` (`Competition`), `src/lib/mastersAdapter.ts:10-37` (`MasterItem`)

Couverture réelle Almaster (dernier run `--refresh --validate` 2026-09-19) :
`title` 100% · `city`/`region` 100% · `university` 67% · `establishment` 81% ·
`domain` 60% · `officialUrl` 82% · `deadlineDate` 33% · `openingDate` 18% ·
`examDate` 15% · `resultsDate` 20% · `documents` 35% · `places` 0% · `conditions` 0%

---

## 1. Principes généraux

1. **Ne jamais inventer.** Si Almaster ne fournit pas la donnée de manière fiable
   (absence dans `contentText`/`links`/`tags`), le champ reste vide et le mapping
   porte `REQUIRES_REVIEW`.
2. **Dates** : normalisées ISO `YYYY-MM-DD` par `scraper/parsers/dates.ts:1`.
   Transformations documentées §4.
3. **Slug** §5, **ID** §6, **statut** §7, **relations université/établissement** §8.
4. Aucune modification du scraper n'est nécessaire pour ce mapping ; la
   spécification réutilise `fingerprint` (`scraper/normalizers/normalize.ts:10`)
   et `city→region` déjà produits.

---

## 2. Pour quels types d'annonces utiliser chaque mapping

| Type d'annonce Almaster | Exemple titre | Mapping à utiliser | Raison |
|---|---|---|---|
| **Master / Master Spécialisé** (98% du flux) | `Master FEG Béni Mellal`, `Master ENCG El Jadida` | **`ScrapedItem → MasterItem`** (puis `masterToCompetition` si besoin d'affichage unifié) | Modèle `MasterItem` conçu exactement pour ce cas (`mastersAdapter.ts:10`). Tous les champs y sont optionnels sauf `name`/`university`/`establishment`/`city`/`domain`/`level`/`academicYear`/`sourceUrl`. Flux Almaster filtré sur `title.includes('master')` (`server/services/almasterImporter.ts:169`). |
| **Présélection / Résultats / Listes** | `Présélection Master FS Ben M'Sik`, `Résultats Master FP Khouribga` | **`ScrapedItem → MasterItem` avec `status=RESULTATS`** | Même structure ; le statut `RESULTATS` est dérivé de `resultsDate`/`status` (`mastersAdapter.ts:116`). Ne pas créer de `Competition` directe : `masterToCompetition` (`mastersAdapter.ts:697`) injecte artificiellement `conditions`/`epreuves` génériques. |
| **Annonce non-Master** (rare, ex. `Masters Ouverts au Maroc`) | `Masters Ouverts au Maroc` | **Aucun mapping automatique** → `REQUIRES_REVIEW` | Hors périmètre ; `establishment`/`domain` souvent vides. Si import voulu, passer par `Competition` avec `category='FORMATION'` mais revue humaine obligatoire. |

**Recommandation :** Almaster → **toujours `MasterItem` d'abord**. `Competition` n'est atteinte que via
`masterToCompetition` (`src/lib/mastersAdapter.ts:697`, `src/lib/db.ts:314`) qui fusionne
masters + concours pour l'affichage. Créer une `Competition` directe depuis Almaster contournerait
cette couche et forcerait des valeurs par défaut (`places=35`, `matieres=[]`).

---

## 3. Mapping `ScrapedItem → MasterItem`

Référence cible `src/lib/mastersAdapter.ts:10-37` / `server/services/mastersService.ts:6-33` / `prisma/schema.prisma:425-448`.

| ScrapedItem | Destination `MasterItem` | Transformation | Si vide | Obligatoire ? |
|---|---|---|---|---|
| `title` | `name` | `cleanTitle` (`scraper/normalizers/normalize.ts:20`) + trim. Garde le titre nettoyé (`RǸsultats` réparé). | `REQUIRES_REVIEW` — ne jamais importer sans titre | **Oui** (`name` required `mastersAdapter.ts:13`) |
| `organization` | *(non mappé)* — info redondante avec `university`+`establishment` | Ignoré. `MasterItem` n'a pas de champ `organization`. Conservé dans `scrapedAt` JSON source si besoin d'audit. | — | Non |
| `university` | `university` | Tel quel si présent ; sinon `REQUIRES_REVIEW` (ne pas forcer `Université au Maroc` comme `normalizeMaster` le fait `mastersAdapter.ts:148`). Preuve requise : alias ≥4 car. + `universit` à ±60 car. OU domaine `UNIVERSITY_DOMAINS` (`scraper/normalizers/infer.ts:1`). | `REQUIRES_REVIEW` — 50/150 vides (33%). *Actuel : ne pas injecter la valeur par défaut `Université au Maroc`.* | **Oui** (required `mastersAdapter.ts:14`, mais `prisma:429` nullable → revue avant import) |
| `establishment` | `establishment` | Tel quel ; alias ≥4 car. dans `contentHead` 1200 car. (`scraper/sources/almaster.ts:1`). | `REQUIRES_REVIEW` — 29/150 vides. Ne pas injecter `Établissement Universitaire` par défaut (`mastersAdapter.ts:147`). | **Oui** (required `mastersAdapter.ts:15`) |
| `city` | `city` | Tel quel ; 100% rempli (150/150) via `MOROCCAN_CITIES` + titre/tags (`scraper/sources/almaster_aliases.ts:1`). Si ville=Maroc générique → `REQUIRES_REVIEW`. | `REQUIRES_REVIEW` si `Maroc` (cas théorique, 0 actuel) | **Oui** (`mastersAdapter.ts:16`) |
| `region` | *(dérivé, non stocké tel quel dans `MasterItem`)* | `inferRegion(city)` via `CITY_REGIONS` (`scraper/sources/almaster_aliases.ts:1`). `MasterItem` n'a pas `region` — utilisé seulement si conversion ultérieure vers `Competition.region`. | Si `city` vide → `REQUIRES_REVIEW` | Non (MasterItem) |
| `domain` | `domain` | Tel quel via `inferDomain` (`scraper/normalizers/infer.ts:1`) — 9 règles mots-clés. 60/150 vides (40%). | `REQUIRES_REVIEW` — 60 vides, souvent résultats/présélections sans mention de filière. Ne pas forcer `Formation Universitaire`. | **Oui** (required `mastersAdapter.ts:17`, mais Prisma nullable) |
| `level` | `level` | `inferLevel(title+tags)` → `Master`/`Master Spécialisé` (`scraper/normalizers/infer.ts:1`). Toujours `Master (Bac+5)` dans l'échantillon (100%). | Jamais vide actuellement ; si vide → `Master` par défaut acceptable (niveau implicite Master). | **Oui** (`mastersAdapter.ts:18`) |
| `academicYear` | `academicYear` | Regex `20\d{2}[-–/]20\d{2}` (`scraper/normalizers/infer.ts:1`) → `YYYY-YYYY`. 150/150 rempli. | `REQUIRES_REVIEW` — année indispensable pour `uniqueKey`. Si vide, déduire `2026-2027` seulement si date 2026 présente. | **Oui** (`mastersAdapter.ts:19`) |
| `description` | `conditions`/`documents` ne sont pas `description` dans MasterItem ; `description` n'existe pas dans MasterItem | `description` (150/150) = `contentText` nettoyé. **Non importée** dans `MasterItem` (pas de champ). Conservée comme `sourceUrl` audit. Si besoin futur : stocker en `conditions` texte brut. | — | Non |
| `conditions` | `conditions` | `string \| null` (`mastersAdapter.ts:25`). Almaster : **0/150** — flux ne structure jamais les conditions. Toujours vide. | `null` → `REQUIRES_REVIEW` si import. `masterToCompetition` injecte un texte générique (`mastersAdapter.ts:741`) — **ne pas confondre avec donnée réelle**. | Non (`string \| null`) |
| `documents` | `documents` | `string \| null` — concat PDF détectés (`scraper/sources/almaster.ts:1` `pickLinks` PDF→documents : 52/150 = 35%). Joint par `,` ou `;`. | `null` si aucun PDF — normal (98/150). Pas bloquant. | Non |
| `places` | `seats` | `number \| null` (`mastersAdapter.ts:27`). Almaster : **0/150** — jamais annoncé. Toujours `undefined`/`null`. | `null` → `REQUIRES_REVIEW`. `masterToCompetition` force `35` (`mastersAdapter.ts:776`) — valeur artificielle. | Non (`number \| null`) |
| `openingDate` | `openingDate` | ISO `YYYY-MM-DD` ou `null`. 27/150 (18%). Via `extractDates` (`scraper/parsers/dates.ts:1`) — plage `du X au Y` : `openingDate`=début. Plausibilité vs `publishedAt` (`dates.ts:257`). | `null` — normal (123/150). Ne pas inventer. | Non |
| `deadlineDate` | `deadlineDate` | ISO `YYYY-MM-DD` ou `null`. 49/150 (33%). Plage → fin de plage. Plausibilité : rejet si antérieure à `publishedAt -2j` (`dates.ts:269`). | `null` (101/150) → `REQUIRES_REVIEW` si `status` attendu `OUVERT`/`A_VENIR`. | Non |
| `examDate` | `examDate` | ISO `YYYY-MM-DD` ou `null`. 22/150 (15%). Mot-clé `concours`/`épreuve`/`test`+ date. | `null` (128/150) — normal pour annonces résultats. | Non |
| `resultsDate` | `resultsDate` | ISO `YYYY-MM-DD` ou `null`. 30/150 (20%). Mot-clé `résultat`/`affichage`/`publication`. | `null` (120/150) — normal. | Non |
| `officialUrl` | `officialUrl` | URL `.ma` prioritaire, filtrage social/Almaster (`scraper/sources/almaster.ts:1` `isForbiddenUrl`). 123/150 (82%). | `null` (27/150) — légitime pour résultats. | Non |
| `registrationUrl` | `officialUrl` (fallback) | `pickLinks` sépare `registrationUrl` (candidature) vs `officialUrl`. `MasterItem` n'a qu'un seul `officialUrl` — `registrationUrl` y est replié : `raw.officialUrl \|\| raw.registrationUrl` (`mastersAdapter.ts:143`). 78/150 (52%). | `null` si aucun des deux. | Non |
| `sourceUrl` | `sourceUrl` | Tel quel — URL Almaster. 150/150 (100%). | Jamais vide — `REQUIRES_REVIEW` si vide (annonce inexploitable). | **Oui** (`mastersAdapter.ts:29` required) |
| `category` | *(non mappé)* | `category` Almaster = toujours `master`. `MasterItem` n'a pas `category`. | — | Non |
| `source` | *(audit)* | `source='almaster'` — conservé hors `MasterItem` (log `scrapedAt`). Utile pour `sourceUrl` traçabilité. | — | Non |
| `publishedAt` | `publicationDate` | ISO `YYYY-MM-DDTHH:mm:ss.sssZ` du flux Blogger. Copié vers `publicationDate` (`mastersAdapter.ts:23`). | `null` si absent — non bloquant. | Non |

**Champs générés côté `MasterItem` (non issus de `ScrapedItem`) :**

| Champ `MasterItem` | Génération | Règle |
|---|---|---|
| `id` | `mst-${Date.now()}-${random}` (`server/services/mastersService.ts:612`, `mastersAdapter.ts:73`) | Toujours généré. Alternative déterministe : `fingerprint` (`scraper/normalizers/normalize.ts:10` `slugify(title)\|slugify(orgRef)\|year`). |
| `uniqueKey` | `generateUniqueKey(university,establishment,name,academicYear)` (`mastersService.ts:583`) | `slug(university)-slug(establishment)-slug(name)-year`. Clé de dédup. Nécessite `university`+`establishment` → si l'un manque, `REQUIRES_REVIEW` avant génération. |
| `status` | `computeMasterStatus` (`mastersService.ts:408`, `mastersAdapter.ts:112`) | Voir §7. Recalculé à chaque `getMastersStore` / `normalizeMaster`. |
| `createdAt`/`updatedAt` | `new Date().toISOString()` | Générés à l'import. `scrapedAt` du `ScrapedItem` conservé en audit. |
| `schoolId`/`schoolSlug`/`schoolWebsite`/`universityWebsite` | `resolveSchoolMeta`/`resolveUniversityMeta` (`mastersAdapter.ts:372`, `504`) | Enrichissement post-import via `REAL_SCHOOLS`. Non calculé dans le scraper. |

---

## 4. Mapping `ScrapedItem → Competition`

Référence cible `src/lib/types.ts:120-171` (+ `supabase/schema.sql:85`, `prisma/schema.prisma:175`).

> **Avertissement :** créer une `Competition` directe depuis Almaster est **déconseillé**.
> Le chemin recommandé est `ScrapedItem → MasterItem → Competition` via
> `masterToCompetition` (`mastersAdapter.ts:697`) qui centralise déjà les valeurs
> par défaut et la résolution `schoolId`/`universityId`. Le tableau ci-dessous
> documente néanmoins la correspondance directe pour audit.

| ScrapedItem | Destination `Competition` | Transformation | Si vide | Obligatoire ? |
|---|---|---|---|---|
| `title` | `title` | `cleanTitle` trim. | `REQUIRES_REVIEW` | **Oui** (`types.ts:123` required, `AdminConcours.tsx:188` validé) |
| `organization` | `organizationName` | `establishment \|\| university \|\| organization` — préférence établissement (`mastersAdapter.ts:708`). | `REQUIRES_REVIEW` — 8/150 vides (5%) → ne pas inventer | **Oui** (`types.ts:124` required) |
| *(dérivé)* | `organizationType` | `university`/`establishment` présent → `'INSTITUTION'` ou `'ECOLE'` selon `REAL_SCHOOLS`. Almaster = universitaire → `'INSTITUTION'` par défaut. `resolveOrganisme` (`src/lib/organismeResolver.ts:30`) en Phase 2B. | Jamais vide (valeur par défaut) | **Oui** (`types.ts:125` `OrgType`) |
| *(dérivé)* | `schoolId` / `universityId` / `ministryId` | `resolveSchoolMeta` + `resolveUniversityMeta` (`mastersAdapter.ts:504`, `372`) / `resolveOrganisme` (`organismeResolver.ts:30`). Nécessite `establishment`+`university`. | `undefined` si non résolu — FK nullable (`types.ts:126,129`) | Non |
| `city` | `city` | Tel quel. 100% rempli. | `REQUIRES_REVIEW` | **Oui** (`types.ts:138` required) |
| `region` | `region` | `inferRegion(city)` via `CITY_REGIONS`. 100% rempli depuis Phase 1.1. | `REQUIRES_REVIEW` | **Oui** (`types.ts:139` required) |
| `domain` | `domaine` | Tel quel ; `domain` → `domaine`. 60/150 vides. | `undefined` → `REQUIRES_REVIEW` si affichage par domaine requis | Non (`types.ts:140` optional) |
| `level` | `level` | Tel quel (`Master`/`Master Spécialisé`). | `Master` par défaut | **Oui** (`types.ts:137` required) |
| `academicYear` | `year` | `parseInt(academicYear.split('-')[0])` (`mastersAdapter.ts:755`). Ex. `2026-2027` → `2026`. | `REQUIRES_REVIEW` | **Oui** (`types.ts:136` `year: number` required) |
| `description` | `description` | `contentText` (150/150). `Competition.description` required (`types.ts:142`). Si `description` Almaster trop courte (<50 car.) → `REQUIRES_REVIEW` (actuellement 0/150 trop courtes). | `REQUIRES_REVIEW` — ne pas laisser vide | **Oui** (`types.ts:142` required, `AdminConcours.tsx:190`) |
| `conditions` | `conditions` | `string[]` (`types.ts:143` required). Almaster 0/150 → **toujours vide**. `masterToCompetition` injecte 4 conditions génériques (`mastersAdapter.ts:741`). **Pour import direct : `REQUIRES_REVIEW` — ne pas importer les génériques comme donnée réelle.** | `REQUIRES_REVIEW` | **Oui** (`types.ts:143` required) |
| `documents` | `documentsDemandes` | `string[]` — PDF détectés 52/150. Split `,` (`mastersAdapter.ts:726`). Si `documents` vide → générique 5 docs (`mastersAdapter.ts:728`). **Import direct : `REQUIRES_REVIEW` si vide.** | `REQUIRES_REVIEW` | **Oui** (`types.ts:148` `documentsDemandes: string[]` required) |
| `places` | `places` | `number` required (`types.ts:141`). Almaster **0/150** — jamais fourni. `masterToCompetition` force `35` (`mastersAdapter.ts:776`). **Import direct : `REQUIRES_REVIEW` — ne pas inventer 35.** | `REQUIRES_REVIEW` | **Oui** (`types.ts:141` required, `AdminConcours.tsx:191` `places<1` invalide) |
| `openingDate` | `registrationStart` | ISO `YYYY-MM-DD` → stocké tel quel (optionnel `types.ts:152`). | `undefined` | Non |
| `deadlineDate` | `registrationDeadline` | ISO `YYYY-MM-DD`. | `undefined` → `DATE_A_VERIFIER` côté statut | Non |
| `examDate` | `competitionDate` | ISO `YYYY-MM-DD` (`types.ts:154`). | `undefined` | Non |
| `resultsDate` | `resultsDate` | ISO `YYYY-MM-DD` (`types.ts:156`). | `undefined` | Non |
| `officialUrl` | `officialWebsite` | URL `.ma` filtrée. Optionnel (`types.ts:158`). | `undefined` | Non |
| `registrationUrl` | `registrationUrl` | Tel quel (`types.ts:159`). | `undefined` | Non |
| `sourceUrl` | `sourceUrl` | Tel quel (`types.ts:160`). | `undefined` | Non |
| `category` | `category` | Almaster `master` → `'UNIVERSITE'` (`mastersAdapter.ts:763`). | `'UNIVERSITE'` par défaut | **Oui** (`types.ts:135` `CompetitionCategory` required) |
| `publishedAt` | `publishedAt` | ISO du flux. Required (`types.ts:157`). Si vide → `scrapedAt` ou `now`. | `REQUIRES_REVIEW` | **Oui** |
| *(générés)* | `id` / `slug` / `verificationStatus` / `publishStatus` / `views` / `isDemo` / `createdAt` / `updatedAt` / `matieres` / `epreuves` | Voir §§5-7. `matieres=[]`, `epreuves` dérivée de `examDate` (`mastersAdapter.ts:747`), sinon générique 3 phases. | Toujours générés | **Oui** pour `id`/`slug`/`verificationStatus`/`publishStatus` |

---

## 5. Slug

* **MasterItem** : pas de `slug` — `uniqueKey` en tient lieu (`mastersService.ts:583`).
  `slug(university)-slug(establishment)-slug(name)-academicYear` via NFD + `[^a-z0-9]→-`.
* **Competition** : `slugify(organizationName-title-year)` (`src/lib/utils.ts:10`, `AdminConcours.tsx:209`)
  — NFD, `[^a-z0-9]+→-`, tronqué 80 car. Doublon vérifié par `slug` OU `sourceUrl` OU `schoolId+title+year` (`AdminConcours.tsx:484`).
* **Scraper** : `fingerprint = slugify(title)|slugify(orgRef)|year` (`scraper/normalizers/normalize.ts:10`)
  — réutilisable comme `uniqueKey` déterministe (remplace `Date.now()` aléatoire si besoin de dédup inter-runs).

---

## 6. ID

* **MasterItem** : `mst-${Date.now()}-${random}` (`mastersService.ts:612`) ou `mst-import-…` (`almasterImporter.ts:214`).
  En Phase 2B, préférer `fingerprint` du scraper pour idempotence.
* **Competition** : `uid('c') = c_${Date.now().toString(36)}_${random}` (`src/lib/utils.ts:6`, `AdminConcours.tsx:221`)
  ou `uuid()` côté Prisma (`prisma/schema.prisma:181`). `masterToCompetition` réutilise `m.id` comme `Competition.id`/`slug` (`mastersAdapter.ts:759`).

---

## 7. Statut

* **MasterItem** : `computeMasterStatus` (`mastersService.ts:408`, `mastersAdapter.ts:112`)
  `resultsDate<=now` → `RESULTATS` ; sinon `deadlineDate`+`openingDate`+`examDate` → `FERME`/`CONCOURS_A_VENIR`/`A_VENIR`/`OUVERT` ; sinon `INFORMATION`. Recalculé à chaque lecture (`getMastersStore:335`, `normalizeMaster:112`).
* **Competition** : `statusFromCompetition` / `evaluateCompetitionDates` (`src/lib/utils.ts:99`, `304`)
  `registrationStart`/`registrationDeadline` → `OUVERT`/`A_VENIR`/`CLOTURE`/`DATE_A_VERIFIER`. `manualStatus` ignoré par `statusFromCompetition` ; `masterToCompetition:712` mappe `FERME→Ferme`, `A_VENIR/CONCOURS_A_VENIR→Bientot`.
* **ScrapedItem** n'a pas de `status` — calculé uniquement après mapping.

---

## 8. Correspondance `university`/`establishment` → relations site

`Competition` stocke à la fois les noms dénormalisés (`organizationName`) et les FK
(`schoolId`, `universityId`, `ministryId` — `types.ts:126-130`, `supabase/schema.sql:91-93`).

Résolution (Phase 2B) :
1. `resolveSchoolMeta(establishment, university)` (`mastersAdapter.ts:504`) — match `REAL_SCHOOLS` par `shortName`/`name`/`slug`/`aliases` normalisés, puis annuaire `knownFaculties` (FSR, FSSM, FSA…), fallback `resolveUniversityMeta`.
2. `resolveUniversityMeta(name)` (`mastersAdapter.ts:372`) — 13 universités mappées par mots-clés (`mohammed v`, `hassan ii`, `cadi ayyad`…).
3. `resolveOrganisme(corpus)` (`src/lib/organismeResolver.ts:30`) — fuzzy sur `db.schools`+`universities`+`ministries` (scoring aliases).

Almaster ne fournit **jamais** `schoolId`/`universityId` — ces FK sont **toujours dérivés**.
Si `establishment` ou `university` = `REQUIRES_REVIEW`, la résolution FK est bloquée.

---

## 9. Synthèse — Champs par catégorie d'import

### Automatiquement importables (sans revue, 100% ou 82%+ fiables)

`title→name`, `city`, `region` (via ville), `academicYear→year`, `description` (vers `Competition.description` uniquement — 150/150), `sourceUrl`, `level`, `officialUrl`/`registrationUrl` (82%/52% — absence = `null` légitime pour résultats).

### Nécessitent validation humaine (`REQUIRES_REVIEW`)

`university` (50/150 vides), `establishment` (29/150), `domain`/`domaine` (60/150),
`deadlineDate`/`openingDate`/`examDate`/`resultsDate` (67-85% vides — absence fréquente mais critique pour statut),
`documents`/`documentsDemandes` (65% vides), `uniqueKey`/`slug` si `university`/`establishment` manquent,
`organizationName` si `establishment` vide, `category` si annonce non-Master.

### Impossibles à récupérer correctement depuis Almaster (toujours `REQUIRES_REVIEW`)

`places`/`seats` — **0/150**, jamais annoncé.
`conditions`/`conditions[]` — **0/150**, jamais structuré.
`matieres` (`Competition.matieres: string[]` required) — jamais fourni.
`places`, `conditions`, `matieres` sont **obligatoires** côté `Competition` (`types.ts:141,143,146`)
et validés (`AdminConcours.tsx:191`) — tout import direct sans revue **échouerait la validation**.
`procedure`, `frais`, `resultats`, `convocationDate` — absents du flux.

---

## 10. Ambiguïtés restantes

1. **Dates 67% vides** : 78/150 sans aucune date (`validation:18`). Impossible de calculer un statut fiable → `INFORMATION`/`DATE_A_VERIFIER`. Les annonces de résultats n'ont souvent **aucune** date future — comportement normal, mais bloque un import `OUVERT`.
2. **Établissements ambigus** : `FS`, `FST`, `FLSH` existent dans plusieurs villes (`FS Agadir` vs `FS Oujda`). Sans ville explicite, l'inférence `UNIVERSITY_DOMAINS` peut être fausse — d'où la règle preuve contenu/URL (`infer.ts:1`).
3. **Domaines** : 60/150 sans `domain` — les intitulés `Master X` ne mentionnent pas toujours la discipline. `inferDomain` à 9 règles reste heuristique.
4. **Doublons inter-sources** : `fingerprint` déterministe du scraper vs `uniqueKey` aléatoire du site — à unifier en Phase 2B (choisir `fingerprint` comme `uniqueKey`).
5. **Annonces `INFORMATION`** : `Master ISADAC Rabat` (`validation:119`) a `officialUrl` mais aucun `establishment`/`university` — probablement privée hors `REAL_SCHOOLS`. Mapping `MasterItem` forcera des valeurs par défaut artificielles si importé sans revue.
6. **Langue mixte** : titres/descriptions FR+AR (`نتائج الانتقاء…`). `normalizeStr` gère FR, pas l'arabe — pas d'impact sur dates/villes mais `domain` AR non détecté.

---

*Généré Phase 2A — 2026-09-19 — scraper indépendant, aucune injection.*
