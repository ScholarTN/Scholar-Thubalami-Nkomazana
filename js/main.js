/* =========================================================
   STN — interactions
   No dependencies. Motion is kept to purposeful, subtle cues
   and respects prefers-reduced-motion.
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme colours (canvases read these live) ---------------- */
  const C = { accent: [59, 130, 246], accent2: [96, 165, 250], ink: [230, 236, 245], ok: [52, 211, 153], light: false };
  const rgb = (a, al = 1) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).split(",").map((x) => parseFloat(x));
    const hex = (n) => { const h = cs.getPropertyValue(n).trim().replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
    C.accent = v("--accent-rgb"); C.ink = v("--ink-rgb"); C.ok = v("--ok-rgb"); C.accent2 = hex("--accent-2");
    C.light = document.documentElement.dataset.theme === "light";
  }
  readTheme();

  /* ---------------- reveal on scroll ---------------- */
  function reveals() {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );
    $$(".reveal-up, .pcard").forEach((el) => io.observe(el));
    // hero is visible immediately
    $$(".hero .reveal-up").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------------- statement scrub ---------------- */
  function statementScrub() {
    const el = $("[data-scrub]");
    if (!el) return;
    const hl = new Set(["technology", "medicine:", "brain,"]);
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w${hl.has(w.toLowerCase()) ? " hl" : ""}">${w}</span>`).join(" ");
    const spans = $$(".w", el);
    if (reduced) return spans.forEach((s) => s.classList.add("on"));
    let last = -1;
    const update = () => {
      const r = el.getBoundingClientRect();
      const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.3), 0, 1);
      const n = Math.round(p * spans.length);
      if (n === last) return;
      last = n;
      spans.forEach((s, i) => s.classList.toggle("on", i < n));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- clock ---------------- */
  function clock() {
    const el = $("#clock");
    const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
    const tick = () => (el.textContent = fmt.format(new Date()));
    tick(); setInterval(tick, 15000);
    $("#year").textContent = new Date().getFullYear();
  }

  /* ---------------- nav, progress, active section ---------------- */
  function navigation() {
    const nav = $("#nav");
    const bar = $("#progressBar");
    let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      nav.classList.toggle("is-scrolled", y > 20);
      const menuOpen = document.body.classList.contains("menu-open");
      nav.classList.toggle("is-hidden", !menuOpen && y > lastY + 4 && y > innerHeight * 0.8);
      if (y < lastY - 4) nav.classList.remove("is-hidden");
      lastY = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = $$(".nav__links a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.classList.remove("is-active"));
        const a = map.get(e.target.id);
        if (a) a.classList.add("is-active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("section[id]").forEach((s) => io.observe(s));

    const btn = $("#menuBtn");
    const menu = $("#mobileMenu");
    const toggle = (open) => {
      document.body.classList.toggle("menu-open", open);
      btn.setAttribute("aria-expanded", open);
      menu.setAttribute("aria-hidden", !open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    btn.addEventListener("click", () => toggle(!document.body.classList.contains("menu-open")));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => toggle(false)));
  }

  /* ---------------- project cards: stacking + spotlight ---------------- */
  function projectCards() {
    const cards = $$(".pcard");
    cards.forEach((c) => {
      c.addEventListener("pointermove", (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", `${e.clientX - r.left}px`);
        c.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
    if (reduced) return;
    const mq = matchMedia("(min-width: 861px)");
    const update = () => {
      if (!mq.matches) { cards.forEach((c) => { c.style.transform = ""; c.style.filter = ""; }); return; }
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const p = clamp(1 - (next.getBoundingClientRect().top - c.getBoundingClientRect().top) / innerHeight, 0, 1);
        c.style.transform = `scale(${1 - p * 0.04})`;
        c.style.filter = `brightness(${1 - p * (C.light ? 0.08 : 0.3)})`;
      });
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener("themechange", update);
    update();
  }

  /* ---------------- energy live chart ---------------- */
  function energyChart() {
    const c = $("#energyChart");
    if (!c) return;
    const ctx = c.getContext("2d");
    const kw = $("#kw"), kwh = $("#kwh");
    let w, h, data = [], energy = 0, visible = false, base = 2.4;
    const N = 90;
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const sample = (t) => {
      base = clamp(base + (Math.random() - 0.5) * 0.18, 1.2, 4.2);
      const spike = Math.random() < 0.03 ? Math.random() * 1.6 : 0;
      return clamp(base + Math.sin(t / 7) * 0.35 + spike, 0.6, 5.5);
    };
    for (let i = 0; i < N; i++) data.push(sample(i));
    let t = N;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const max = 6, step = w / (N - 1);
      const y = (v) => h - 10 - (v / max) * (h - 20);
      ctx.strokeStyle = rgb(C.ink, 0.07); ctx.lineWidth = 1;
      for (let g = 1; g < 6; g++) { ctx.beginPath(); ctx.moveTo(0, y(g)); ctx.lineTo(w, y(g)); ctx.stroke(); }
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, rgb(C.accent, 0.28)); grad.addColorStop(1, rgb(C.accent, 0));
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, y(v)));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      data.forEach((v, i) => (i ? ctx.lineTo(i * step, y(v)) : ctx.moveTo(0, y(v))));
      ctx.strokeStyle = rgb(C.accent); ctx.lineWidth = 1.6; ctx.stroke();
      const last = data[data.length - 1];
      ctx.fillStyle = rgb(C.accent); ctx.beginPath(); ctx.arc(w - 3, y(last), 3.5, 0, Math.PI * 2); ctx.fill();
    };
    resize(); draw();
    addEventListener("resize", debounce(() => { resize(); draw(); }, 200));
    addEventListener("themechange", draw);
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(c);
    if (reduced) return;
    setInterval(() => {
      if (!visible || document.hidden) return;
      data.push(sample(t++)); data.shift();
      const v = data[data.length - 1];
      energy += (v / 3600) * 4;
      kw.textContent = v.toFixed(2);
      kwh.textContent = `${energy.toFixed(3)} kWh`;
      draw();
    }, 400);
  }

  /* ---------------- timeline ---------------- */
  function timeline() {
    const tl = $("#timeline"), fill = $("#timelineFill"), items = $$(".tl", tl);
    const update = () => {
      const r = tl.getBoundingClientRect();
      fill.style.transform = `scaleY(${clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1)})`;
      items.forEach((it) => it.classList.toggle("is-lit", it.getBoundingClientRect().top < innerHeight * 0.6));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- stack: which projects use a tool ---------------- */
  function stackLedger() {
    const tags = $$("#stackLedger [data-k]");
    const clear = () => tags.forEach((t) => t.classList.remove("on"));
    $$(".stack [data-p]").forEach((chip) => {
      const on = () => {
        const ks = chip.dataset.p.split(" ").filter(Boolean);
        tags.forEach((t) => t.classList.toggle("on", ks.includes(t.dataset.k)));
      };
      chip.setAttribute("tabindex", "0");
      chip.addEventListener("pointerenter", on);
      chip.addEventListener("pointerleave", clear);
      chip.addEventListener("focus", on);
      chip.addEventListener("blur", clear);
    });
  }

  /* ---------------- neural network (direction section) ---------------- */
  function neuro() {
    const canvas = $("#neuro");
    const ctx = canvas.getContext("2d");
    const sec = $("#direction");
    let w, h, nodes = [], edges = [], pulses = [], visible = false;
    const mouse = { x: -999, y: -999 };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = sec.clientWidth; h = sec.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = [];
      const cx = w / 2, cy = h / 2, rx = Math.min(w * 0.44, 640), ry = Math.min(h * 0.42, 300);
      const n = w < 700 ? 60 : 110;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
        const x = cx + side * rx * 0.48 + Math.cos(a) * r * rx * 0.52;
        const y = cy + Math.sin(a) * r * ry;
        nodes.push({ x, y, ox: x, oy: y, ph: Math.random() * 6.28 });
      }
      edges = [];
      nodes.forEach((a, i) => {
        nodes.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)])
          .filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]).slice(0, 3)
          .forEach(([j, d]) => { if (d < 160 && i < j) edges.push([i, j]); });
      });
    };
    sec.addEventListener("pointermove", (e) => {
      const r = sec.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    sec.addEventListener("pointerleave", () => (mouse.x = mouse.y = -999));
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x = n.ox + Math.sin(t * 0.0004 + n.ph) * 2;
        n.y = n.oy + Math.cos(t * 0.0003 + n.ph) * 2;
      }
      ctx.lineWidth = 0.6;
      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const md = Math.hypot((a.x + b.x) / 2 - mouse.x, (a.y + b.y) / 2 - mouse.y);
        const boost = md < 180 ? (1 - md / 180) * 0.45 : 0;
        ctx.strokeStyle = boost ? rgb(C.accent, 0.1 + boost) : rgb(C.ink, C.light ? 0.1 : 0.07);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const n of nodes) {
        const md = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const boost = md < 160 ? 1 - md / 160 : 0;
        ctx.fillStyle = boost ? rgb(C.accent, 0.5 + boost * 0.5) : rgb(C.ink, 0.3);
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 + boost * 1.5, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduced && edges.length && Math.random() < 0.08) pulses.push({ e: edges[(Math.random() * edges.length) | 0], p: 0, dir: Math.random() < 0.5 });
      pulses = pulses.filter((q) => q.p <= 1);
      for (const q of pulses) {
        q.p += 0.018;
        const a = nodes[q.e[q.dir ? 0 : 1]], b = nodes[q.e[q.dir ? 1 : 0]];
        ctx.fillStyle = rgb(C.accent, Math.sin(q.p * Math.PI));
        ctx.beginPath(); ctx.arc(lerp(a.x, b.x, q.p), lerp(a.y, b.y, q.p), 1.8, 0, Math.PI * 2); ctx.fill();
      }
    };
    resize();
    addEventListener("resize", debounce(resize, 250));
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
    if (reduced) { draw(0); addEventListener("themechange", () => draw(0)); return; }
    (function loop(t) { if (visible && !document.hidden) draw(t); requestAnimationFrame(loop); })(0);
  }

  /* ---------------- toast + email ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 2000);
  }
  const EMAIL = "thubalaminkomazana15@gmail.com";
  async function copyEmail() {
    try { await navigator.clipboard.writeText(EMAIL); toast("Email copied"); }
    catch {
      const sel = getSelection(), range = document.createRange();
      range.selectNodeContents($("#emailText")); sel.removeAllRanges(); sel.addRange(range);
      toast("Press Ctrl+C to copy");
    }
  }
  function email() { $("#emailBtn").addEventListener("click", copyEmail); }

  /* ---------------- theme toggle ---------------- */
  function setTheme(next, origin) {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.theme = next;
      try { localStorage.setItem("stn-theme", next); } catch (e) {}
      readTheme();
      dispatchEvent(new Event("themechange"));
    };
    if (origin) {
      const r = origin.getBoundingClientRect();
      root.style.setProperty("--vt-x", `${r.left + r.width / 2}px`);
      root.style.setProperty("--vt-y", `${r.top + r.height / 2}px`);
    }
    if (document.startViewTransition && !reduced) document.startViewTransition(apply);
    else apply();
  }
  const flipTheme = (origin) => setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light", origin || $("#themeBtn"));
  function theme() {
    const btn = $("#themeBtn");
    const meta = $('meta[name="theme-color"]');
    const sync = () => {
      const light = document.documentElement.dataset.theme === "light";
      btn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      btn.setAttribute("aria-pressed", String(light));
      meta.setAttribute("content", light ? "#f5f7fa" : "#0b1220");
    };
    btn.addEventListener("click", (e) => flipTheme(e.currentTarget));
    $$("[data-theme-toggle]").forEach((b) => b.addEventListener("click", (e) => flipTheme(e.currentTarget)));
    addEventListener("themechange", sync);
    // follow the OS setting until the visitor picks one
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
      let saved = null; try { saved = localStorage.getItem("stn-theme"); } catch (_) {}
      if (!saved) { document.documentElement.dataset.theme = e.matches ? "light" : "dark"; readTheme(); dispatchEvent(new Event("themechange")); }
    });
    sync();
  }

  /* ---------------- count-up numbers ---------------- */
  function countUps() {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (reduced) return;
      const el = e.target, end = +el.dataset.count, text = el.textContent;
      const pre = text.match(/^[^0-9]*/)[0], post = text.match(/[^0-9]*$/)[0];
      const t0 = performance.now(), dur = 1100;
      (function tick(now) {
        const k = clamp((now - t0) / dur, 0, 1);
        el.textContent = pre + Math.round(end * (1 - Math.pow(1 - k, 3))) + post;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }), { threshold: 0.6 });
    $$("[data-count]").forEach((el) => io.observe(el));
  }

  /* ---------------- command menu ---------------- */
  function palette() {
    const root = $("#palette"), input = $("#paletteInput"), list = $("#paletteList");
    const go = (id) => () => document.getElementById(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    const open = (u) => () => window.open(u, "_blank", "noopener");
    const cmds = [
      { t: "Go to About", k: "Navigate", run: go("about") },
      { t: "Go to Capabilities", k: "Navigate", run: go("capabilities") },
      { t: "Go to Featured projects", k: "Navigate", run: go("work") },
      { t: "Go to Experience", k: "Navigate", run: go("experience") },
      { t: "Go to Education", k: "Navigate", run: go("education") },
      { t: "Go to Axterion", k: "Navigate", run: go("axterion") },
      { t: "Go to Technical stack", k: "Navigate", run: go("stack") },
      { t: "Go to Certifications", k: "Navigate", run: go("certs") },
      { t: "Go to Contact", k: "Navigate", run: go("contact") },
      { t: "Switch light / dark theme", k: "Action", run: () => flipTheme() },
      { t: "Download CV (PDF)", k: "Action", run: open("assets/cv/Thubalami_Nkomazana_CV.pdf") },
      { t: "Copy email address", k: "Action", run: copyEmail },
      { t: "Open GitHub: ScholarTN", k: "Link", run: open("https://github.com/ScholarTN") },
      { t: "Open LinkedIn", k: "Link", run: open($("#linkedinLink").href) },
      { t: "Visit axterionlabs.com", k: "Link", run: open("https://axterionlabs.com") },
      { t: "Diabetes Risk Prediction AI: source", k: "Project", run: open("https://github.com/ScholarTN/AI-Disease-Prediction") },
      { t: "Smart Energy Dashboard: source", k: "Project", run: open("https://github.com/ScholarTN/smart-energy-dashboard") },
      { t: "FleetMind: source", k: "Project", run: open("https://github.com/ScholarTN/fleetmindAI") },
      { t: "Back to top", k: "Navigate", run: go("top") },
    ];
    let shown = cmds, sel = 0, lastFocus = null;
    const score = (q, s) => {
      q = q.toLowerCase(); s = s.toLowerCase();
      if (!q) return 1;
      if (s.includes(q)) return 2 + q.length / s.length;
      let i = 0; for (const ch of s) if (ch === q[i]) i++;
      return i === q.length ? 1 : 0;
    };
    const render = () => {
      const q = input.value.trim();
      shown = cmds.map((c) => [c, score(q, c.t + " " + c.k)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([c]) => c);
      sel = clamp(sel, 0, Math.max(0, shown.length - 1));
      list.innerHTML = shown.length
        ? shown.map((c, i) => `<li role="option" data-i="${i}" class="${i === sel ? "is-sel" : ""}" aria-selected="${i === sel}"><span>${c.t}</span><span class="mono">${c.k}</span></li>`).join("")
        : `<li class="empty">No results. Try “contact” or “github”.</li>`;
      const s = list.querySelector(".is-sel"); if (s) s.scrollIntoView({ block: "nearest" });
    };
    const show = () => { lastFocus = document.activeElement; root.hidden = false; input.value = ""; sel = 0; render(); input.focus(); };
    const hide = () => { root.hidden = true; if (lastFocus) lastFocus.focus(); };
    const exec = (c) => { hide(); if (c) setTimeout(c.run, 40); };
    $("#paletteBtn").addEventListener("click", show);
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return hide();
      const li = e.target.closest("li[data-i]"); if (li) exec(shown[+li.dataset.i]);
    });
    list.addEventListener("pointermove", (e) => {
      const li = e.target.closest("li[data-i]"); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); }
    });
    input.addEventListener("input", () => { sel = 0; render(); });
    addEventListener("keydown", (e) => {
      const typing = /input|textarea/i.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); root.hidden ? show() : hide(); return; }
      if (root.hidden && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === "t") { flipTheme(); return; }
        if (e.key === "/") { e.preventDefault(); show(); return; }
      }
      if (root.hidden) return;
      if (e.key === "Escape") hide();
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
      else if (e.key === "Enter") { e.preventDefault(); exec(shown[sel]); }
    });
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ---------------- boot ---------------- */
  theme();
  clock();
  navigation();
  reveals();
  statementScrub();
  projectCards();
  energyChart();
  timeline();
  stackLedger();
  neuro();
  email();
  palette();
  countUps();
})();
