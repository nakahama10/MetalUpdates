# Metal Updates

A metal-themed news aggregator: headlines from metal publications around the world, filterable by region, category and source. Static site, no framework, no build step.

## How it works

- `scripts/fetch-news.mjs` reads the feeds in `data/sources.json`, de-duplicates, auto-tags each story (release / tour / festival / lineup / review / interview / news) and writes `data/news.json`.
- The site (`index.html`, `css/`, `js/`) just renders `data/news.json`.
- `.github/workflows/update-news.yml` runs the updater hourly and commits the result, so the site stays fresh with no server.

Only titles, a ~220 character excerpt and a thumbnail URL are stored, and every card links to the original article.

## Run locally

```bash
node scripts/fetch-news.mjs      # pull live headlines (Node 18+)
python3 -m http.server 8000      # then open http://localhost:8000
```

`data/news.json` currently ships with placeholder stories (flagged `"sample": true`) so the layout works before the first fetch. The first real run replaces them.

## Deploy

Host the repo root on any static host. For GitHub Pages: Settings → Pages → deploy from branch, root folder. Then enable Actions so the hourly update runs.

## Add or change sources

Edit `data/sources.json` (`region` is `americas`, `europe`, `asia`, `oceania` or `global`). A feed that fails is skipped and logged; the others still update. Feed URLs were not verifiable when this was built, so check the first Actions run log and fix any that report `FAIL`.

## Tests

```bash
node scripts/test-parse.mjs
```
