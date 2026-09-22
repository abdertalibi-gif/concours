# Sources officielles — Registry (Phase 5 DISCOVERY ONLY)

> **Aucune écriture DB — découverte uniquement.**  
> Registry de référence : `scraper/sources/registry.ts` + `scraper/sources/sources.json` (21 sources).  
> Découverte : `scraper/output/source-discovery-20260919192903.json` + `scraper/logs/source-discovery-20260919192903.txt`.

## Méthode de découverte

1. **Référentiels existants** : `src/data/institutionsData.ts` (`REAL_UNIVERSITIES` 14, `REAL_MINISTRIES` 12, `REAL_SCHOOLS` >100) + `src/lib/mastersSeed.ts` (161 masters) + `src/lib/utils.ts` (CITIES/REGIONS/DOMAINS). Aucune URL inventée — `baseUrl` = `website` vérifié dans la base.
2. **Priorité officielle** : universités > facultés/écoles > ministères > plateformes officielles. Agrégateur `Almaster` marqué `official:false`.
3. **Discovery allégée** : pas de scraping massif, respect `robots.txt` (endpoint noté `à vérifier manuellement`), `sitemap.xml`/`RSS` notés comme `à vérifier` sauf `Almaster` feed JSON déjà vérifié (`/feeds/posts/default?alt=json` Phase 1). Pas de contournement JS.
4. **Mapping vers forms** via `scraper/form-schemas.json` : `MASTER→MasterForm` (`/admin/masters`), `COMPETITION→ConcoursForm` (`/admin/concours`), `EXAM→ExamForm`, `DOCUMENT→DocForm`, etc.
5. **Capacité champs** : déduite de l'observation Phase 1-4 (Almaster) et structure attendue des portails officiels (HTML annonces + PDF). Jamais déclarée sans preuve.

---

## Fiche type

```json
{
  "sourceId": "univ-um5",
  "name": "Université Mohammed V de Rabat",
  "organization": "Université Mohammed V de Rabat",
  "entityTypes": ["MASTER","COMPETITION"],
  "baseUrl": "https://www.um5.ac.ma",
  "officialDomain": "um5.ac.ma",
  "discoveryUrl": "https://www.um5.ac.ma",
  "supportedFormats": ["HTML","PDF"],
  "priority": "high",
  "active": true,
  "official": true,
  "structured": false,
  "stable": true,
  "requiresJS": false,
  "hasPDF": true,
  "hasDates": true,
  "hasConditions": true,
  "hasPlaces": false,
  "notes": "..."
}
```

---

## Universités (14) — MASTER + COMPETITION

| # | sourceId | baseUrl | entités | contenu | champs dispo | limites |
|---|----------|---------|---------|---------|--------------|---------|
| 1 | `univ-um5` | `https://www.um5.ac.ma` | MASTER, COMPETITION | Annonces masters FSR/FSJES Agdal/Souissi, ENS, FMP Rabat ; résultats PDF | `title AUTO, city AUTO, domain REVIEW, deadline AUTO, officialUrl PDF` | `places MISSING` (jamais annoncé), `conditions AUTO` (PDF), pas de `sitemap/RSS` détecté |
| 2 | `univ-uh2c` | `http://www.univh2c.ma` | MASTER, COMPETITION | ENCG Casa, ENSAM, FST Mohammedia | `title AUTO, city AUTO, domain REVIEW, deadline AUTO` | `places MISSING`, HTML non structuré |
| 3 | `univ-uca` | `https://www.uca.ma` | MASTER, COMPETITION | ENSA Marrakech/Safi, ENCG Marrakech | `title AUTO, city AUTO` | `places MISSING` |
| 4 | `univ-usmba` | `http://www.usmba.ac.ma` | MASTER, COMPETITION | ENSA/ENCG/FST/ENS Fès | `title AUTO` | `places MISSING` |
| 5 | `univ-uae` | `https://www.uae.ac.ma` | MASTER, COMPETITION | ENSA Tanger, ENCG Tanger | `title AUTO` | `places MISSING` |
| 6 | `univ-ump` | `https://www.ump.ma` | MASTER, COMPETITION | ENSA/ENCG/EST Oujda | `title AUTO` | `places MISSING` |
| 7 | `univ-uiz` | `https://www.uiz.ac.ma` | MASTER, COMPETITION | ENSA Agadir, ENCG Agadir | `title AUTO` | `places MISSING` |
| 8 | `univ-uit` | `https://uit.ac.ma` | MASTER, COMPETITION | ENSA Kénitra, ENCG Kénitra | `title AUTO` | `places MISSING` |
| 9 | `univ-umi` | `http://www.umi.ac.ma` | MASTER, COMPETITION | ENSAM Meknès, ENCG Meknès | `title AUTO` | `places MISSING` |
| 10 | `univ-ucd` | `https://www.ucd.ac.ma` | MASTER, COMPETITION | ENSA/ENCG El Jadida | `title AUTO` | `places MISSING` |
| 11 | `univ-uh1` | `https://www.uh1.ac.ma` | MASTER, COMPETITION | ENCG Settat, FST Settat | `title AUTO` | `places MISSING` |
| 12 | `univ-usms` | `https://www.usms.ac.ma` | MASTER, COMPETITION | ENSA Khouribga, ENCG Béni Mellal | `title AUTO` | `places MISSING` |
| 13 | `univ-um6p` | `https://www.um6p.ma` | MASTER, COMPETITION | Masters Benguerir (structuré) | `title AUTO, places AUTO` | `requiresJS true` |
| 14 | `univ-aui` | `http://www.aui.ma` | MASTER, COMPETITION | Ifrane (anglophone) | `title AUTO` | `priority low` |

