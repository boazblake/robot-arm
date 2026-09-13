import fs from "fs/promises";
import path from "path";

const ROOT = "https://exrx.net";
const DIR_URL = `${ROOT}/Lists/Directory`;
const OUT = path.resolve("src/domain/data/exrx-exercises.json");

const fetchText = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "Lift-Mate ExRx ingestion" } });
  if (!res.ok) return null;
  return await res.text();
};

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const normName = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const abs = (base, href) => new URL(href, base).toString().split("#")[0];

const collectLinks = (html, base) => [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi)]
  .map(([, href, text]) => ({ href: abs(base, href), text: decode(text) }))
  .filter((l) => l.href.startsWith(ROOT));

const sectionPages = new Set();
const exercisePages = new Set();
const dir = await fetchText(DIR_URL);
for (const link of collectLinks(dir, DIR_URL)) {
  if (/\/Lists\/(ExList|Directory|OtherExercises|[A-Za-z]+Exercises|OlympicWeightlifting|PowerExercises|CardioExercises|KettlebellExercises|OtherExercises)/.test(link.href)) sectionPages.add(link.href);
}

for (const page of sectionPages) {
  const html = await fetchText(page);
  if (!html) continue;
  for (const link of collectLinks(html, page)) {
    if (/\/WeightExercises\//.test(link.href) || /\/Exercises\//.test(link.href)) exercisePages.add(link.href);
  }
}

const parseSectionTrail = (html) => {
  const crumb = html.match(/Breadcrumb-Container[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1] || "";
  return crumb.split(/&gt;|>/).map(decode).filter(Boolean);
};

const parseList = (html, label) => [...html.matchAll(new RegExp(`<p><a[^>]*><strong>${label}<\\/strong><\\/a>\\s*<\\/p>\\s*<ul>([\\s\\S]*?)<\\/ul>`, "i"))][0]?.[1]
  ?.matchAll(/<li><a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a><\/li>/gi) || [];

const records = [];
for (const url of [...exercisePages].sort()) {
  const html = await fetchText(url);
  if (!html) continue;
  const title = decode(html.match(/<h1 class="page-title">([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>ExRx\.net : ([^<]+)<\/title>/i)?.[1] || "");
  const classification = Object.fromEntries([...html.matchAll(/<td width="40%"><strong>([^:]+):<\/strong><\/td>\s*<td width="60%">([\s\S]*?)<\/td>/gi)].map(([,k,v]) => [k.toLowerCase(), decode(v)]));
  const instructions = (html.match(/<h2>Instructions<\/h2>[\s\S]*?<strong>Preparation<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>\s*<p><strong>Execution<\/strong><\/p>\s*<p>([\s\S]*?)<\/p>/i) || []).slice(1).map(decode);
  const comments = decode(html.match(/<h2>Comments<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1] || "");
  const muscles = {};
  for (const key of ["Target", "Synergists", "Dynamic      Stabilizers", "Stabilizers", "Antagonist      Stabilizers"]) {
    const match = html.match(new RegExp(`<a href="[^\"]*${key.replace(/\s+/g,"\\s+")}[^"]*"><strong>${key}<[\\/]strong><\\/a>\\s*<\\/p>\\s*<ul>([\\s\\S]*?)<\\/ul>`, "i"));
    muscles[key.toLowerCase().replace(/\s+/g, "_")] = [...(match?.[1].matchAll(/<li><a[^>]*>(.*?)<\/a><\/li>/gi) || [])].map((m) => decode(m[1]));
  }
  const related = [...html.matchAll(/<li><a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a><\/li>/gi)].map(([,href,text]) => ({ url: abs(url, href), text: decode(text) })).filter((x) => x.url !== url);
  records.push({
    name: title,
    canonicalUrl: url,
    normalizedName: normName(title),
    source: parseSectionTrail(html),
    classification,
    instructions: { preparation: instructions[0] || "", execution: instructions[1] || "" },
    comments,
    muscles,
    relatedLinks: related.slice(0, 10),
  });
}

records.sort((a,b)=>a.normalizedName.localeCompare(b.normalizedName) || a.canonicalUrl.localeCompare(b.canonicalUrl));
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify({ source: DIR_URL, generatedAt: "2026-05-13", count: records.length, exercises: records }, null, 2) + "\n");
console.log(`Wrote ${records.length} exercises to ${OUT}`);
