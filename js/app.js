(() => {
  const PAGE = 18;
  const REGIONS = [["all", "Worldwide"], ["americas", "Americas"], ["europe", "Europe"], ["asia", "Asia"], ["oceania", "Oceania"]];
  const CATS = [["all", "All"], ["release", "Releases"], ["tour", "Tours"], ["festival", "Festivals"], ["lineup", "Lineups"], ["review", "Reviews"], ["interview", "Interviews"], ["news", "News"]];
  const $ = (id) => document.getElementById(id);
  const state = { items: [], region: "all", cat: "all", source: "", q: "", shown: PAGE };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function ago(iso) {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    if (s < 86400 * 14) return `${Math.round(s / 86400)}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function card(item, big) {
    const a = el("a", "card");
    a.href = item.url;
    a.rel = "noopener noreferrer";
    if (item.url !== "#") a.target = "_blank";
    const thumb = el("div", "thumb");
    if (item.image && /^https:\/\//.test(item.image)) {
      const img = new Image();
      img.alt = "";
      img.loading = big ? "eager" : "lazy";
      img.referrerPolicy = "no-referrer";
      img.src = item.image;
      img.onerror = () => { img.remove(); thumb.classList.add("art"); };
      thumb.append(img);
    } else thumb.classList.add("art");
    thumb.append(el("span", "badge", item.category));
    if (item.sample) thumb.append(el("span", "badge sample", "sample"));
    const body = el("div", "body");
    const meta = el("div", "meta");
    meta.append(el("span", "src", item.sourceName), el("time", null, ago(item.date)));
    meta.lastChild.dateTime = item.date;
    body.append(meta, el("h2", null, item.title));
    if (item.excerpt) body.append(el("p", null, item.excerpt));
    a.append(thumb, body);
    return a;
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return state.items.filter((i) =>
      (state.region === "all" || i.region === state.region) &&
      (state.cat === "all" || i.category === state.cat) &&
      (!state.source || i.source === state.source) &&
      (!q || `${i.title} ${i.excerpt} ${i.sourceName}`.toLowerCase().includes(q)));
  }

  function render() {
    const list = filtered();
    const [top, ...rest] = list;
    const feat = $("featured"), grid = $("grid");
    feat.replaceChildren(); grid.replaceChildren();
    if (!list.length) {
      grid.append(el("div", "empty", "Nothing but silence. Try another filter."));
      $("count").textContent = "";
      $("more").hidden = true;
      return;
    }
    feat.append(card(top, true));
    const visible = rest.slice(0, state.shown);
    visible.forEach((i) => grid.append(card(i)));
    $("count").textContent = `${list.length} ${list.length === 1 ? "story" : "stories"}`;
    $("more").hidden = visible.length >= rest.length;
  }

  function reset() { state.shown = PAGE; render(); }

  function buildControls(sources) {
    const regions = $("regions");
    REGIONS.forEach(([v, label], n) => {
      const b = el("button", null, label);
      b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(n === 0));
      b.onclick = () => {
        state.region = v;
        regions.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
        reset();
      };
      regions.append(b);
    });
    const cats = $("cats");
    CATS.forEach(([v, label]) => {
      const b = el("button", "chip", label);
      b.type = "button"; b.setAttribute("aria-pressed", String(v === "all"));
      b.onclick = () => {
        state.cat = v;
        cats.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        reset();
      };
      cats.append(b);
    });
    const sel = $("source");
    sources.forEach((s) => { const o = el("option", null, s.name); o.value = s.id; sel.append(o); });
    sel.onchange = () => { state.source = sel.value; reset(); };
    let t;
    $("q").oninput = (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; reset(); }, 150); };
    $("more").onclick = () => { state.shown += PAGE; render(); };
  }

  function ticker(items) {
    const t = $("ticker");
    const make = (i) => { const a = el("a", null, i.title); a.href = i.url; a.rel = "noopener noreferrer"; if (i.url !== "#") a.target = "_blank"; return a; };
    const top = items.slice(0, 10);
    t.append(...top.map(make), ...top.map((i) => { const a = make(i); a.setAttribute("aria-hidden", "true"); a.tabIndex = -1; return a; }));
  }

  function footerSources(sources) {
    const box = $("sources");
    box.append("Sources: ");
    sources.forEach((s, n) => {
      const a = el("a", null, s.name);
      a.href = s.site; a.rel = "noopener noreferrer"; a.target = "_blank";
      box.append(a, n < sources.length - 1 ? " · " : "");
    });
  }

  async function init() {
    const status = $("status");
    try {
      const res = await fetch("data/news.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      state.items = data.items;
      buildControls(data.sources);
      footerSources(data.sources);
      ticker(data.items);
      status.textContent = "";
      if (data.sample) {
        status.append(el("b", null, "Preview mode: "), "showing placeholder stories. Run the news updater to pull live headlines.");
      } else {
        status.textContent = `Last updated ${ago(data.updated)} · ${data.items.length} stories from ${data.sources.filter((s) => s.ok).length} sources`;
      }
      render();
    } catch (err) {
      status.textContent = "Couldn't load the news feed. Serve this site over HTTP (not file://) and make sure data/news.json exists.";
    }
  }
  init();
})();
