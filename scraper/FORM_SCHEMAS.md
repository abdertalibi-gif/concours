# Form Schema Registry — Concours Maroc

> **Analyse READ-ONLY** — 2026-09-19 — Aucune modification UI/DB/fields.
> Source exhaustive : `src/pages/admin/*`, `src/pages/Auth.tsx`, `src/components/AutoOrganismeField.tsx`, `src/App.tsx:80-99` (routes), `src/lib/types.ts`, `src/lib/utils.ts`, `src/data/institutionsData.ts`.

---

## 1. ConcoursForm — `AdminConcours.tsx`

**File:** `src/pages/admin/AdminConcours.tsx:175-427` · **Route:** `/admin/concours` (`src/App.tsx:83`) · **Entity:** `Competition` (`src/lib/types.ts:120`) · **DB table:** `competitions` (`supabase/schema.sql:85`, `DatabaseShape.competitions`) · **Submit:** `save()` `AdminConcours.tsx:200` → `validate()` `:187` → `adminCreate('competitions', …)` `:219` / `adminUpdate` `:217` · **Modes:** `create` (`emptyForm()` `:18`) / `edit` (`editing` `:33`) / `duplicate` `:58` / `BulkImportModal` `:439`

### Fields

| Field | Label FR | HTML type | Component | Req | Default | Placeholder | Validation | Allowed values / Source | DB relation | DB field | Transform before save | Conditional |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `organizationType` | Type d'organisme * | `select` | `Select` (`ui.tsx:199`) | Yes* | `MINISTERE` | — | visuel `*`, pas dans `validate()` | `MINISTERE,ECOLE,INSTITUTION` static `:266` | — | `organizationType: OrgType` (`types.ts:125`) | `e.target.value` `:265` | always |
| `organizationName` | Nom de l'organisme * | `input text` | `Input` (`ui.tsx:163`) | **Yes** | `''` | `Ex : ENSA Marrakech` `:272` | `validate():192` `!trim() → "Le nom de l'organisme est requis."` | free text | — | `organizationName: string` (`types.ts:124`) | `trim()` `:207` | always |
| `schoolId` | École liée | `select` | `Select` | No | `undefined` | `— Aucune —` `:277` | — | `db.schools[].id` (`db.schools.map` `:278`) | FK `schools.id` (`types.ts:126`) | `schoolId?:string` | `value\|\|undefined` `:276` | IF `organizationType==='ECOLE'` `:274` |
| `ministryId` | Ministère lié | `select` | `Select` | No | `undefined` | `— Aucune —` `:285` | — | `db.ministries[].id` `:286` | FK `ministries.id` (`types.ts:130`) | `ministryId?:string` | `value\|\|undefined` `:284` | IF `organizationType==='MINISTERE'` `:282` |
| `logoColor` | Couleur du logo | `button` color picker | `button type=button` `:290` | No | `#0D47A1` (`COLORS[0]` `:16`) | — | — | `COLORS` 10 hex `:16` | — | `logoColor?:string` (`types.ts:134`) | `set('logoColor',c)` `:293` | always |
| `title` | Titre du concours * | `input text` | `Input` | **Yes** | `''` | `Ex : Concours d'accès en 1ère année` `:330` | `validate():189` `!trim() → "Le titre est requis."` | free | `title: string` (`types.ts:123`) | `trim()` `:207` | — |
| `description` | Description * | `textarea rows=3` | `Textarea` (`ui.tsx:190`) | **Yes** | `''` | `Présentation du concours...` `:333` | `validate():191` `!trim() → "La description est requise."` | free | `description: string` (`types.ts:142`) | none (spread `...f`) | — |
| `category` | Catégorie | `select` | `Select` | No | `MINISTERE` | — | — | `MINISTERE,ECOLE,UNIVERSITE,INSTITUTION,RECRUTEMENT,AUTRE` `:337` | `category: CompetitionCategory` (`types.ts:135`) | direct | — |
| `year` | Année | `input number` | `Input type=number` | No | `now.getFullYear()` | — | — | number | `year: number` (`types.ts:136`) | `parseInt(v)\|\|nowYear` `:341` | — |
| `places` | Places * | `input number min=1` | `Input type=number` | **Yes** | `100` | — | `validate():192` `!places\|\|places<1 → "Nombre de places invalide."` + `min=1` | int ≥1 | `places: number` (`types.ts:141`) | `parseInt(v)\|\|0` `:342` | — |
| `level` | Niveau | `select` | `Select` | No | `Bac+3` | — | — | `LEVELS` `src/lib/utils.ts:444` `Bac,Bac+0..Bac+6,Doctorat,Tous niveaux` | `level: string` (`types.ts:137`) | direct | — |
| `city` | Ville | `select` | `Select` | No | `Rabat` | — | — | `CITIES` `utils.ts:460` 17 villes | `city: string` (`types.ts:138`) | direct | — |
| `domaine` | Domaine | `select` | `Select` | No | `undefined` | `—` `:346` | — | `DOMAINS` `utils.ts:479` 11 + empty | `domaine?:string` (`types.ts:140`) | `value\|\|undefined` `:345` | — |
| `region` | Région | `input text` | `Input` | No | `Rabat-Salé-Kénitra` | — | — | free (suggère `REGIONS` `utils.ts:492` 12) | `region: string` (`types.ts:139`) | direct | — |
| `registrationStart` | Ouverture des inscriptions | `input date` | `Input type=date` | No | `undefined` | — | cross-field `deadline<start → error` `:193` | ISO date | `registrationStart?:string` (`types.ts:152`) | `toDateInput()` display `:234` / save `new Date(v).toISOString()` `:366` | — |
| `registrationDeadline` | Clôture des inscriptions | `input date` | `Input type=date` | No | `undefined` | — | same + `error={!!errors.registrationDeadline}` | ISO | `registrationDeadline?:string` (`types.ts:153`) | same | — |
| `competitionDate` | Date du concours | `input date` | `Input type=date` | No | `undefined` | — | — | ISO | `competitionDate?:string` (`types.ts:154`) | same | — |
| `convocationDate` | Date de convocation | `input date` | `Input type=date` | No | `undefined` | — | — | ISO | `convocationDate?:string` (`types.ts:155`) | same | — |
| `resultsDate` | Date des résultats | `input date` | `Input type=date` | No | `undefined` | — | — | ISO | `resultsDate?:string` (`types.ts:156`) | same | — |
| `conditions` | Conditions d'accès (une par ligne) | `textarea rows=3` | `Textarea` | No | `[]` → `conditionsTxt=""` `:178` | — | — | free lines | `conditions: string[]` (`types.ts:143`) | `split('\n').map(trim).filter(Boolean)` `:210` | — |
| `epreuves` | Épreuves (une par ligne) | `textarea rows=3` | `Textarea` | No | `[]` → `epreuvesTxt` `:180` | — | — | free | `epreuves: string[]` (`types.ts:147`) | `split('\n')` `:212` | — |
| `matieres` | Matières (séparées par des virgules) | `input text` | `Input` | No | `[]` → `matieresTxt` `:179` | `Mathématiques, Physique` | — | comma-split | `matieres: string[]` (`types.ts:146`) | `split(',').map(trim).filter(Boolean)` `:211` | — |
| `documentsDemandes` | Documents demandés (un par ligne) | `textarea rows=3` | `Textarea` | No | `[]` → `docsTxt` `:181` | — | — | free | `documentsDemandes: string[]` (`types.ts:148`) | `split('\n')` `:213` | — |
| `profil` | Profil demandé | `textarea rows=2` | `Textarea` | No | `''` | — | — | free | `profil?:string` (`types.ts:144`) | direct | — |
| `programme` | Programme | `textarea rows=2` | `Textarea` | No | `''` | — | — | free | `programme?:string` (`types.ts:145`) | direct | — |
| `procedure` | Procédure d'inscription | `textarea rows=2` | `Textarea` | No | `''` | — | — | free | `procedure?:string` (`types.ts:149`) | direct | — |
| `frais` | Frais éventuels | `input text` | `Input` | No | `''` | — | — | free | `frais?:string` (`types.ts:150`) | direct | — |
| `resultats` | Résultats | `textarea rows=2` | `Textarea` | No | `''` | — | — | free | `resultats?:string` (`types.ts:151`) | direct | — |
| `officialWebsite` | Site officiel | `input text` (url) | `Input` | No | `undefined` | `https://…` | `validate():195` `!/^https?:\/\/.+/ → "URL invalide"` | url | `officialWebsite?:string` (`types.ts:158`) | `value\|\|undefined` | — |
| `registrationUrl` | Inscription officielle | `input text` (url) | `Input` | No | `undefined` | `https://…` | `validate():194` same | url | `registrationUrl?:string` (`types.ts:159`) | `value\|\|undefined` | — |
| `sourceUrl` | URL source | `input text` (url) | `Input` | No | `undefined` | `https://…` | — | url | `sourceUrl?:string` (`types.ts:160`) | `value\|\|undefined` | — |
| `sourceOrganization` | Organisme source | `input text` | `Input` | No | `undefined` | — | — | free | `sourceOrganization?:string` (`types.ts:161`) | `value\|\|undefined` | — |
| `publishStatus` | Statut de publication | `select` | `Select` | No | `DRAFT` | — | — | `DRAFT,Brouillon / PENDING_REVIEW / PUBLISHED / ARCHIVED` (`types.ts:19`) | `publishStatus: PublishStatus` (`types.ts:165`) | direct | — |
| `verificationStatus` | Vérification | `select` | `Select` | No | `UNVERIFIED` | — | — | `UNVERIFIED,PENDING,VERIFIED,EXPIRED` (`types.ts:18`) | `verificationStatus: VerificationStatus` (`types.ts:162`) | direct | — |
| `manualStatus` | Forcer le statut | `select` | `Select` | No | `undefined` (Automatique) | — | — | `"",Ouvert,Bientot,Ferme,Suspendu,Archive` (`CompetitionStatus` `types.ts:11`) | `manualStatus?:CompetitionStatus` (`types.ts:166`) | `value\|\|undefined` | — |
| `isDemo` | Marquer comme DEMO | `input checkbox` | `input type=checkbox` | No | `false` | — | — | boolean | `isDemo: boolean` (`types.ts:168`) | `checked` `:416` | — |