*Méthode*: `website` depuis `REAL_UNIVERSITIES[].website` (vérifié), `robots/sitemap` à vérifier manuellement (pas de fetch massif), `PDF` présent (listes résultats).

---

## Ministères (6 sur 12) — COMPETITION + DOCUMENT

| sourceId | baseUrl | entités | champs dispo | limites |
|----------|---------|---------|--------------|---------|
| `min-education` | `https://www.men.gov.ma` | COMPETITION, DOCUMENT | `title AUTO, places AUTO, deadline AUTO` | concours enseignement, pas `MASTER` |
| `min-sup` | `https://www.enssup.gov.ma` | COMPETITION, DOCUMENT, MASTER | `title AUTO` (circulaires) | `places REVIEW` |
| `min-interieur` | `https://www.interieur.gov.ma` | COMPETITION | `title AUTO, places AUTO` | collectivités |
| `min-sante` | `https://www.sante.gov.ma` | COMPETITION | `title AUTO, places AUTO` | ISPITS |
| `min-finances` | `https://www.finances.gov.ma` | COMPETITION | `title AUTO, places AUTO` | DGI/Douanes |
| `min-justice` | `https://www.justice.gov.ma` | COMPETITION | `title AUTO, places AUTO` | greffe |

*6 autres ministères (équipement, agriculture, industrie, énergie, numérique, culture) existent dans `REAL_MINISTRIES` mais non priorisés pour MASTER — voir `sources.json`.*

---

## Agrégateur (1) — non officiel

| sourceId | baseUrl | official | entités | champs | limites |
|----------|---------|----------|---------|--------|---------|
| `almaster` | `https://www.almaster-maroc.com` | `false` | MASTER | `title AUTO, city AUTO, domain 60%, deadline 33%, officialUrl 82% PDF, places 0/150 MISSING, conditions 0/150` | agrégateur Blogger JSON `feeds/posts/default?alt=json`, non officiel, `structured:true` mais HTML non sémantique, `stable:false` |

---

## Mapping vers les forms (`form-schemas.json`)

| Source entity | Form | Route | DB table |
|---------------|------|-------|----------|
| MASTER | MasterForm | `/admin/masters` | `masters` (`MasterItem`) |
| COMPETITION | ConcoursForm | `/admin/concours` | `competitions` |
| EXAM | ExamForm | `/admin/examens` | `exams` |
| DOCUMENT | DocForm | `/admin/documents` | `documents` |
| SCHOOL/UNIVERSITY/MINISTRY | SchoolForm/UniversityForm/MinistryForm | `/admin/ecoles` etc. | `schools/universities/ministries` |

Aucune form modifiée.

---

## Capacité détaillée (exemple MASTER sur `univ-um5`)

```
MASTER.title            AUTO (HTML h1)
MASTER.university       AUTO (UM5)
MASTER.establishment    AUTO (FSR)
MASTER.city             AUTO (Rabat)
MASTER.domain           REVIEW (mot-clé "Informatique" mais pas "Sciences" isolé)
MASTER.level            AUTO (Bac+5 via select)
MASTER.academicYear     AUTO (2026-2027)
MASTER.deadlineDate     AUTO (si contexte "date limite")
MASTER.officialUrl      AUTO si .ma, REVIEW si PDF → officialDocument
MASTER.places           MISSING (0/150 Almaster, UM6P seul AUTO)
MASTER.conditions       AUTO si PDF détaillé, sinon MISSING
```

Même logique pour `COMPETITION` (voir `capacity` dans `source-discovery-*.json`).

---

## Qualité / fiabilité (métadonnées)

Pour chaque source (`source-discovery-*.json`):

```
official: true/false
structured: Almaster true (JSON), UM6P true, autres false (HTML)
stable: true sauf Almaster false (Blogger)
requiresJS: false sauf UM6P true
hasPDF: true (21/21)
hasDates: true (21/21)
hasConditions: 14/21 (universités oui, ministères partiel)
hasPlaces: 7/21 (UM6P + 6 ministères)
```

Pas de score global — métadonnées descriptives uniquement.

---

## Limites & remarques

- `places` jamais annoncé sur portails universitaires hors UM6P/ministères → `Competition` toujours `BLOCKED` si import direct.
- `sitemap.xml`/`RSS` non détectés automatiquement (respect charge serveur) — à vérifier manuellement avant scraping.
- `PDF≠officialWebsite` strict — PDF en `documents[]`/`officialDocument`.
- Pas de création `SCHOOL/UNIVERSITY` automatique — `REVIEW` si alias ambigu (ex: `FST` seul).
- `Almaster` utile pour discovery mais non considéré officiel.

---

*Généré Phase 5 DISCOVERY ONLY — 2026-09-19 — scraper/sources/registry.ts:OFFICIAL_SOURCES (21), scraper/sources/sources.json, NO DB WRITE.*
