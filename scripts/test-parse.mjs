import assert from "node:assert/strict";
import { parseFeed, categorize, stripHtml } from "./lib/parse.mjs";

const rss = `<?xml version="1.0"?><rss xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
<item><title><![CDATA[Band &amp; Co announce <b>tour</b>]]></title><link>https://example.com/a?utm=1</link>
<pubDate>Thu, 29 Oct 2026 10:00:00 GMT</pubDate>
<description><![CDATA[<p>Hello &amp; welcome <img src="https://img.example.com/x.jpg"> world</p>]]></description>
<media:content url="https://img.example.com/m.jpg" medium="image"/></item>
<item><title>No link item</title></item></channel></rss>`;
const a = parseFeed(rss);
assert.equal(a.length, 1);
assert.equal(a[0].title, "Band & Co announce tour");
assert.equal(a[0].url, "https://example.com/a?utm=1");
assert.equal(a[0].date, "2026-10-29T10:00:00.000Z");
assert.equal(a[0].excerpt, "Hello & welcome world");
assert.equal(a[0].image, "https://img.example.com/m.jpg");

const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom &#8211; post</title>
<link rel="alternate" href="https://example.org/p"/><updated>2026-10-28T08:30:00Z</updated>
<summary>Short &lt;i&gt;sum&lt;/i&gt;</summary></entry></feed>`;
const b = parseFeed(atom);
assert.equal(b[0].title, "Atom – post");
assert.equal(b[0].url, "https://example.org/p");
assert.equal(b[0].date, "2026-10-28T08:30:00.000Z");

assert.equal(categorize("Band announces world tour"), "tour");
assert.equal(categorize("Hellfest reveals 2027 poster"), "festival");
assert.equal(categorize("Band releases new single"), "release");
assert.equal(categorize("Drummer leaves band"), "lineup");
assert.equal(categorize("Something else entirely"), "news");
assert.equal(stripHtml("<script>x</script>a&nbsp;b"), "a b");
console.log("parser tests passed");