### Conditional fields
```
IF organizationType = ECOLE THEN show schoolId
IF organizationType = MINISTERE THEN show ministryId
IF organizationType = ECOLE|MINISTERE AND (schoolId|ministryId) THEN show OrgAvatar preview (utils)
```

### Hidden / auto-filled
`id` = `uid('c')` (`utils.ts:6`) on create `:219` · `slug` = `slugify(organizationName-title-year)` (`utils.ts:10`) sliced 80 `:209` · `logoUrl` via `AutoOrganismeField` `resolveOrganisme` `:259` · `createdAt/updatedAt/publishedAt` = `now ISO` `:220-221` · `views=0` `:220` · `verifiedAt/verifiedBy` on verify `:82`

### Transformations
`toDateInput` (`utils.ts:234`) display · save `new Date(v).toISOString()` · `conditions/docs: split('\n')` · `matieres: split(',')` · `places/year: parseInt` · `trim()` sur `title/organizationName`

### Validation
`validate()` `:187-198` : `title`*, `organizationName`*, `description`*, `places>=1`, `deadline>=start`, `registrationUrl/officialWebsite` regex `^https?:\/\/.+`

### Buttons
`Annuler` `variant=outline` → close modal `:422` · `Créer/Enregistrer` `loading={saving}` → `save()` → `adminCreate/adminUpdate` + `pushNotification` si `PUBLISHED` `:226`

### DB flow
```
FORM FIELD → Competition.FIELD → competitions.COLUMN (supabase/schema.sql:85)
ex: organizationName → organizationName → organization_name
      registrationStart → registrationStart → registration_start
slug → slug → slug (UNIQUE)
```

