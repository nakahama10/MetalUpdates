// Minimal RSS 2.0 / Atom parser. No dependencies on purpose.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

export function decode(s = "") {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const unCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

export function stripHtml(html = "") {
  return decode(
    unCdata(html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? unCdata(m[1]).trim() : "";
}

function attr(block, name, attrName, filter) {
  const re = new RegExp(`<${name}\\s([^>]*?)/?>`, "gi");
  let m;
  while ((m = re.exec(block))) {
    if (filter && !filter.test(m[1])) continue;
    const a = m[1].match(new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (a) return decode(a[1]);
  }
  return "";
}

function firstImage(block, rawHtml) {
  const candidates = [
    attr(block, "media:content", "url"),
    attr(block, "media:thumbnail", "url"),
    attr(block, "enclosure", "url", /type\s*=\s*["']image/i),
    (rawHtml.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i) || [])[1],
  ];
  const url = decode(candidates.find(Boolean) || "");
  return /^https:\/\//i.test(url) ? url : "";
}

export function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = xml.match(new RegExp(`<${isAtom ? "entry" : "item"}[\\s>][\\s\\S]*?</${isAtom ? "entry" : "item"}>`, "gi")) || [];
  return blocks.map((b) => {
    const rawHtml = tag(b, "content:encoded") || tag(b, "content") || tag(b, "description") || tag(b, "summary");
    const link = isAtom
      ? attr(b, "link", "href", /rel\s*=\s*["']alternate["']|^(?!.*rel=)/i) || attr(b, "link", "href")
      : decode(stripHtml(tag(b, "link")));
    const date = tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date");
    const t = Date.parse(date);
    return {
      title: stripHtml(tag(b, "title")),
      url: link,
      date: Number.isNaN(t) ? null : new Date(t).toISOString(),
      excerpt: stripHtml(rawHtml),
      image: firstImage(b, unCdata(rawHtml)),
    };
  }).filter((i) => i.title && /^https?:\/\//i.test(i.url));
}

const CATEGORY_RULES = [
  ["tour", /\b(tour|tours|live dates|headline show|concert|gig|setlist|reunion show)\b/i],
  ["festival", /\b(festival|fest|download|wacken|hellfest|bloodstock|summer breeze|sonisphere|knotfest|graspop|copenhell|OZZfest)\b/i],
  ["release", /\b(new (album|single|song|ep|video)|releases?|released|unveils?|streams?|premieres?|lyric video|music video|track|debut album|announces? (new )?album)\b/i],
  ["review", /\b(review|reviewed|album of the|ranked|top \d+|best of)\b/i],
  ["lineup", /\b(joins?|joined|departs?|leaves?|parts ways|new (vocalist|singer|drummer|guitarist|bassist)|line-?up|steps down|rejoins?)\b/i],
  ["interview", /\b(interview|talks|speaks|says|reveals)\b/i],
];

export function categorize(title, excerpt = "") {
  const text = `${title} ${excerpt.slice(0, 200)}`;
  for (const [cat, re] of CATEGORY_RULES) if (re.test(text)) return cat;
  return "news";
}
