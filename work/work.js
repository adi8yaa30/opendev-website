/* ============================================================
   OpenDev — /work + /work/<slug>
   Plain JS first; GSAP (ScrollTrigger + Flip) only enhances.
   If the GSAP CDN fails, everything still renders and works.
   ============================================================ */

(() => {
  const SITE = "https://opendev.agency";
  const DATA_URL = "/projects.json";
  const page = document.body.dataset.page; // "work" | "case"

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Flip = window.Flip;

  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  const reduceMotion = mq("(prefers-reduced-motion: reduce)");
  const finePointer = mq("(hover: hover) and (pointer: fine)");
  const useGsap = !!(gsap && ScrollTrigger) && !reduceMotion;

  if (useGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (Flip) gsap.registerPlugin(Flip);
    document.documentElement.classList.add("has-gsap");
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* ============================================================
     UI sound + cursor — same feel as the homepage (script.js)
     ============================================================ */

  let audioCtx = null;
  const getCtx = () => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  };
  // Only make sound after the user has interacted (browsers block it before that anyway)
  let audioUnlocked = false;
  window.addEventListener("pointerdown", () => (audioUnlocked = true), { once: true });
  window.addEventListener("keydown", () => (audioUnlocked = true), { once: true });

  const playTone = ({ freq = 800, duration = 0.05, volume = 0.06, type = "sine" } = {}) => {
    if (!audioUnlocked) return;
    const ctx = getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  };
  const sfxHover = () => playTone({ freq: 1500, duration: 0.04, volume: 0.03, type: "square" });
  const sfxClick = () => {
    playTone({ freq: 720, duration: 0.06, volume: 0.08, type: "triangle" });
    setTimeout(() => playTone({ freq: 1100, duration: 0.05, volume: 0.05, type: "sine" }), 18);
  };
  const wireSfx = (root = document) => {
    $$(".fx-target", root).forEach((el) => {
      if (el.dataset.fxWired) return;
      el.dataset.fxWired = "1";
      el.addEventListener("mouseenter", sfxHover);
      el.addEventListener("click", sfxClick);
    });
  };

  const initCursor = () => {
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    if (!finePointer || !dot || !ring) return;

    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    let active = false;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!active) {
        active = true;
        dot.classList.add("is-active");
        ring.classList.add("is-active");
      }
    });
    document.addEventListener("mouseleave", () => {
      active = false;
      dot.classList.remove("is-active");
      ring.classList.remove("is-active");
    });
    window.addEventListener("mousedown", () => ring.classList.add("is-press"));
    window.addEventListener("mouseup", () => ring.classList.remove("is-press"));

    const tick = () => {
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const hoverSel = "a, button, .fx-target, [role='button']";
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      ring.classList.toggle("is-view", !!t.closest("[data-cursor='view']"));
      ring.classList.toggle("is-hover", !!t.closest(hoverSel));
    });
  };

  /* ============================================================
     Nav: mobile toggle + hide-on-scroll top bar
     ============================================================ */

  const initMobileNav = () => {
    const toggle = $("#navToggle");
    const nav = $("#topNav");
    if (!toggle || !nav) return;
    const setOpen = (open) => {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("nav-open")) return;
      if (e.target.closest("#topNav") || e.target.closest("#navToggle")) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  };

  const initTopbar = () => {
    const bar = $(".work-topbar");
    if (!bar) return;
    let lastY = scrollY;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = scrollY;
      bar.classList.toggle("is-solid", y > 40);
      // Hide while scrolling down past the hero, show on any scroll up
      bar.classList.toggle("is-hidden", y > 320 && y > lastY && !bar.contains(document.activeElement));
      lastY = y;
    };
    addEventListener("scroll", () => raf || (raf = requestAnimationFrame(update)), { passive: true });
    update();
  };

  /* ============================================================
     Boot loader — plain JS, never waits on GSAP
     ============================================================ */

  const runBoot = () =>
    new Promise((resolve) => {
      const root = document.documentElement;
      const boot = $("#boot");
      if (!boot || !root.classList.contains("show-boot")) return resolve();

      const bar = $("#bootBar");
      const pct = $("#bootPercent");
      const PIPS = 14;
      const DURATION = reduceMotion ? 200 : 850;
      for (let i = 0; i < PIPS; i++) {
        const p = document.createElement("div");
        p.className = "loader-pip";
        bar.appendChild(p);
      }
      const pips = $$(".loader-pip", bar);

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        try { sessionStorage.setItem("od-booted", "1"); } catch (_) {}
        boot.classList.add("is-done");
        setTimeout(() => root.classList.remove("show-boot"), 600);
        resolve();
      };

      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / DURATION);
        pct.textContent = Math.round(t * 100);
        const lit = Math.floor(t * PIPS);
        pips.forEach((p, i) => p.classList.toggle("is-on", i < lit));
        if (t < 1) requestAnimationFrame(tick);
        else {
          pips.forEach((p) => p.classList.add("is-on"));
          setTimeout(finish, 120);
        }
      };
      requestAnimationFrame(tick);
      setTimeout(finish, 3000); // failsafe: never trap the user behind the loader
    });

  /* ============================================================
     Page transition — same sweep + readout as the homepage
     ============================================================ */

  const initPageTransitions = () => {
    const readout = $("#ptReadoutText");
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (url.href === location.href) return;
      if (reduceMotion) return;

      e.preventDefault();
      if (readout) readout.textContent = a.dataset.readout || "TRANSMITTING";
      document.body.classList.add("is-navigating");
      setTimeout(() => (location.href = url.href), 420);
    });
    // Coming back via the back button restores the page from cache with the overlay on
    addEventListener("pageshow", (e) => {
      if (e.persisted) document.body.classList.remove("is-navigating");
    });
  };

  /* ============================================================
     Typewriter — "> LOADING ARCHIVE _" style lines + section labels
     ============================================================ */

  const typeIn = (el) => {
    if (el.dataset.typed) return;
    el.dataset.typed = "1";
    const full = el.textContent;
    if (reduceMotion) return;
    // Hold the final width so surrounding layout doesn't jump while typing
    el.style.minWidth = el.getBoundingClientRect().width + "px";
    el.style.display = el.style.display || "inline-block";
    el.textContent = "";
    let i = 0;
    const step = () => {
      i++;
      el.textContent = full.slice(0, i);
      if (i < full.length) setTimeout(step, 34);
    };
    setTimeout(step, 120);
  };

  const initTypewriters = (root = document) => {
    const els = $$("[data-type]", root).filter((el) => !el.dataset.typed);
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            typeIn(en.target);
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.6 }
    );
    els.forEach((el) => io.observe(el));
  };

  /* ============================================================
     Reveals, hero lines, count-ups
     ============================================================ */

  const initReveals = (root = document) => {
    if (!useGsap) return;
    const els = $$(".reveal", root).filter((el) => !el.dataset.revealWired);
    els.forEach((el) => (el.dataset.revealWired = "1"));
    ScrollTrigger.batch(els, {
      start: "top 88%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          overwrite: true,
          onComplete: () => batch.forEach((el) => (el.dataset.revealed = "1")),
        }),
    });
  };

  const revealHeroLines = () => {
    if (!useGsap) return;
    gsap.fromTo(
      ".w-line-inner",
      { yPercent: 110 },
      { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.12, delay: 0.05 }
    );
  };

  const initCountUps = () => {
    const els = $$("[data-count]");
    if (!els.length || reduceMotion || !("IntersectionObserver" in window)) return;
    const run = (el) => {
      const to = parseInt(el.dataset.count, 10);
      const from = parseInt(el.dataset.from || "0", 10);
      const start = performance.now();
      const D = 1600;
      const tick = (now) => {
        const t = Math.min(1, (now - start) / D);
        const e = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    els.forEach((el) => (el.textContent = el.dataset.from || "0"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            run(en.target);
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.5 }
    );
    els.forEach((el) => io.observe(el));
  };

  /* ============================================================
     Media helpers — styled placeholder until real assets exist
     ============================================================ */

  const watchMedia = (root = document) => {
    $$(".media img", root).forEach((img) => {
      const media = img.closest(".media");
      const miss = () => {
        if (!media.classList.contains("has-video")) media.classList.add("is-missing");
      };
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener("error", miss);
    });
  };

  const lazyVideo = (video) => {
    if (!video) return;
    const media = video.closest(".media");
    if (reduceMotion) return video.remove(); // poster image only
    const load = () => {
      // preload="none" never fetches on its own; switch it on and ask for data now
      video.preload = "auto";
      video.src = video.dataset.src;
      video.load();
      video.addEventListener("loadeddata", () => {
        media.classList.add("has-video");
        media.classList.remove("is-missing");
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      }, { once: true });
      video.addEventListener("error", () => video.remove(), { once: true });
    };
    if (!("IntersectionObserver" in window)) return load();
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        load();
        io.disconnect();
      }
    }, { rootMargin: "200px" });
    io.observe(video);
  };

  const mediaHTML = (p, { eager = false, big = false } = {}) => `
    <img src="${esc(p.image)}" alt="${esc(p.alt)}" width="1600" height="1000"
      ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"
      sizes="${big ? "100vw" : "(max-width: 760px) 100vw, 60vw"}" />`;

  const placeholderLabel = (src) => `ASSET PENDING · ${src}`;

  /* ============================================================
     Data
     ============================================================ */

  const loadData = () =>
    fetch(DATA_URL, { credentials: "same-origin" }).then((r) => {
      if (!r.ok) throw new Error("projects.json " + r.status);
      return r.json();
    }).then((data) => {
      // "hidden": true keeps a project in the file but off the site (grid, case page, next links)
      data.projects = data.projects.filter((p) => !p.hidden);
      return data;
    });

  const filtersFor = (p, data) =>
    Array.from(new Set(p.tags.map((t) => data.tagToFilter[t]).filter(Boolean)));

  const statusHTML = (status) => {
    if (!status) return "";
    const cls = { LIVE: "status-live", CONCEPT: "status-concept", "IN PROGRESS": "status-progress" }[status] || "";
    return `<span class="status ${cls}">${esc(status)}</span>`;
  };

  const creativeWork = (p) => {
    const o = {
      "@type": "CreativeWork",
      name: p.name,
      url: `${SITE}/work/${p.slug}`,
      description: p.outcome,
      image: SITE + p.image,
      dateCreated: p.year,
      keywords: p.tags.join(", "),
      about: p.client,
      creator: { "@type": "Organization", name: "OpenDev", url: SITE + "/" },
    };
    if (p.link) o.sameAs = p.link;
    return o;
  };

  const injectJsonLd = (obj) => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(obj);
    document.head.appendChild(s);
  };

  /* ============================================================
     /work — filters, featured, grid
     ============================================================ */

  // Editorial rhythm across 12 columns: 7+5 · 4+4+4 · 5+7, then repeat
  const SIZE_PATTERN = [
    ["span-7"], ["span-5", "is-offset"],
    ["span-4"], ["span-4", "is-offset"], ["span-4"],
    ["span-5", "is-offset"], ["span-7"],
  ];
  const SIZE_CLASSES = ["span-7", "span-5", "span-4", "span-6", "is-offset"];

  const assignSizes = (grid) => {
    const visible = $$(".card", grid).filter((c) => !c.classList.contains("is-hidden"));
    const n = visible.length;
    visible.forEach((c, i) => {
      c.classList.remove(...SIZE_CLASSES);
      let size = SIZE_PATTERN[i % SIZE_PATTERN.length];
      // Don't strand a lone small card (or a pair) in an unfinished 4+4+4 row
      const pos = i % SIZE_PATTERN.length;
      const rowStart = i - (pos - 2);
      if (pos >= 2 && pos <= 4 && n - rowStart < 3) {
        size = n - rowStart === 1 ? ["span-7"] : pos === 3 ? ["span-6", "is-offset"] : ["span-6"];
      }
      c.classList.add(...size);
    });
  };

  const cardHTML = (p, index, data) => `
    <li class="card reveal" data-card data-filters="${filtersFor(p, data).join(" ")}">
      <a class="card-link fx-target" href="/work/${esc(p.slug)}" data-cursor="view" data-readout="OPENING CASE FILE">
        <div class="media" data-placeholder="${esc(placeholderLabel(p.image))}">
          ${mediaHTML(p)}
          ${p.video ? `<video muted loop playsinline preload="none" data-src="${esc(p.video)}" aria-hidden="true"></video>` : ""}
          ${p.status ? `<span class="card-status">${statusHTML(p.status)}</span>` : ""}
          <span class="card-cta" aria-hidden="true">VIEW CASE <span>→</span></span>
        </div>
        <div class="card-head">
          <span class="card-index">${pad(index)}</span>
          <h3 class="card-name">${esc(p.name)}</h3>
          <span class="card-year">${esc(p.year)}</span>
        </div>
        <p class="card-client">${esc(p.client)}</p>
        <p class="card-outcome">${esc(p.outcome)}</p>
        <div class="card-tags">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      </a>
    </li>`;

  const featuredHTML = (p, index, data) => `
    <div class="reveal" data-card data-filters="${filtersFor(p, data).join(" ")}">
      <a class="w-featured fx-target" href="/work/${esc(p.slug)}" data-cursor="view" data-readout="OPENING CASE FILE">
        <div class="media" data-placeholder="${esc(placeholderLabel(p.image + (p.video ? " / " + p.video : "")))}">
          <div class="media-inner">
            ${mediaHTML(p, { eager: true, big: true })}
            ${p.video ? `<video muted loop playsinline preload="none" data-src="${esc(p.video)}" aria-hidden="true"></video>` : ""}
          </div>
          <div class="w-featured-kicker">
            <span class="status status-live">FEATURED CASE</span>
            ${p.status ? statusHTML(p.status) : ""}
          </div>
          <span class="card-cta" aria-hidden="true">VIEW CASE <span>→</span></span>
        </div>
        <div class="w-featured-info">
          <span class="card-index">${pad(index)}</span>
          <div>
            <h2 class="w-featured-name">${esc(p.name)}</h2>
            <p class="card-client">${esc(p.client)} · ${esc(p.year)}</p>
          </div>
          <div>
            <p class="card-outcome">${esc(p.outcome)}</p>
            <div class="card-tags">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
          </div>
        </div>
      </a>
    </div>`;

  const initCardHoverVideo = (grid) => {
    if (!finePointer || reduceMotion) return;
    $$(".card-link", grid).forEach((link) => {
      const video = $("video", link);
      if (!video) return;
      const media = video.closest(".media");
      link.addEventListener("mouseenter", () => {
        if (!video.getAttribute("src")) {
          video.preload = "auto";
          video.src = video.dataset.src;
          video.addEventListener("error", () => (video.hidden = true), { once: true });
        }
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
        media.classList.add("is-playing");
      });
      link.addEventListener("mouseleave", () => {
        video.pause();
        media.classList.remove("is-playing");
      });
    });
  };

  const initFeaturedParallax = (el) => {
    if (!el || !useGsap || !finePointer) return;
    const inner = $(".media-inner", el);
    const name = $(".w-featured-name", el);
    const mx = gsap.quickTo(inner, "x", { duration: 0.8, ease: "power3.out" });
    const my = gsap.quickTo(inner, "y", { duration: 0.8, ease: "power3.out" });
    const nx = gsap.quickTo(name, "x", { duration: 0.9, ease: "power3.out" });
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      mx(-px * 28);
      my(-py * 18);
      nx(px * 16);
    });
    el.addEventListener("mouseleave", () => {
      mx(0); my(0); nx(0);
    });
  };

  const renderWork = (data) => {
    const projects = data.projects;
    const featured = projects.find((p) => p.featured);
    const rest = projects.filter((p) => p !== featured);
    const idx = (p) => projects.indexOf(p) + 1;

    // Featured
    const featuredHost = $("#featured");
    if (featured) featuredHost.innerHTML = featuredHTML(featured, idx(featured), data);

    // Grid
    const grid = $("#grid");
    grid.innerHTML = rest.map((p) => cardHTML(p, idx(p), data)).join("");
    assignSizes(grid);

    // Filters
    const filterHost = $("#filters");
    // Only offer filters that match at least one visible project
    const used = new Set(projects.flatMap((p) => filtersFor(p, data)));
    filterHost.innerHTML = data.filters
      .filter((f) => f.id === "all" || used.has(f.id))
      .map(
        (f) =>
          `<button type="button" class="chip fx-target" data-filter="${esc(f.id)}" aria-pressed="${f.id === "all"}">${esc(f.label)}</button>`
      )
      .join("");

    const count = $("#workCount");
    const allCards = () => $$("[data-card]");
    const updateCount = (label) => {
      const shown = allCards().filter((c) => !c.classList.contains("is-hidden")).length;
      count.textContent = `SHOWING ${pad(shown)} / ${pad(projects.length)}${label && label !== "ALL" ? " · " + label : ""}`;
    };
    updateCount();

    const applyFilter = (id, label) => {
      const cards = allCards();
      const canFlip = useGsap && Flip;

      // Anything still waiting for its scroll reveal is shown now, so Flip measures real positions
      if (canFlip) {
        cards.forEach((c) => {
          if (!c.dataset.revealed) {
            gsap.killTweensOf(c);
            gsap.set(c, { opacity: 1, y: 0 });
            c.dataset.revealed = "1";
          }
        });
      }

      const state = canFlip ? Flip.getState(cards, { props: "opacity" }) : null;

      cards.forEach((c) => {
        const match = id === "all" || c.dataset.filters.split(" ").includes(id);
        c.classList.toggle("is-hidden", !match);
      });
      assignSizes(grid);
      updateCount(label);

      if (state) {
        Flip.from(state, {
          duration: 0.7,
          ease: "power3.inOut",
          absolute: true,
          stagger: 0.03,
          onEnter: (els) =>
            gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.06 }),
          onLeave: (els) => gsap.to(els, { opacity: 0, y: 20, duration: 0.3, ease: "power2.in" }),
          onComplete: () => ScrollTrigger.refresh(),
        });
      }
    };

    filterHost.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn || btn.getAttribute("aria-pressed") === "true") return;
      $$("[data-filter]", filterHost).forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      applyFilter(btn.dataset.filter, btn.textContent);
    });

    // Arrow keys move between filter chips
    filterHost.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const btns = $$("[data-filter]", filterHost);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    });

    // Structured data: the archive + each project as a CreativeWork
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Work — OpenDev",
      url: SITE + "/work",
      isPartOf: { "@type": "WebSite", name: "OpenDev", url: SITE + "/" },
      hasPart: projects.map(creativeWork),
    });

    wireSfx();
    watchMedia();
    lazyVideo($("#featured video"));
    initCardHoverVideo(grid);
    initFeaturedParallax($(".w-featured"));
    initReveals();
  };

  /* ============================================================
     /work/<slug> — case study template
     ============================================================ */

  const getSlug = () => {
    const q = new URLSearchParams(location.search).get("p");
    if (q) return q;
    const last = location.pathname.replace(/\/+$/, "").split("/").pop();
    return last && !/^case(\.html)?$/.test(last) ? decodeURIComponent(last) : "";
  };

  const setMeta = (p) => {
    const title = `${p.name} — Case Study | OpenDev`;
    const desc = `${p.name} (${p.client}, ${p.year}): ${p.outcome} Built by OpenDev, a web, app & AI agency in India.`;
    const url = `${SITE}/work/${p.slug}`;
    document.title = title;
    const set = (sel, attr, val) => {
      const el = $(sel);
      if (el) el.setAttribute(attr, val);
    };
    set('meta[name="description"]', "content", desc);
    set('link[rel="canonical"]', "href", url);
    set('meta[property="og:title"]', "content", title);
    set('meta[property="og:description"]', "content", desc);
    set('meta[property="og:url"]', "content", url);
    set('meta[property="og:image"]', "content", SITE + p.image);
    set('meta[property="og:image:alt"]', "content", p.alt);
    set('meta[name="twitter:title"]', "content", title);
    set('meta[name="twitter:description"]', "content", desc);
    set('meta[name="twitter:image"]', "content", SITE + p.image);
  };

  const block = (n, label, inner) => `
    <section class="c-block w-wrap">
      <div class="section-index" data-type>${pad(n)} / ${label}</div>
      <div class="reveal">${inner}</div>
    </section>`;

  const renderCase = (data) => {
    const host = $("#case");
    const projects = data.projects;
    const i = projects.findIndex((p) => p.slug === getSlug());

    if (i < 0) {
      document.title = "Case file not found | OpenDev";
      host.innerHTML = `
        <section class="c-hero w-wrap">
          <a class="c-back fx-target" href="/work">← ALL WORK</a>
          <div class="c-hero-top"><div class="section-index">404 / NOT FOUND</div></div>
          <h1 class="c-title">Signal <span class="title-accent">lost</span></h1>
          <p class="terminal" style="margin-top:24px"><span class="terminal-prefix">&gt; </span>NO CASE FILE AT THIS ADDRESS<span class="terminal-cursor">_</span></p>
        </section>`;
      const robots = $('meta[name="robots"]');
      if (robots) robots.setAttribute("content", "noindex");
      wireSfx();
      return;
    }

    const p = projects[i];
    const next = projects[(i + 1) % projects.length];
    const c = p.case;
    setMeta(p);

    const hero = `
      <section class="c-hero w-wrap">
        <a class="c-back fx-target" href="/work">← ALL WORK</a>
        <div class="c-hero-top">
          <div class="section-index" data-type>CASE ${pad(i + 1)} / ${esc(p.name.toUpperCase())}</div>
          ${statusHTML(p.status)}
        </div>
        <h1 class="c-title"><span class="w-line"><span class="w-line-inner">${esc(p.name)}</span></span></h1>
        <p class="c-client">${esc(p.client)}</p>
        <dl class="c-meta">
          <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
          <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
          <div><dt>Tags</dt><dd>${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</dd></div>
          <div><dt>Live</dt><dd>${
            p.link
              ? `<a class="meta-email fx-target" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">VISIT SITE ↗</a>`
              : `<span class="card-year">${p.status === "IN PROGRESS" ? "SOON" : "—"}</span>`
          }</dd></div>
        </dl>
      </section>
      <div class="c-cover w-wrap">
        <div class="media" data-placeholder="${esc(placeholderLabel(p.image))}">
          ${mediaHTML(p, { eager: true, big: true })}
          ${p.video ? `<video muted loop playsinline preload="none" data-src="${esc(p.video)}" aria-hidden="true"></video>` : ""}
        </div>
      </div>`;

    const gallery = (p.gallery || (c && c.gallery) || [])
        .map(
          (g) => `
          <figure class="reveal">
            <div class="media" data-placeholder="${esc(placeholderLabel(g.src))}">
              <img src="${esc(g.src)}" alt="${esc(g.alt)}" width="1600" height="1000" loading="lazy" decoding="async" />
            </div>
            <figcaption>${esc(g.alt)}</figcaption>
          </figure>`
        )
        .join("");
    const gallerySection = (n) =>
      gallery
        ? `<section class="c-gallery w-wrap"><div class="section-index" data-type>${pad(n)} / SCREENS</div>${gallery}</section>`
        : "";

    let body;
    if (c) {
      body =
        block(1, "THE BRIEF", `<p>${esc(c.brief)}</p>`) +
        block(2, "THE APPROACH", `<p>${esc(c.approach)}</p>`) +
        block(
          3,
          "THE BUILD",
          `${p.stack.length ? `<div class="c-stack">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}<p>${esc(c.build)}</p>`
        ) +
        gallerySection(4) +
        block(
          gallery ? 5 : 4,
          "OUTCOME",
          `<p>${esc(c.outcome)}</p>
          <div class="w-cta-actions" style="margin-top:32px">
            ${p.link ? `<a class="btn-clip btn-primary fx-target" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer"><span class="btn-icon">↗</span> VISIT LIVE SITE</a>` : ""}
            <a class="btn-clip btn-outline fx-target" href="https://wa.me/919101443253" target="_blank" rel="noopener noreferrer">START A PROJECT LIKE THIS <span class="chat-dot">●</span></a>
          </div>`
        );
    } else {
      body = `
        <section class="c-incoming w-wrap">
          <div class="section-index" style="max-width:260px">01 / CASE FILE</div>
          <p class="terminal"><span class="terminal-prefix">&gt; </span><span data-type>CASE FILE INCOMING</span><span class="terminal-cursor">_</span></p>
          <p>${esc(p.outcome)} The full write-up is being decoded. Want the story now? Ask us on WhatsApp.</p>
          ${p.stack.length ? `<div class="c-stack">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
          <div class="w-cta-actions" style="margin-top:8px">
            ${p.link ? `<a class="btn-clip btn-primary fx-target" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer"><span class="btn-icon">↗</span> VISIT LIVE SITE</a>` : ""}
            <a class="btn-clip btn-outline fx-target" href="https://wa.me/919101443253" target="_blank" rel="noopener noreferrer">ASK ABOUT THIS PROJECT <span class="chat-dot">●</span></a>
          </div>
        </section>` + gallerySection(2);
    }

    const nextLink = `
      <a class="c-next w-wrap fx-target" href="/work/${esc(next.slug)}" data-cursor="view" data-readout="NEXT TRANSMISSION">
        <span class="c-next-label">NEXT PROJECT / ${pad(i + 2 > projects.length ? 1 : i + 2)}</span>
        <span class="c-next-name">${esc(next.name)} <span class="c-next-arrow" aria-hidden="true">→</span></span>
      </a>`;

    host.innerHTML = hero + body + nextLink;

    injectJsonLd({ "@context": "https://schema.org", ...creativeWork(p) });

    wireSfx();
    watchMedia(host);
    lazyVideo($(".c-cover video", host));
    initTypewriters(host);
    initReveals(host);
  };

  const renderError = (hostSel) => {
    const host = $(hostSel);
    if (!host) return;
    host.innerHTML = `<p class="terminal" style="padding:40px 0"><span class="terminal-prefix">&gt; </span>ARCHIVE OFFLINE — REFRESH TO RETRY<span class="terminal-cursor">_</span></p>`;
  };

  /* ============================================================
     Boot sequence
     ============================================================ */

  initCursor();
  initMobileNav();
  initTopbar();
  initPageTransitions();
  wireSfx();

  const dataReady = loadData();

  runBoot().then(() => {
    if (page === "work") {
      revealHeroLines();
      initTypewriters();
      initCountUps();
      initReveals();
      dataReady.then(renderWork).catch((err) => {
        console.error(err);
        renderError("#grid");
      });
    } else if (page === "case") {
      dataReady
        .then((data) => {
          renderCase(data);
          revealHeroLines();
        })
        .catch((err) => {
          console.error(err);
          renderError("#case");
        });
    }
  });
})();