### BulkImportModal (import JSON)
**File:** `AdminConcours.tsx:439-557` · **Handler:** `handleImport()` `:446` · `JSON.parse(jsonText)` `:449` · `resolveOrganisme()` `:470` · `adminCreate/adminUpdate` `:507` · **Dedup:** `slug` OR `sourceUrl` OR `schoolId+title+year` `:484` · **Fields:** `textarea JSON` `:542` (tableau `Competition[]` partiel)

---

## 2. MasterForm — `AdminMastersImport.tsx`

**File:** `src/pages/admin/AdminMastersImport.tsx:128-1143` · **Route:** `/admin/masters` + `/admin/masters/import` (`App.tsx:84-85`) · **Entity:** `MasterItem` (`src/lib/mastersAdapter.ts:10`) · **DB table:** `masters` (`prisma/schema.prisma:425`, `server/data/masters.json`, `/api/masters`) · **Submit:** `handleSave(e)` `:307` → `POST /api/masters` `:321` (create) / `PUT /api/masters/:id` `:336` (edit) · **Modes:** `create` (`openCreateModal` `:231`) / `edit` (`openEditModal` `:242`) / `duplicate` (`handleDuplicate` `:270`)

### Fields

| Field | Label FR | HTML type | Component | Req | Default (`INITIAL_FORM:106`) | Placeholder | Validation | Allowed values / Source | DB relation | DB field | Transform | Conditional |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `name` | Intitulé officiel du Master | `input text` | `Input` | **Yes** | `''` | `Ex: Master Intelligence Artificielle…` `:815` | `handleSave:309` `!trim() → toast error` + `required` attr | free | — | `name: string` | `trim()` check | always |
| `establishment` | Établissement / Faculté | `input text` + `datalist#schools-list` | `Input` + `datalist` | **Yes** | `''` | `Ex: FSR ou ENCG Casablanca` `:826` | `handleSave:313` `!trim() → toast` | `modalFilteredSchools` `REAL_SCHOOLS` filtré par `universityId` `:394` | FK → `schools.id` via `resolveSchoolMeta` | `establishment: string` | brut | always |
| `university` | Université de rattachement | `select` | `Select` | Yes* | `Université Mohammed V de Rabat` | — | visuel `required` | `MOROCCAN_UNIVERSITIES` 12 (`:52`) + `Autre université` | `universities` | `university: string` | — | pilote filtre `establishment` |
| `city` | Ville | `select` | `Select` | Yes* | `Rabat` | — | — | `MOROCCAN_CITIES` 16 (`:67`) | — | `city: string` | — | always |
| `domain` | Domaine / Filière | `input text` + `datalist#domains-list` | `Input` | No | `''` | `Ex: Informatique & IA` `:870` | — | `MASTER_DOMAINS` 9 (`:86`) suggestions | — | `domain: string` | — | always |
| `level` | Type de Diplôme / Niveau | `select` | `Select` | No | `Master Spécialisé (Bac+5)` | — | — | `MASTER_LEVELS` 5 (`:98`) | — | `level: string` | — | always |
| `academicYear` | Année Universitaire | `input text` | `Input` | No | `2026-2027` | `2026-2027` | — | free `YYYY-YYYY` | — | `academicYear: string` | — | always |
| `status` | Statut du concours | `select` | `Select` | No | `OUVERT` | — | — | `OUVERT,A_VENIR,CONCOURS_A_VENIR,RESULTATS,FERME,INFORMATION` (`mastersAdapter.ts:30`) | enum | `status` | auto-muté par `deadlineDate/examDate` onChange `:936,964` | always |
| `seats` | Nombre de places | `input number` | `Input type=number` | No | `35` | `Ex: 35` | `parseInt` | int ≥0 | — | `seats: number\|null` | `value ? parseInt : null` `:925` | always |
| `deadlineDate` | Date limite de candidature | `input date` | `Input type=date` | No | `''` | — | `YYYY-MM-DD` | date | — | `deadlineDate: string\|null` | `if(deadline<today && status===OUVERT) status=FERME` `:937` | always |
| `examDate` | Date du concours (écrit/oral) | `input date` | `Input type=date` | No | `''` | — | `YYYY-MM-DD` | date | — | `examDate: string\|null` | `if(exam>=today && status===FERME) status=CONCOURS_A_VENIR` `:964` | always |
| `officialUrl` | Lien officiel portail | `input url` | `Input type=url` | No | `''` | `https://…` | HTML5 `type=url` | url | — | `officialUrl: string\|null` | — | always |
| `schoolWebsite` | Site web établissement | `input url` | `Input type=url` | No | `''` | `https://…` | HTML5 | url | — | `schoolWebsite?:string` | — | always |
| `conditions` | Conditions d'accès | `textarea rows=3` | `Textarea` | No | `Licence requise…` | `Critères…` `:1011` | — | free | — | `conditions: string\|null` | — | md:col-span-2 |
| `documents` | Dossier & Documents | `textarea rows=3` | `Textarea` | No | `CV, CIN, Relevés…` | `Pièces à fournir…` `:1022` | — | free comma | — | `documents: string\|null` | — | md:col-span-2 |

### Hidden fields (dans `formData` mais pas d'Input)
`openingDate:''` `:114` · `publicationDate: today` `:117` · `resultsDate:''` `:118` · `sourceUrl:''` `:124` · `id/uniqueKey/createdAt/updatedAt` serveur · `schoolId/schoolSlug/universityWebsite` dérivés `resolveSchoolMeta`

### Conditional
Aucun `if` JSX — 15 champs toujours visibles. Indirect : `establishment` datalist filtrée par `university` `:394` · `status` auto-muté par dates.

### Validation
`name`*, `establishment`* (`handleSave:309-316` toast + `required` attr) · `type=url/number/date` natif · serveur `if(!name.trim()) 400`

### Buttons
`Ajouter un Master` → `openCreateModal` `:458` · `Actualiser statuts` → `POST /api/masters/update-statuses` `:466` · `Synchroniser` → `POST /api/masters/sync` `:477` · Row `Modifier/Dupliquer/Voir/Supprimer` `:758` · Modal `Annuler` / `Créer/Sauvegarder` `type=submit` `:1029`

### Transformations
`seats: parseInt\|\|null` · `deadline/exam → status` auto · `JSON.stringify(formData)` brut (pas de `trim` global)

