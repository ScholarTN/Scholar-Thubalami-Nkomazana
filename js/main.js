/* =========================================================
   STN — interactions
   No dependencies. Every effect degrades gracefully and
   respects prefers-reduced-motion.
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const EMBER = [224, 138, 79];
  const INK = [239, 231, 218];

  /* ---------------- preloader ---------------- */
  function preloader(done) {
    const el = $("#preloader");
    const count = $("#preloaderCount");
    const start = performance.now();
    const minTime = reduced ? 0 : 1700;
    let assetsReady = false;
    const img = new Image();
    img.src = "assets/img/portrait-hero.webp";
    Promise.race([
      Promise.all([img.decode().catch(() => {}), document.fonts ? document.fonts.ready : null]),
      new Promise((r) => setTimeout(r, 3500)),
    ]).then(() => (assetsReady = true));

    (function tick(now) {
      const t = clamp((now - start) / Math.max(minTime, 1), 0, 1);
      const shown = assetsReady ? t : Math.min(t, 0.9);
      count.textContent = String(Math.round((1 - Math.pow(1 - shown, 3)) * 100)).padStart(3, "0");
      if (shown < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        el.classList.add("is-done");
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        done();
        setTimeout(() => el.remove(), 1200);
      }, reduced ? 0 : 200);
    })(start);
  }

  /* ---------------- reveal on scroll ---------------- */
  function reveals() {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    $$(".reveal-up, .contact__title, .pcard").forEach((el) => io.observe(el));
    $(".hero__name").classList.add("is-in");
    $$(".hero .reveal-up").forEach((el) => el.classList.add("is-in"));
  }

  /* ---------------- statement scrub ---------------- */
  function statementScrub() {
    const el = $("[data-scrub]");
    if (!el) return;
    const hl = new Set(["technology", "medicine", "brain,"]);
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w${hl.has(w.toLowerCase().replace(/[—]/g, "")) ? " hl" : ""}">${w}</span>`).join(" ");
    const spans = $$(".w", el);
    if (reduced) return spans.forEach((s) => s.classList.add("on"));
    let last = -1;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const n = Math.round(p * spans.length);
      if (n === last) return;
      last = n;
      spans.forEach((s, i) => s.classList.toggle("on", i < n));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- role scramble ---------------- */
  function roles() {
    const el = $("#roleWord");
    const items = $$(".roles__list i");
    const list = items.map((i) => i.dataset.role);
    const glyphs = "▚▞▖▗▘▝01<>/\\_=+*#";
    let idx = list.indexOf("Builder");
    const mark = () => items.forEach((i, k) => i.classList.toggle("is-on", k === idx));
    mark();
    const scrambleTo = (target) => {
      if (reduced) { el.textContent = target; return; }
      const from = el.textContent;
      const len = Math.max(from.length, target.length);
      const queue = [];
      for (let i = 0; i < len; i++) {
        const s = Math.floor(Math.random() * 12);
        queue.push({ from: from[i] || "", to: target[i] || "", start: s, end: s + 10 + Math.floor(Math.random() * 14) });
      }
      let frame = 0;
      (function step() {
        let out = "", done = 0;
        for (const q of queue) {
          if (frame >= q.end) { done++; out += q.to; }
          else if (frame >= q.start) out += glyphs[Math.floor(Math.random() * glyphs.length)];
          else out += q.from;
        }
        el.textContent = out;
        frame++;
        if (done < queue.length) requestAnimationFrame(step);
      })();
    };
    setInterval(() => {
      if (document.hidden) return;
      idx = (idx + 1) % list.length;
      mark();
      scrambleTo(list[idx]);
    }, 2600);
    items.forEach((it, k) => it.addEventListener("click", () => { idx = k; mark(); scrambleTo(list[k]); }));
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
      nav.classList.toggle("is-scrolled", y > 30);
      const menuOpen = document.body.classList.contains("menu-open");
      nav.classList.toggle("is-hidden", !menuOpen && y > lastY && y > innerHeight * 0.8);
      lastY = y;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const links = $$(".nav__links a");
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove("is-active"));
          const a = map.get(e.target.id);
          if (a) a.classList.add("is-active");
        }
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

  /* ---------------- cursor + magnetic ---------------- */
  function cursor() {
    if (!finePointer || reduced) return;
    document.documentElement.classList.add("has-cursor");
    const root = $(".cursor");
    const dot = $(".cursor__dot");
    const ring = $(".cursor__ring");
    const label = $(".cursor__label");
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest("a, button, [data-cursor], .cap, input");
      root.classList.toggle("is-hover", !!t);
      const l = t && t.dataset.cursor;
      root.classList.toggle("is-label", !!l);
      if (l) label.textContent = l;
    });
    document.addEventListener("pointerleave", () => root.classList.remove("is-hover", "is-label"));

    $$("[data-magnetic]").forEach((el) => {
      const strength = el.classList.contains("email") ? 0.15 : 0.32;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .7s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 700);
      });
    });
  }

  /* ---------------- hero: accretion field ----------------
     Particles drift freely. Near the pointer they are pulled into
     orbit (accretion) and link to their neighbours (emergence). */
  function field() {
    const canvas = $("#field");
    const ctx = canvas.getContext("2d");
    const hero = $("#hero");
    let w, h, dpr, parts = [], running = true;
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false, last: 0 };
    const R = () => Math.min(260, Math.max(160, w * 0.17));

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 8500, 60, 190));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.5,
        c: Math.random() < 0.18 ? EMBER : INK,
        a: Math.random() * 0.5 + 0.25,
        s: Math.random() < 0.5 ? 1 : -1,
      }));
    }

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
      if (!ptr.active) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      ptr.active = true; ptr.last = performance.now();
    }, { passive: true });
    hero.addEventListener("pointerleave", () => (ptr.active = false));
    hero.addEventListener("pointerdown", (e) => {
      const r = hero.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      for (const p of parts) {
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
        if (d < 320) { const f = (1 - d / 320) * 9; p.vx += (dx / d) * f; p.vy += (dy / d) * f; }
      }
    });

    function step(t) {
      // autonomous attractor when idle (touch devices, or pointer resting)
      if (!ptr.active || t - ptr.last > 4000) {
        const k = t * 0.00018;
        ptr.tx = w * (0.62 + 0.22 * Math.sin(k * 1.3));
        ptr.ty = h * (0.48 + 0.26 * Math.sin(k * 2.1 + 1));
      }
      ptr.x = lerp(ptr.x < -999 ? ptr.tx : ptr.x, ptr.tx, 0.08);
      ptr.y = lerp(ptr.y < -999 ? ptr.ty : ptr.y, ptr.ty, 0.08);

      ctx.clearRect(0, 0, w, h);
      const rad = R();
      const near = [];
      for (const p of parts) {
        const dx = ptr.x - p.x, dy = ptr.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < rad) {
          const f = (1 - d / rad);
          // pull inward + tangential swirl = accretion disc
          p.vx += (dx / d) * f * 0.09 + (-dy / d) * f * 0.11 * p.s;
          p.vy += (dy / d) * f * 0.09 + (dx / d) * f * 0.11 * p.s;
          if (d < 26) { p.vx -= (dx / d) * 0.5; p.vy -= (dy / d) * 0.5; }
          near.push(p); p.n = f;
        } else p.n = 0;
        p.vx += (Math.random() - 0.5) * 0.02;
        p.vy += (Math.random() - 0.5) * 0.02;
        p.vx *= 0.965; p.vy *= 0.965;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }

      // emergence: links among accreted particles
      ctx.lineWidth = 0.7;
      for (let i = 0; i < near.length; i++) {
        const a = near[i];
        for (let j = i + 1; j < near.length; j++) {
          const b = near[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 78) {
            const al = (1 - d / 78) * Math.min(a.n, b.n) * 0.9;
            ctx.strokeStyle = `rgba(${EMBER[0]},${EMBER[1]},${EMBER[2]},${al})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      for (const p of parts) {
        const glow = p.n * 0.8;
        ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${Math.min(1, p.a + glow)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.n * 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // core
      const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, rad * 0.55);
      g.addColorStop(0, "rgba(224,138,79,0.10)"); g.addColorStop(1, "rgba(224,138,79,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ptr.x, ptr.y, rad * 0.55, 0, Math.PI * 2); ctx.fill();
    }

    function loop(t) {
      if (running) step(t);
      requestAnimationFrame(loop);
    }
    resize();
    addEventListener("resize", debounce(resize, 200));
    if (reduced) { step(0); return; }
    new IntersectionObserver(([e]) => (running = e.isIntersecting)).observe(hero);
    document.addEventListener("visibilitychange", () => (running = !document.hidden));
    requestAnimationFrame(loop);
  }

  /* ---------------- hero parallax ---------------- */
  function heroParallax() {
    if (!finePointer || reduced) return;
    const v = $("#heroVisual");
    const img = $(".portrait", v), orbit = $(".orbit", v), halo = $(".halo", v);
    let tx = 0, ty = 0, x = 0, y = 0;
    addEventListener("pointermove", (e) => {
      tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
    (function loop() {
      x = lerp(x, tx, 0.06); y = lerp(y, ty, 0.06);
      if (scrollY < innerHeight) {
        img.style.translate = `${x * -18}px ${y * -10 + scrollY * 0.12}px`;
        orbit.style.translate = `${x * 30}px ${y * 22}px`;
        halo.style.translate = `${x * 40}px ${y * 30}px`;
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- capability accordion ---------------- */
  function capabilities() {
    const caps = $$(".cap");
    caps.forEach((c) => {
      c.setAttribute("tabindex", "0");
      c.setAttribute("role", "button");
      const open = () => {
        const was = c.classList.contains("is-open");
        caps.forEach((x) => { x.classList.remove("is-open"); x.setAttribute("aria-expanded", "false"); });
        if (!was) { c.classList.add("is-open"); c.setAttribute("aria-expanded", "true"); }
      };
      c.addEventListener("click", open);
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
    caps[0].classList.add("is-open");
  }

  /* ---------------- stacking project cards + spotlight ---------------- */
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
        const top = c.getBoundingClientRect().top;
        const nTop = next.getBoundingClientRect().top;
        const p = clamp(1 - (nTop - top) / innerHeight, 0, 1);
        c.style.transform = `scale(${1 - p * 0.06})`;
        c.style.filter = `brightness(${1 - p * 0.45})`;
      });
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();

    $$(".cert[data-tilt]").forEach((el) => {
      if (!finePointer) return;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
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
      base += (Math.random() - 0.5) * 0.18;
      base = clamp(base, 1.2, 4.2);
      const spike = Math.random() < 0.03 ? Math.random() * 1.6 : 0;
      return clamp(base + Math.sin(t / 7) * 0.35 + spike, 0.6, 5.5);
    };
    for (let i = 0; i < N; i++) data.push(sample(i));
    let t = N;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const max = 6, step = w / (N - 1);
      const y = (v) => h - 10 - (v / max) * (h - 20);
      // grid
      ctx.strokeStyle = "rgba(239,231,218,0.07)"; ctx.lineWidth = 1;
      for (let g = 1; g < 6; g++) { ctx.beginPath(); ctx.moveTo(0, y(g)); ctx.lineTo(w, y(g)); ctx.stroke(); }
      // area
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(224,138,79,0.35)"); grad.addColorStop(1, "rgba(224,138,79,0)");
      ctx.beginPath(); ctx.moveTo(0, h);
      data.forEach((v, i) => ctx.lineTo(i * step, y(v)));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      // line
      ctx.beginPath();
      data.forEach((v, i) => (i ? ctx.lineTo(i * step, y(v)) : ctx.moveTo(0, y(v))));
      ctx.strokeStyle = "#e08a4f"; ctx.lineWidth = 1.6; ctx.stroke();
      // head
      const last = data[data.length - 1];
      ctx.fillStyle = "#f3b07c"; ctx.beginPath(); ctx.arc(w - 2, y(last), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(243,176,124,0.3)"; ctx.beginPath(); ctx.arc(w - 2, y(last), 9, 0, Math.PI * 2); ctx.stroke();
    };
    resize(); draw();
    addEventListener("resize", debounce(() => { resize(); draw(); }, 200));
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(c);
    if (reduced) return;
    setInterval(() => {
      if (!visible || document.hidden) return;
      data.push(sample(t++)); data.shift();
      const v = data[data.length - 1];
      energy += v / 3600 * 4;
      kw.textContent = v.toFixed(2);
      kwh.textContent = `${energy.toFixed(3)} kWh`;
      draw();
    }, 240);
  }

  /* ---------------- timeline ---------------- */
  function timeline() {
    const tl = $("#timeline"), fill = $("#timelineFill"), items = $$(".tl", tl);
    const update = () => {
      const r = tl.getBoundingClientRect();
      const p = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      fill.style.transform = `scaleY(${p})`;
      items.forEach((it) => it.classList.toggle("is-lit", it.getBoundingClientRect().top < innerHeight * 0.6));
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- stack ledger ---------------- */
  function stackLedger() {
    const tags = $$("#stackLedger [data-k]");
    $$(".stack [data-p]").forEach((chip) => {
      const on = () => {
        const ks = chip.dataset.p.split(" ").filter(Boolean);
        tags.forEach((t) => t.classList.toggle("on", ks.includes(t.dataset.k)));
      };
      chip.addEventListener("pointerenter", on);
      chip.addEventListener("pointerleave", () => tags.forEach((t) => t.classList.remove("on")));
      chip.setAttribute("tabindex", "0");
      chip.addEventListener("focus", on);
      chip.addEventListener("blur", () => tags.forEach((t) => t.classList.remove("on")));
    });
  }

  /* ---------------- parallax (axterion) ---------------- */
  function parallax() {
    if (reduced) return;
    const els = $$("[data-parallax]");
    const update = () => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2 - innerHeight / 2;
        el.style.translate = `0 ${c * -parseFloat(el.dataset.parallax)}px`;
      });
    };
    addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------------- neural constellation ---------------- */
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
      // two hemispheres
      nodes = [];
      const cx = w / 2, cy = h / 2, rx = Math.min(w * 0.42, 620), ry = Math.min(h * 0.4, 300);
      const n = w < 700 ? 70 : 130;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
        const x = cx + side * rx * 0.48 + Math.cos(a) * r * rx * 0.52;
        const y = cy + Math.sin(a) * r * ry * (1 - 0.15 * Math.cos(a));
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
        n.x = n.ox + Math.sin(t * 0.0006 + n.ph) * 3;
        n.y = n.oy + Math.cos(t * 0.0005 + n.ph) * 3;
      }
      ctx.lineWidth = 0.6;
      for (const [i, j] of edges) {
        const a = nodes[i], b = nodes[j];
        const md = Math.hypot((a.x + b.x) / 2 - mouse.x, (a.y + b.y) / 2 - mouse.y);
        const boost = md < 180 ? (1 - md / 180) * 0.5 : 0;
        ctx.strokeStyle = `rgba(239,231,218,${0.07 + boost})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (const n of nodes) {
        const md = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        const boost = md < 160 ? 1 - md / 160 : 0;
        ctx.fillStyle = boost ? `rgba(224,138,79,${0.4 + boost * 0.6})` : "rgba(239,231,218,0.35)";
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.3 + boost * 2, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduced && edges.length && Math.random() < 0.18) pulses.push({ e: edges[(Math.random() * edges.length) | 0], p: 0, dir: Math.random() < 0.5 });
      pulses = pulses.filter((q) => q.p <= 1);
      for (const q of pulses) {
        q.p += 0.022;
        const a = nodes[q.e[q.dir ? 0 : 1]], b = nodes[q.e[q.dir ? 1 : 0]];
        const x = lerp(a.x, b.x, q.p), y = lerp(a.y, b.y, q.p);
        ctx.fillStyle = `rgba(243,176,124,${Math.sin(q.p * Math.PI)})`;
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      }
    };
    resize();
    addEventListener("resize", debounce(resize, 250));
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sec);
    if (reduced) { draw(0); return; }
    (function loop(t) { if (visible && !document.hidden) draw(t); requestAnimationFrame(loop); })(0);
  }

  /* ---------------- toast + email ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
  }
  const EMAIL = "thubalaminkomazana15@gmail.com";
  async function copyEmail() {
    try { await navigator.clipboard.writeText(EMAIL); toast("Email copied — talk soon ✳"); }
    catch { location.href = `mailto:${EMAIL}`; }
  }
  function email() { $("#emailBtn").addEventListener("click", copyEmail); }

  /* ---------------- command palette ---------------- */
  function palette() {
    const root = $("#palette"), input = $("#paletteInput"), list = $("#paletteList");
    const go = (id) => () => document.getElementById(id).scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    const open = (u) => () => window.open(u, "_blank", "noopener");
    const cmds = [
      { t: "Go to About", k: "Navigate", run: go("about") },
      { t: "Go to What I do", k: "Navigate", run: go("capabilities") },
      { t: "Go to Featured work", k: "Navigate", run: go("work") },
      { t: "Go to Experience", k: "Navigate", run: go("experience") },
      { t: "Go to Axterion", k: "Navigate", run: go("axterion") },
      { t: "Go to Technical stack", k: "Navigate", run: go("stack") },
      { t: "Go to Certifications", k: "Navigate", run: go("certs") },
      { t: "Go to Contact", k: "Navigate", run: go("contact") },
      { t: "Copy email address", k: "Action", run: copyEmail },
      { t: "Send an email", k: "Action", run: () => (location.href = `mailto:${EMAIL}`) },
      { t: "Open GitHub — ScholarTN", k: "Link", run: open("https://github.com/ScholarTN") },
      { t: "Open LinkedIn", k: "Link", run: open($("#linkedinLink").href) },
      { t: "Visit axterionlabs.com", k: "Link", run: open("https://axterionlabs.com") },
      { t: "Diabetes Risk Prediction AI — source", k: "Project", run: open("https://github.com/ScholarTN/AI-Disease-Prediction") },
      { t: "Smart Energy Dashboard — source", k: "Project", run: open("https://github.com/ScholarTN/smart-energy-dashboard") },
      { t: "FleetMind — source", k: "Project", run: open("https://github.com/ScholarTN/fleetmindAI") },
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
    const show = () => { lastFocus = document.activeElement; root.hidden = false; input.value = ""; sel = 0; render(); setTimeout(() => input.focus(), 10); };
    const hide = () => { root.hidden = true; if (lastFocus) lastFocus.focus(); };
    const exec = (c) => { hide(); if (c) setTimeout(c.run, 60); };
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); root.hidden ? show() : hide(); return; }
      if (e.key === "/" && root.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); show(); return; }
      if (root.hidden) return;
      if (e.key === "Escape") hide();
      else if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
      else if (e.key === "Enter") { e.preventDefault(); exec(shown[sel]); }
    });
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ---------------- boot ---------------- */
  clock();
  navigation();
  cursor();
  field();
  heroParallax();
  statementScrub();
  roles();
  capabilities();
  projectCards();
  energyChart();
  timeline();
  stackLedger();
  parallax();
  neuro();
  email();
  palette();
  preloader(reveals);

  console.log("%cSTN%c  Proximity is the locus of accretion and emergence.  —  press ⌘K", "font:700 20px serif;color:#e08a4f", "color:#b3a99b");
})();
