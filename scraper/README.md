# Scraper indépendant — Phase 1 (source : Almaster)

Scraper totalement **indépendant** du site principal. Aucun import depuis `src/`,
`server/` ou `api/`. Aucune écriture dans le site.

## Flux

```
Almaster (flux Atom JSON)
   ↓
scraper/sources/almaster.ts   (liste + pagination)
   ↓
scraper/parsers/              (html → texte, dates FR → ISO)
   ↓
scraper/normalizers/          (titre, université, établissement, ville, domaine, niveau, année)
   ↓
scraper/deduplication/        (fingerprint persistant)
   ↓
scraper/exporters/            (JSON + CSV)
   ↓
scraper/output/
```

## Utilisation

```bash
npm install                # une fois (dans scraper/)
npm run scrape             # limit 150
npm run scrape -- --limit 20
npm run scrape -- --refresh        # ignore la mémoire des doublons inter-runs
npm run scrape -- --delay 500      # délai entre pages (ms)
npm run scrape -- --validate       # scraping + validation automatique
npm run validate                   # valide le dernier JSON généré
npm run scrape -- --source almaster
```

## Validation (Phase 1.1)

`validation.ts` analyse le dernier JSON de `output/` et produit
`logs/validation-<timestamp>.txt` avec :
- audit complet (titres, URLs, villes, établissements, universités, domaines,
  dates, niveaux, descriptions, incohérences)
- tableau de couverture (Champ | Rempli | Vide | Pourcentage)
- détection des erreurs de parsing (URL Almaster comme lien officiel,
  réseaux sociaux, dates antérieures à la publication, établissements
  génériques, université sans preuve, deadlines multiples)
- échantillon qualitatif (10 annonces : complètes / moyennes / manquantes /
  multi-dates)

Le script main.ts accepte `--validate` pour enchaîner scraping + validation.

## Sorties

| Dossier | Contenu |
|---|---|
| `output/` | `concours-almaster-<ts>.json` + `.csv` (résultat structuré) |
| `logs/` | `summary-concours-almaster-<ts>.txt` + `errors-*.jsonl` |
| `state/` | `fingerprints.json` (mémoire des doublons) |

## Aide

```bash
npm run scrape -- --help
```

## Ajouter une source plus tard

1. Créer `sources/<ma-source>.ts` qui exporte un `SourceRunner`
   (`name`, `label`, `baseUrl`, `scrape()` → `ScrapeResult`).
2. L'enregistrer dans `sources/registry.ts`.
3. `npm run scrape -- --source <ma-source>`.