---

## 3. ExamForm — `AdminContent.tsx:51-102`

**File:** `src/pages/admin/AdminContent.tsx:51` · **Route:** `/admin/examens` (`App.tsx:89`) · **Entity:** `Exam` (`src/lib/types.ts:173`) · **DB table:** `exams` · **Submit:** `save()` `:57` → `adminCreate('exams',…)` `:63` / `adminUpdate` `:61` · **Modes:** `create` (`f:53`) / `edit` (`initial`)

| Field | Label | Type | Req | Default | Placeholder | Validation | Source | DB field | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `title` | Titre * | `input text` | `Input` | **Yes** | `''` | `Concours ENSA — Mathématiques` | `save:58` `!trim() → error` | free | `title` | `trim()` `:60` |
| `schoolName` | École / organisme * | `input text` | `Input` | **Yes** | `''` | `ENSA Marrakech` | `!trim()` | free | `schoolName` + `organizationName` (mirroir) | `trim()` both `:60` |
| `schoolId` | École liée | `select` | `Select` | No | `undefined` | `— Aucune —` | — | `db.schools[].id` `:77` | `schoolId?:string` | `value\|\|undefined` |
| `subject` | Matière | `select` | `Select` | No | `Mathématiques` | — | — | `SUBJECTS` `utils.ts:445` 13 valeurs | `subject` | — |
| `year` | Année | `input number` | `Input type=number` | No | `nowYear` | — | — | number | `year: number` | `parseInt\|\|nowYear` |
| `level` | Niveau | `select` | `Select` | No | `Bac+0` | — | — | `LEVELS` `utils.ts:444` | `level` | — |
| `type` | Type | `select` | `Select` | No | `Concours` | — | — | `Concours,Examen,Recrutement,Partiel` | `type` | — |
| `duration` | Durée | `input text` | `Input` | No | `undefined` | `2h` | — | free | `duration?:string` | — |
| `pages` | Pages | `input number` | `Input type=number` | No | `undefined` | — | — | int | `pages?:number` | `parseInt\|\|undefined` |
| `pdfUrl` | URL du PDF | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `pdfUrl?:string` | `value\|\|undefined` |
| `verificationStatus` | Vérification | `select` | `Select` | No | `UNVERIFIED` | — | — | `UNVERIFIED,PENDING,VERIFIED,EXPIRED` | `verificationStatus` | — |
| `publishStatus` | Publication | `select` | `Select` | No | `DRAFT` | — | — | `DRAFT,PENDING_REVIEW,PUBLISHED,ARCHIVED` | `publishStatus` | notif si PUBLISHED |
| `description` | Description | `textarea` | `Textarea` | No | `undefined` | — | — | free | `description?:string` | — |
| `hasCorrection` | Corrigé inclus | `checkbox` | `input type=checkbox` | No | `false` | — | — | bool | `hasCorrection: boolean` | `checked` |
| `isDemo` | DEMO | `checkbox` | `input type=checkbox` | No | `false` | — | — | bool | `isDemo: boolean` | `checked` |

**Hidden:** `id=uid('ex')` `:63` · `slug=slugify(title-year)` `:60` · `organizationName=schoolName` · `downloads=0` · `createdAt/updatedAt` `now ISO`

**Buttons:** `Annuler` outline `onClose` · `Créer/Enregistrer` `onClick=save`

---

## 4. DocForm — `AdminContent.tsx:144-194`

**File:** `AdminContent.tsx:144` · **Route:** `/admin/documents` (`App.tsx:90`) · **Entity:** `DocItem` (`types.ts:213`) · **DB table:** `documents` · **Submit:** `save()` `:149` → `adminCreate` `:155` / `adminUpdate` `:153` · **Composite:** `AutoOrganismeField` `:165`

| Field | Label | Type | Req | Default | Validation | Source | DB field | Transform | Conditional |
|---|---|---|---|---|---|---|---|---|---|
| `title` | Titre * | `input text` | `Input` | **Yes** | `''` | `save:150` `!trim() → error` | free | `title` | `trim()` `:152` | always |
| `organizationName` | Nom de l'organisme * | `input text` | `Input` | **Yes** | `''` | `!trim()` | free OR auto via `AutoOrganismeField:171` | `organizationName` | `trim()` / `onChange org` | always |
| `category` | Catégorie | `select` | `Select` | No | `Avis de concours` | — | `DOC_CATS` `AdminContent.tsx:105` 10 valeurs | `category` (DocCategory) | — | always |
| `year` | Année | `input number` | `Input type=number` | No | `nowYear` | — | free | number | `year: number` | `parseInt\|\|nowYear` | always |
| `fileUrl` | URL du fichier | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `fileUrl?:string` | `value\|\|undefined` | always |
| `fileSize` | Taille | `input text` | `Input` | No | `undefined` | `1,2 Mo` | — | free | `fileSize?:string` | `value\|\|undefined` | always |
| `sourceUrl` | URL source | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `sourceUrl?:string` | feeds AutoField | always |
| `publishStatus` | Publication | `select` | `Select` | No | `DRAFT` | — | `DRAFT…ARCHIVED` | `publishStatus` | notif si PUBLISHED | always |
| `description` | Description | `textarea` | `Textarea` | No | `undefined` | — | free | `description?:string` | feeds AutoField | always |
| `isDemo` | Données de démonstration | `checkbox` | `input type=checkbox` | No | `false` | — | — | bool | `isDemo` | `checked` | always |

**Hidden via AutoOrganismeField:** `schoolId`, `ministryId` (`AdminContent.tsx:172-173`) — `onChange({schoolId,ministryId,organizationName})` `:171`

**Buttons:** `Annuler` / `Créer/Enregistrer` (`save`)

**Hidden:** `id=uid('d')` · `slug=slugify(title-Date.now())` · `downloads=0` · `createdAt/updatedAt`

---

## 5. CourseForm — `AdminContent.tsx:235-330`

