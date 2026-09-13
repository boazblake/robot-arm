# ExRx ingestion

This project ingests exercise reference data from ExRx.net’s public exercise directory.

## Scope
- Crawls `/Lists/Directory`
- Follows linked section pages under `Lists/ExList/*`
- Includes “Other Exercises” directory pages
- Follows exercise detail pages and extracts:
  - name, canonical URL
  - source section / subsection
  - classification
  - instructions and comments
  - muscle roles
  - related links when available

## Output
- Deterministic JSON dataset: `src/domain/data/exrx-exercises.json`
- Stable ordering by normalized name, then URL
- Duplicate pages are collapsed by canonical URL / normalized name

## Refresh
Run:

```bash
npm run ingest:exrx
```

Then commit the updated JSON if it changed.

## Limitations
- Parsing is HTML-regex based and tuned for current ExRx page structure.
- Some pages omit sections; missing fields remain empty.
- The scrape is intended for offline reference and UI feedback scaffolding, not live runtime crawling.
