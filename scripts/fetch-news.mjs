#!/usr/bin/env node
// Pulls every feed in data/sources.json and writes data/news.json.
// Usage: node scripts/fetch-news.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseFeed, categorize } from "./lib/parse.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_ITEMS = 400;
const MAX_AGE_DAYS = 21;
const EXCERPT_LEN = 220;
const TIMEOUT_MS = 15000;

const { sources } = JSON.parse(await readFile(path.join(root, "data/sources.json"), "utf8"));

async function load(src) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(src.feed, {
      signal: ctrl.signal,
      headers: { "user-agent": "MetalUpdatesBot/1.0 (+news aggregator; links back to originals)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseFeed(await res.text());
    if (!items.length) throw new Error("no items parsed");
    return { src, items, ok: true };
  } catch (err) {
    return { src, items: [], ok: false, error: String(err.cause?.code || err.message) };
  } finally {
    clearTimeout(timer);
  }
}

const results = await Promise.all(sources.map(load));
const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
const seen = new Set();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const items = results
  .flatMap(({ src, items }) => items.map((i) => ({ ...i, source: src.id, sourceName: src.name, region: src.region })))
  .filter((i) => i.date && Date.parse(i.date) >= cutoff && Date.parse(i.date) <= Date.now() + 864e5)
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  .filter((i) => {
    const keys = [i.url.replace(/[?#].*$/, ""), norm(i.title)];
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  })
  .slice(0, MAX_ITEMS)
  .map((i, n) => ({
    id: `${i.source}-${n}-${Date.parse(i.date)}`,
    title: i.title,
    url: i.url,
    date: i.date,
    source: i.source,
    sourceName: i.sourceName,
    region: i.region,
    category: categorize(i.title, i.excerpt),
    excerpt: i.excerpt.length > EXCERPT_LEN ? i.excerpt.slice(0, EXCERPT_LEN).replace(/\s+\S*$/, "") + "…" : i.excerpt,
    image: i.image,
  }));

for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.src.name}: ${r.ok ? r.items.length + " items" : r.error}`);

if (!items.length) {
  console.error("No items fetched from any source; leaving data/news.json untouched.");
  process.exit(1);
}

const out = {
  updated: new Date().toISOString(),
  sources: results.map((r) => ({ id: r.src.id, name: r.src.name, region: r.src.region, site: r.src.site, ok: r.ok })),
  items,
};
await writeFile(path.join(root, "data/news.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`Wrote ${items.length} items.`);