**File:** `AdminContent.tsx:235` · **Route:** `/admin/cours` (`App.tsx:91`) · **Entity:** `Course` (`types.ts:252`) + `Chapter` (`types.ts:245`) + `Lesson` (`types.ts:234`) · **DB table:** `courses` · **Submit:** `save()` `:262` → `adminCreate` `:268` / `adminUpdate` `:266`

| Field | Label | Type | Req | Default | Allowed / Source | DB field | Transform |
|---|---|---|---|---|---|---|---|
| `title` | Titre * | `input text` | `Input` | **Yes** | `''` | free | `title` | `trim()` |
| `subject` | Matière | `select` | `Select` | No | `Mathématiques` | `SUBJECTS` | `subject` | — |
| `level` | Niveau | `select` | `Select` | No | `Bac+0` | `LEVELS` | `level` | — |
| `difficulty` | Difficulté | `select` | `Select` | No | `Intermédiaire` | `Débutant,Intermédiaire,Avancé` | `difficulty` | — |
| `duration` | Durée | `input text` | `Input` | No | `10h` | free `10h` | `duration` | — |
| `color` | Couleur | `input color` | `Input type=color` | No | `#0B63CE` | hex | `color` | — |
| `publishStatus` | Publication | `select` | `Select` | No | `DRAFT` | `DRAFT…ARCHIVED` | `publishStatus` | — |
| `isDemo` | DEMO | `checkbox` | `input type=checkbox` | No | `false` | bool | `isDemo` | `checked` |
| `description` | Description | `textarea` | `Textarea rows=2` | No | `''` | free | `description` | `??''` |
| `chapters` | Chapitres (array) | dynamic repeater | — | No | `[]` | — | `chapters: Chapter[]` | `addChapter:240` `uid('ch')` etc. |

**Nested Chapter:** `title` (`Input` default `Chapitre N`) · `order: number` · `lessons: Lesson[]` · Actions `+Chapitre` `:295` / `Suppr. chapitre` `:304`

**Nested Lesson:** `title` (`Input` `Leçon N`) · `type` (`select` `VIDEO,TEXT,PDF,QUIZ,EXERCISE` `:311`) · `duration` (`Input` `20 min`) · `content` (`Textarea`) · Actions `+Leçon` `:303` / `✕` `:314`

**Buttons:** `Annuler` / `Créer/Enregistrer`

**Hidden:** `id=uid('course')` · `slug=slugify(title)` · `createdAt/updatedAt` · `chapters[].id=uid('ch')`, `lessons[].id=uid('l')`, `order` auto-inc

---

## 6. SchoolForm — `AdminCatalog.tsx:165-392`

**File:** `AdminCatalog.tsx:165` · **Route:** `/admin/ecoles` (`App.tsx:86`) · **Entity:** `School` (`types.ts:46`) · **DB table:** `schools` · **Submit:** `save()` `:203` → `adminCreate('schools',…)` `:225` / `adminUpdate` `:223`

| Field | Label | Type | Req | Default | Placeholder | Validation | Source | DB field | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `name` | Nom complet * | `input text` | `Input` | **Yes** | `''` | `École Nationale...` | `save:205` `!trim() → error` | free | `name` | `trim()` `:211` |
| `shortName` | Nom court / Acronyme * | `input text` | `Input` | **Yes** | `''` | `ENSA Marrakech` | same | free | `shortName` | `trim()` + `slug` |
| `universityId` | Université de rattachement | `select` | `select native` | No | `undefined` | `— Aucune ... —` | — | `db.universities[].id` `:262` | `universityId?:string` FK | `value\|\|undefined` |
| `ministryId` | Ministère de tutelle | `select` | `select native` | No | `min-enssup` | `— Non rattaché —` | — | `db.ministries[].id` `:277` | `ministryId?:string` FK | `value\|\|undefined` |
| `city` | Ville | `select` | `Select` | No | `Rabat` | — | — | `CITIES` 17 (`utils.ts:460`) | `city` | — |
| `region` | Région | `select` | `Select` | No | `Rabat-Salé-Kénitra` | — | — | `REGIONS` 12 (`utils.ts:492`) | `region` | — |
| `type` | Type d'école | `input text` | `Input` | No | `École d'ingénieurs` | `École d'ingénieurs...` | — | free | `type` | — |
| `isActive` | Statut de publication | `select` | `select native` | No | `true` | `Actif/Archivé` | — | `true/false` | `isActive?:boolean` | `value==='true'` / save `!==false` |
| `domainsTxt` → `domains` | Domaines (virgules) | `input text` | `Input` | No | `Ingénierie, Informatique` | `Ingénierie, Informatique...` | — | free comma | `domains: string[]` | `split(',').map(trim).filter(Boolean)` `:215` |
| `levelsTxt` → `levels` | Niveaux d'admission | `input text` | `Input` | No | `Bac+0, Bac+2` | `Bac+0, Bac+2, Licence` | — | free comma | `levels: string[]` | `split(',')` `:216` |
| `website` | Site web officiel | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `website?:string` | — |
| `email` | E-mail | `input email` | `Input` | No | `undefined` | `contact@…` | — | email | `email?:string` | — |
| `phone` | Téléphone | `input tel` | `Input` | No | `undefined` | `+212 5...` | — | tel | `phone?:string` | — |
| `description` | Description générale | `textarea rows=3` | `Textarea` | No | `''` | `Présentation...` | — | free | `description` | `??''` |
| `logoUrl` | Logo officiel | `input file` | `input type=file accept=image/*` | No | `initial?.logoUrl` | — | `size>2Mo → error` `:190` | PNG/SVG/JPEG max 2Mo | `logoUrl?:string` | `FileReader.readAsDataURL` → `dataUrl` `:193` |

**Buttons:** `Annuler` outline `onClose` · `Enregistrer` `onClick=save` · Row `Archiver/Restaurer` via `adminArchiveItem('schools',…)` `:26`

**Hidden:** `id=uid('ec')` · `slug=slugify(shortName)` · `logoColor=#0B63CE` · `createdAt/updatedAt` · `isDemo`

---

## 7. UniversityForm — `AdminCatalog.tsx:538-691`

