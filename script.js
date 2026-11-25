(() => {
  const introGate = document.getElementById("introGate");
  const enterBtn = document.getElementById("enterBtn");
  const video = document.getElementById("introVideo");
  const landing = document.getElementById("landing");
  const loadingBar = document.getElementById("loadingBar");
  const loadingPercent = document.getElementById("loadingPercent");
  const cursorDot = document.getElementById("cursorDot");
  const cursorRing = document.getElementById("cursorRing");

  let revealed = false;

  /* ============================================================
     UI sound effects (Web Audio — no asset files needed)
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

  const playTone = ({ freq = 800, duration = 0.05, volume = 0.06, type = "sine" } = {}) => {
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
    root.querySelectorAll(".fx-target").forEach((el) => {
      if (el.dataset.fxWired) return;
      el.dataset.fxWired = "1";
      el.addEventListener("mouseenter", sfxHover);
      el.addEventListener("click", sfxClick);
    });
  };

  /* ============================================================
     Custom cursor
     ============================================================ */

  const isFinePointer =
    window.matchMedia &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (isFinePointer && cursorDot && cursorRing) {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let active = false;

    const activate = () => {
      if (active) return;
      active = true;
      cursorDot.classList.add("is-active");
      cursorRing.classList.add("is-active");
    };

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      activate();
    });

    window.addEventListener("mouseleave", () => {
      cursorDot.classList.remove("is-active");
      cursorRing.classList.remove("is-active");
      active = false;
    });

    window.addEventListener("mousedown", () => cursorRing.classList.add("is-press"));
    window.addEventListener("mouseup", () => cursorRing.classList.remove("is-press"));

    const tick = () => {
      cursorDot.style.transform = `translate(${mx}px, ${my}px)`;
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      cursorRing.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Expand ring over interactive elements
    const hoverSelector = "a, button, .fx-target, [role='button'], input, textarea";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        cursorRing.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        cursorRing.classList.remove("is-hover");
      }
    });
  }

  /* ============================================================
     Loading bar — fills to 100%, then reveals Enter button
     ============================================================ */

  const PIP_COUNT = 14;
  const LOAD_DURATION = 2200; // ms total

  const buildLoader = () => {
    if (!loadingBar) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < PIP_COUNT; i++) {
      const p = document.createElement("div");
      p.className = "loader-pip";
      frag.appendChild(p);
    }
    loadingBar.appendChild(frag);
  };

  const runLoader = () =>
    new Promise((resolve) => {
      const pips = loadingBar ? loadingBar.querySelectorAll(".loader-pip") : [];
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / LOAD_DURATION);
        const pct = Math.round(t * 100);
        if (loadingPercent) loadingPercent.textContent = pct;
        const litCount = Math.floor(t * pips.length);
        pips.forEach((pip, i) => {
          pip.classList.toggle("is-on", i < litCount);
        });
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          pips.forEach((pip) => pip.classList.add("is-on"));
          if (loadingPercent) loadingPercent.textContent = 100;
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

  /* ============================================================
     Intro → video → mountain loop
     ============================================================ */

  const revealLanding = () => {
    if (revealed) return;
    revealed = true;
    landing.classList.add("is-revealed");
    landing.setAttribute("aria-hidden", "false");
    // Open the page up for scrolling — kicks the "going inside" experience to life.
    // The class goes on <html> too: it's the actual scroll container (window.scrollY),
    // so unlocking only <body> leaves touch/wheel scrolling blocked on mobile.
    document.documentElement.classList.add("is-explorable");
    document.body.classList.add("is-explorable");
    const scrollHost = document.getElementById("scrollHost");
    if (scrollHost) scrollHost.setAttribute("aria-hidden", "false");
    initScrollFlight();
    initNavTransitions();
  };

  const startMountainLoop = () => {
    try {
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) {}
  };

  const onVideoEnded = () => {
    document.body.classList.remove("is-playing-intro");
    startMountainLoop();
    revealLanding();
  };

  const startExperience = async () => {
    if (enterBtn.disabled) return;
    getCtx(); // warm audio inside the user gesture

    introGate.classList.add("is-hidden");
    document.body.classList.add("is-playing-intro");

    video.loop = false;
    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
    } catch (_) {
      try {
        video.muted = true;
        await video.play();
      } catch (_) {
        onVideoEnded();
      }
    }
  };

  /* ============================================================
     Scroll flight — push the camera into the mountain landscape
     ============================================================ */

  /* ----- Per-character split: wraps every non-whitespace char in <span class="ch"> ----- */
  const splitChars = (root) => {
    if (!root || root.dataset.split === "1") return;

    let counter = 0;

    const splitTextNode = (textNode) => {
      const text = textNode.textContent;
      if (!text) return;
      const frag = document.createDocumentFragment();
      // Preserve whitespace; wrap each word so inline-block chars never break mid-word
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const word = document.createElement("span");
          word.className = "word";
          for (const ch of part) {
            const span = document.createElement("span");
            span.className = "ch";
            span.style.setProperty("--i", counter++);
            span.textContent = ch;
            word.appendChild(span);
          }
          frag.appendChild(word);
        }
      }
      textNode.replaceWith(frag);
    };

    const walk = (node) => {
      const kids = Array.from(node.childNodes);
      for (const child of kids) {
        if (child.nodeType === 3) {
          splitTextNode(child);
        } else if (
          child.nodeType === 1 &&
          !child.classList.contains("ch") &&
          !child.classList.contains("word")
        ) {
          walk(child);
        }
      }
    };
    walk(root);
    root.dataset.split = "1";
  };

  const initCharSplit = () => {
    const selectors = [
      ".section-index",
      ".section-kicker",
      ".section-title",
      ".section-lead",
      ".section-copy",
      ".pillar-num",
      ".pillar-name",
      ".pillar-line",
    ];
    document.querySelectorAll(selectors.join(",")).forEach(splitChars);
  };

  const initScrollFlight = (() => {
    let wired = false;
    return () => {
      if (wired) return;
      wired = true;

      const stageVideo = document.getElementById("introVideo");
      const stage = document.getElementById("stage");
      const aboutSection = document.getElementById("about");
      const prefersReduce = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Split text into characters before observing — avoids a flash on first reveal
      initCharSplit();

      // Drive an in-view reveal for sections (text fade-up + page chrome toggle)
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in-view");
            }
            // The About section also gates the page-chrome (frame + nav hide)
            if (entry.target.id === "about") {
              document.body.classList.toggle("in-about", entry.isIntersecting);
            }
          });
        },
        { threshold: 0.18 }
      );
      document.querySelectorAll(".section").forEach((s) => io.observe(s));

      if (prefersReduce) return;

      // Travel progress: 0 at top of page → 1 by the time hero is fully scrolled past
      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const y = window.scrollY || window.pageYOffset || 0;
          const vh = window.innerHeight || 1;
          // Map scroll over the first viewport into [0, 1]
          const p = Math.max(0, Math.min(1, y / vh));
          // Ease-out so the camera accelerates softly into the scene
          const eased = 1 - Math.pow(1 - p, 2);

          // Mountain pushes in: zoom from 1.0 → ~1.35, rise slightly
          const zoom = 1 + eased * 0.35;
          const rise = -eased * 6; // vh units (negative = upward)
          stageVideo.style.setProperty("--zoom", zoom.toFixed(4));
          stageVideo.style.setProperty("--rise", rise.toFixed(2) + "vh");

          // Veil fades to dark as we go deeper
          stage.style.setProperty("--veil", eased.toFixed(3));

          // Hero UI dims out as the user travels inward
          landing.style.setProperty("--ui-opacity", (1 - eased).toFixed(3));
          if (p > 0.05) {
            landing.classList.add("is-traveling");
          } else {
            landing.classList.remove("is-traveling");
          }
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      onScroll();
    };
  })();

  /* ============================================================
     Page navigation transition — Home <-> About
     ============================================================ */

  const TRANSITION_TOTAL = 1100;   // total CSS animation length
  const SCROLL_AT        = 420;    // mid-sweep moment to kick the scroll
  let navInFlight = false;

  const sectionLabels = {
    home:  "RETURNING TO HOMEBASE",
    about: "ENGAGING SECTION 01",
  };

  const isOnSection = (id) => {
    if (id === "home") return window.scrollY < window.innerHeight * 0.5;
    const el = document.getElementById(id);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= -50 && r.top <= window.innerHeight * 0.5;
  };

  const runNavTransition = (targetId, opts = {}) => {
    if (navInFlight) return;
    if (!opts.skipHash && isOnSection(targetId)) return;
    navInFlight = true;

    const goingUp = targetId === "home";
    const body = document.body;
    const readout = document.getElementById("ptReadoutText");
    if (readout) {
      readout.textContent = sectionLabels[targetId] || "TRANSMITTING";
    }

    body.classList.add("is-navigating");
    body.classList.toggle("nav-up", goingUp);

    // Mid-sweep, perform the actual scroll
    setTimeout(() => {
      if (targetId === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (!opts.skipHash) {
        const newUrl =
          targetId === "home"
            ? location.pathname + location.search
            : "#" + targetId;
        try {
          history.pushState({ section: targetId }, "", newUrl);
        } catch (_) {}
      }
    }, SCROLL_AT);

    // Clean up after animation
    setTimeout(() => {
      body.classList.remove("is-navigating", "nav-up");
      navInFlight = false;
    }, TRANSITION_TOTAL);
  };

  const initNavTransitions = () => {
    // Intercept anchor clicks that target known sections
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute("href");
      const targetId = href === "#" ? "home" : href.slice(1);
      if (!targetId) return;
      // Only handle sections we know how to navigate to
      if (targetId !== "home" && !document.getElementById(targetId)) return;
      e.preventDefault();
      runNavTransition(targetId);
    });

    // Browser back / forward → also play the transition
    window.addEventListener("popstate", (e) => {
      const targetId =
        (e.state && e.state.section) ||
        (location.hash ? location.hash.slice(1) : "home");
      runNavTransition(targetId, { skipHash: true });
    });
  };

  /* ============================================================
     Mobile nav toggle (hamburger panel on phones)
     ============================================================ */

  const initMobileNav = () => {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("topNav");
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

    // Close after choosing a destination
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });

    // Tap outside the panel closes it
    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("nav-open")) return;
      if (e.target.closest("#topNav") || e.target.closest("#navToggle")) return;
      setOpen(false);
    });

    // Escape closes it
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  };

  buildLoader();
  initMobileNav();
  enterBtn.addEventListener("click", startExperience);
  video.addEventListener("ended", onVideoEnded);
  video.addEventListener("error", onVideoEnded);

  wireSfx();

  runLoader().then(() => {
    enterBtn.disabled = false;
    enterBtn.classList.add("is-ready");
  });
})();