**File:** `AdminCatalog.tsx:538` · **Route:** `/admin/universites` (`App.tsx:87`) · **Entity:** `University` (`types.ts:77`) · **DB table:** `universities` · **Submit:** `save()` `:570` → `adminCreate` `:590` / `adminUpdate` `:588`

| Field | Label | Type | Req | Default | Placeholder | Validation | Source | DB field | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `name` | Nom complet en français * | `input text` | `Input` | **Yes** | `''` | `Université Mohammed V...` | `save:572` `!trim() + shortName → error` | free | `name` | `trim()` |
| `shortName` | Acronyme officiel * | `input text` | `Input` | **Yes** | `''` | `UM5` | same | free | `shortName` | `trim()` + `slug` |
| `nameAr` | Nom en arabe (Optionnel) | `input text` RTL | `Input dir=rtl` | No | `undefined` | `جامعة محمد الخامس...` | — | free RTL | `nameAr?:string` | — |
| `city` | Ville du siège | `select` | `Select` | No | `Rabat` | — | — | `CITIES` 17 | `city` | — |
| `region` | Région administrative | `select` | `Select` | No | `Rabat-Salé-Kénitra` | — | — | `REGIONS` 12 | `region` | — |
| `website` | Site officiel | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `website?:string` | — |
| `description` | Description historique | `textarea rows=3` | `Textarea` | No | `undefined` | `Historique...` | — | free | `description` | `??''` |
| `logoUrl` | Logo officiel | `input file` | `input type=file` | No | `initial?.logoUrl` | — | `>2Mo error` `:557` | image/* max2Mo | `logoUrl?:string` | `FileReader DataURL` |

**Hidden:** `id=uid('univ')` · `slug=slugify(shortName)` · `ministryId=min-enssup` (default, non édité UI) · `logoColor` · `isActive=true` · `createdAt/updatedAt`

**Buttons:** `Annuler` / `Enregistrer`

---

## 8. MinistryForm — `AdminCatalog.tsx:832-970`

**File:** `AdminCatalog.tsx:832` · **Route:** `/admin/ministeres` (`App.tsx:88`) · **Entity:** `Ministry` (`types.ts:99`) · **DB table:** `ministries` · **Submit:** `save()` `:861` → `adminCreate` `:881` / `adminUpdate` `:879`

| Field | Label | Type | Req | Default | Placeholder | Validation | Source | DB field | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `name` | Nom officiel complet * | `input text` | `Input` | **Yes** | `''` | `Ministère de l'Éducation...` | `save:863` `!trim()+shortName → error` | free | `name` | `trim()` |
| `shortName` | Acronyme / Sigle * | `input text` | `Input` | **Yes** | `''` | `MENPS` | same | free | `shortName` | `trim()` + `slug` |
| `website` | Portail web officiel | `input text` | `Input` | No | `undefined` | `https://…` | — | url | `website?:string` | — |
| `isActive` | Statut | `select` | `select native` | No | `true` | `Actif/Archivé` | — | `true/false` | `isActive?:boolean` | `value==='true'` |
| `description` | Description des compétences | `textarea rows=3` | `Textarea` | No | `undefined` | `Compétences...` | — | free | `description` | `??''` |
| `logoUrl` | Logo officiel | `input file` | `input type=file` | No | `initial?.logoUrl` | — | `>2Mo error` | image/* max2Mo | `logoUrl?:string` | `FileReader DataURL` |

**Hidden:** `id=uid('min')` · `slug=slugify(shortName)` · `logoColor` · `createdAt/updatedAt`

**Buttons:** `Annuler` / `Enregistrer`

---

## 9. NotifForm — `AdminUsers.tsx:127-156`

**File:** `src/pages/admin/AdminUsers.tsx:127` · **Route:** `/admin/notifications` (`App.tsx:97`) · **Entity:** `AppNotification` (`types.ts:284`) · **DB table:** `notifications` (`pushNotification` `src/lib/db.ts`) · **Submit:** `save()` `:134` → `pushNotification({title,message,type,link})` `:136` · **Mode:** create only

| Field | Label | Type | Req | Default | Placeholder | Validation | Allowed | DB field | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `title` | Titre * | `input text` | `Input` | **Yes** | `''` | `Ex : Nouveau concours publié` | `save:135` `!trim() → error` | free | `title` | `trim()` |
| `message` | Message * | `textarea rows=3` | `Textarea` | **Yes** | `''` | — | `!trim()` | free | `message` | `trim()` |
| `type` | Type | `select` | `Select` | No | `info` | — | — | `info,success,warning,deadline,result` | `type` | cast |
| `link` | Lien (optionnel) | `input text` | `Input` | No | `''` | `/concours/…` | — | path | `link?:string` | `trim()\|\|undefined` |

**Buttons:** `Annuler` outline `onClose` · `Diffuser à tous` `onClick=save` (`userId:'all'` hardcodé)

**Hidden:** `id` auto (`pushNotification`) · `userId='all'` · `readBy=[]` · `createdAt=now`

---

## 10. User inline edits — `AdminUsers.tsx:13-90`

**File:** `AdminUsers.tsx:13` · **Route:** `/admin/utilisateurs` (`App.tsx:92`) · **Entity:** `User` (`types.ts:30`) · **DB table:** `users` · **No modal** — inline table edits

| Field | Label | Type | Component | Source | DB field | Transform |
|---|---|---|---|---|---|---|
| `role` | Rôle | `select` native `45` | `select` | `USER,ADMIN` | `role: Role` | `adminUpdate('users',id,{role:value})` `:45` immédiat |
| `status` | Suspendre/Activer | `button` `60` | `button` | `ACTIVE↔SUSPENDED` | `status` | `adminUpdate('users',id,{status:…})` `:60` |
| `q` (search) | Rechercher utilisateur | `input text` | `SearchInput` `30` | free | — | client filter `23` |
| `roleFilter` | Filtrer par rôle | `select` | `select` `32` | `ALL,USER,ADMIN` | — | filter `24` |

**Report inline (signalements):** `filter status` `select` `171` (`ALL,OPEN,RESOLVED,REJECTED`) · Row `status` `select` `187` (`OPEN,RESOLVED,REJECTED`) → `adminUpdate('reports',id,{status})` `187` · `RowActions onDelete` → `adminDelete('reports')` `201`

---

## 11. ParametresForm — `AdminParametres.tsx:9-122`

**File:** `AdminParametres.tsx:9` · **Route:** `/admin/parametres` (`App.tsx:94`) · **Entity:** `User` partial (`types.ts:30`) + prefs locales · **Submit:** `handleSave()` `:22` → `adminUpdate<User>('users', user.id, {firstName,lastName,email})` `:28` (600ms fake delay `:27`)

| Field | Label | Type | Req | Default (from `useAuth().user`) | DB field | Transform | Conditional |
|---|---|---|---|---|---|---|---|
| `firstName` | Prénom | `input text` | `Input` | No* | `user?.firstName\|\|''` | `firstName` | `form.firstName` | always |
| `lastName` | Nom | `input text` | `Input` | No* | `user?.lastName\|\|''` | `lastName` | `form.lastName` | — |
| `email` | Adresse email | `input email` | `Input` | No* | `user?.email\|\|''` | `email` | `form.email` | span 2 |
| `notifications` | Notifications de rapport | `checkbox` toggle | `input type=checkbox peer` `80` | No | `true` | **NOT persisted** (local) | `form.notifications` | prefs card |
| `maintenanceMode` | Mode Maintenance | `checkbox` toggle | `input type=checkbox` `99` | No | `false` | **NOT persisted** | `form.maintenanceMode` | — |

**Buttons:** `Annuler` `onClick=reload` `:114` · `Enregistrer les modifications` `disabled=loading` `:115`

**Hidden:** `user.id` for update `:28` · prefs non écrites DB

---

## 12. Add Source Form (AI Agent) — `AdminAIAgent.tsx:16-232`

**File:** `AdminAIAgent.tsx:16` · **Route:** `/admin/ai-agent` + `/admin/ai-agent/sources` (`App.tsx:95-96`) · **Entity:** `AgentSource` (`/api/agent/sources` `{id,name,url,type,isActive,status,lastCheckAt}`) · **Submit:** `handleAddSource(e)` `:16` → `POST /api/agent/sources` `21` body `{name,url,type:'HTML',isActive:true,status:'OK'}` · **Scan:** `scanSource(id)` `:79` `POST /api/agent/sources/{id}/scan?dryRun=` · `scanAll` `:92`

| Field | Label | Type | Req | Default | Placeholder | Validation | Allowed | DB/API | Transform |
|---|---|---|---|---|---|---|---|---|---|
| `newSourceName` | Nom de la source * | `input text` | `Input` `required` | `''` | `ex: FSJES Agdal` | `if(!name\|\|!url) return` `18` + `required` | free | `source.name` | `JSON.stringify name` |
| `newSourceUrl` | URL (Page annonces) * | `input url` | `Input type=url` `required` | `''` | `https://…` | same + `type=url` | url | `source.url` | — |
| `isDryRun` | Mode DRY RUN | `checkbox` | `input type=checkbox` | No | `true` | — | — | bool | query `?dryRun=` | `isDryRun` |

**Hidden:** `type:'HTML'` `:27` · `isActive:true` `:28` · `status:'OK'` `:29` · `id` serveur

**Buttons:** Header `Lancer tout` `scanAll` `:123` · `Ajouter source` opens modal `:126` · Modal `Annuler` `ghost` / `Enregistrer` `type=submit` `disabled=isSubmitting` · Row `Scanner` `disabled=loading\|\|!isActive` `:159` · `Refresh` `:137`

---

## 13. Filter/Export Form — `AdminRapports.tsx`

**File:** `AdminRapports.tsx:25` · **Route:** `/admin/rapports` (`App.tsx:93`) · **Entity:** `Competition` (view) + `ExportLog` (`localStorage cm_export_logs`) · **No DB write** — exports `exportGlobalExcel` `:78` / `exportFilteredExcel` `:152` / `jsPDF` `:92`

| Field | Label | Type | Default | Allowed / Source | Logic |
|---|---|---|---|---|---|
| `search` | Recherche | `input text` | `''` | free `title/organizationName` | `matchSearch:65` |
| `typeFilter` | Type d'organisme | `select` | `ALL` | `ALL,ECOLE,INSTITUTION,MINISTERE` | `matchType:69` `organizationType===` |
| `statusFilter` | Statut | `select` | `ALL` | `ALL,PUBLISHED,DRAFT` | `matchStatus:70` `publishStatus===` |

**Buttons:** `Réinitialiser` clears filters `:193` · `Excel (filtré)` `disabled=loading\|\|filtered.length===0` `:235` · `PDF` `:238` · `EXPORTER TOUTES LES DONNÉES` global `:293`

---

## 14. Auth Forms — `Auth.tsx`

**Login** `Auth.tsx:31` · **Route:** `/connexion` (`App.tsx:57`) · **Fields:** `email` (`input email` `required` `Mail` icon `:57` `vous@example.ma`) · `password` (`input password` `required` `:63` `••••••••` + `show` toggle `:64`) · `Validation:` `login(email,password)` `auth.ts` · **Buttons:** `Se connecter` `type=submit loading` `:72` · `Mot de passe oublié ?` link

**Register** `Auth.tsx:80` · **Route:** `/inscription` (`App.tsx:58`) · **Fields:** `firstName` (`input text` `required` `:106` `Yasmine`) · `lastName` (`input text` `required` `:109` `Bennani`) · `email` (`input email` `required` `:114` `vous@example.ma`) · `city` (`select` `:118` `CITIES` `Select…`) · `level` (`select` `:123` `LEVELS` `Select…`) · `password` (`input password` `required` `minLength=8` `:130` hint `8 caractères minimum`) · `confirm` (`input password` `required` `:133`) · **Validation:** `if(password!==confirm) error` `:91` · **Buttons:** `Créer mon compte` `type=submit`

**ForgotPassword** `Auth.tsx:143` · **Route:** `/mot-de-passe-oublie` (`App.tsx:59`) · **Field:** `email` (`input email` `required` `:154`) · **Buttons:** `Envoyer le lien` `type=submit` · `sent` → success alert `:149`

---

## 15. AutoOrganismeField (composite) — `AutoOrganismeField.tsx`

**File:** `src/components/AutoOrganismeField.tsx:10` · **Props:** `{title,description,sourceUrl,selectedId,onChange}` · **Resolver:** `resolveOrganisme({schoolId,ministryId,title,description,sourceUrl})` `organismeResolver.ts:95`

**Internal fields:** `searchQuery` (`input text` `110` `Rechercher une école…`) → filters `allOrgs` (`db.schools→École` + `db.universities→Université` + `db.ministries→Ministère`) `34` slice 20/30 · **Selection list** `div onClick=handleSelectOrg` `121` → `onChange({organismeId,schoolId,ministryId,organizationName,organizationType,logoUrl})` `48`

**Hidden/derived:** `selectedId` (schoolId|ministryId) · `resolved.organizationName/logoUrl/ministryName` · No direct DB write — parent maps to `schoolId/ministryId/organizationName`

**Buttons:** `Modifier/Sélectionner` `variant=outline size=sm` `67` → `setManualModalOpen(true)` · Row click `handleSelectOrg` closes modal

---

## Référentiels (sources des selects)

| Référentiel | Fichier | Valeurs |
|---|---|---|
| `LEVELS` | `src/lib/utils.ts:444` | `Bac,Bac+0,Bac+1,Bac+2,Bac+3,Bac+4,Bac+5,Bac+6,Doctorat,Tous niveaux` |
| `CITIES` | `src/lib/utils.ts:460` | 17 villes (Rabat,Casablanca,Marrakech,Fès,Meknès,Tanger,Agadir,Oujda,Kénitra,Tétouan,Mohammedia,El Jadida,Béni Mellal,Nador,Laâyoune,Dakhla,Tout le Maroc) |
| `REGIONS` | `src/lib/utils.ts:492` | 12 régions (`Rabat-Salé-Kénitra` … `Dakhla-Oued Ed-Dahab`) |
| `DOMAINS` | `src/lib/utils.ts:479` | 11 (`Ingénierie,Informatique,Sciences,Santé,Droit,Économie,Lettres,Éducation,Architecture,Art,Commerce`) |
| `CATEGORIES` | `src/lib/types.ts:20` | `ECOLE,MINISTERE,UNIVERSITE,INSTITUTION,RECRUTEMENT,FORMATION,AUTRE` |
| `SUBJECTS` | `src/lib/utils.ts:445` | 13 (`Mathématiques,Physique,Chimie,SVT,Informatique,Français,Anglais,Arabe,Logique,Culture générale,Économie,Droit,Médecine`) |
| `MOROCCAN_UNIVERSITIES` | `AdminMastersImport.tsx:52` | 12 universités |
| `MOROCCAN_CITIES` | `AdminMastersImport.tsx:67` | 16 villes |
| `MASTER_DOMAINS` | `AdminMastersImport.tsx:86` | 9 domaines |
| `MASTER_LEVELS` | `AdminMastersImport.tsx:98` | 5 niveaux Master |
| `DOC_CATS` | `AdminContent.tsx:105` | 10 catégories documents |
| `schools/universities/ministries` | `src/data/institutionsData.ts` + `src/lib/db.ts: schools/universities/ministries` | DB live (FK selects) |
| `REAL_SCHOOLS` | `src/data/institutionsData.ts` | >100 écoles (alias) |

---

## Transformations & Validations récapitulatives

| Form | Transform | Validation |
|---|---|---|
| Concours | `split('\n')` (conditions/epreuves/docs), `split(',')` (matieres), `parseInt` (places/year), `slugify()` (slug), `uid('c')` (id), `new Date(v).toISOString()` (dates), `trim()` | `title*`, `organizationName*`, `description*`, `places>=1`, `deadline>=start`, `URL regex` |
| Master | `parseInt\|\|null` (seats), `status` auto par dates, `JSON.stringify(formData)` brut | `name*`, `establishment*` (+ `required` attr), `type=url/number/date` natif |
| Exam | `slugify(title-year)`, `uid('ex')`, `organizationName=schoolName`, `parseInt` | `title*`, `schoolName*` |
| Doc | `slugify(title-Date.now())`, `uid('d')`, `organizationName` via AutoOrganisme | `title*`, `organizationName*` |
| Course | `uid('course'/'ch'/'l')`, `slugify(title)` | `title*` |
| School/University/Ministry | `slugify(shortName)`, `uid('ec'/'univ'/'min')`, `split(',')` domains/levels, `FileReader DataURL` logo | `name*` + `shortName*`, `logo>2Mo error` |
| Notif | `trim()\|\|undefined` (link) | `title*`, `message*` |
| AI Source | `type:'HTML'`, `isActive:true` hardcodé | `name*`, `url*` + `type=url` |
| Auth | — | `email type=email`, `password minLength=8`, `password===confirm` |

---

## Hidden fields récapitulatif

`id` (tous `uid()`), `slug` (`slugify`), `createdAt`/`updatedAt` (`now ISO`), `views/downloads=0`, `verifiedAt/verifiedBy` (verify), `logoUrl` (AutoOrganisme/FileReader), `organizationType` (dérivé), `isActive`/`isDemo`, `openingDate/publicationDate/resultsDate/sourceUrl` (Master hidden), `schoolId/ministryId/universityId` (FK), `chapters[].id/order`/`lessons[].id`

---

## DB mapping (exemples)

```
FORM FIELD → MODEL FIELD → DB COLUMN
Concours: organizationName → Competition.organizationName → competitions.organization_name
          registrationStart → registrationStart → registration_start
Master:  name → MasterItem.name → masters.name
         deadlineDate → deadlineDate → masters.deadline_date
         academicYear → academicYear → masters.academic_year
Exam:    schoolName → Exam.schoolName → exams.school_name
Doc:     fileUrl → DocItem.fileUrl → documents.file_url
School:  shortName → School.shortName → schools.short_name
         domainsTxt → domains → schools.domains (text[])
```

---

*Généré READ-ONLY — aucune modification UI/DB — scraper doit reproduire exactement ces transforms/validations pour générer ses payloads.*
