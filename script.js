/* ============================================================
  LaunchForge AI — Script (Vanilla JS)
  - Mobile menu
  - Scroll progress
  - Scroll reveal
  - Pricing toggle (monthly/yearly)
  - Modals (a11y focus trap)
  - Waitlist + Founder forms (localStorage mock)
  - Demo generator (mock output)
  - Cookie banner
  - Utilities (toasts, copy link)
============================================================ */

(() => {
  "use strict";

  /* =========================
    HELPERS
  ========================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
  };

  function toast(title, msg, timeout = 3500) {
    const toasts = $("#toasts");
    if (!toasts) return;

    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <p class="toast__title">${escapeHtml(title)}</p>
      <p class="toast__msg">${escapeHtml(msg)}</p>
    `;

    toasts.appendChild(el);

    window.setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(8px)";
      window.setTimeout(() => el.remove(), 220);
    }, timeout);
  }

  function escapeHtml(str) {
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );
  }
  /* =========================
    SIMPLE EVENT TRACKING
    Stored in localStorage as "events"
  ========================= */
  function trackEvent(type, meta = {}) {
    const events = storage.get("events", []);
    const entry = {
      type,
      meta,
      ts: new Date().toISOString(),
    };
    events.push(entry);
    storage.set("events", events);
    console.log("[TrackEvent]", entry);
  }
  function isEmail(email) {
    // Solid but simple email check
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email.trim());
  }

  /* =========================
    YEAR
  ========================= */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* =========================
    NAV: MOBILE TOGGLE
  ========================= */
  const navToggle = $("#navToggle");
  const navMenu = $("#navMenu");

  function setMenu(open) {
    if (!navToggle || !navMenu) return;
    navMenu.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = !navMenu.classList.contains("is-open");
      setMenu(open);
    });

    // close menu on link click (mobile)
    $$(".nav__links a", navMenu).forEach((a) => {
      a.addEventListener("click", () => setMenu(false));
    });

    // close on outside click
    document.addEventListener("click", (e) => {
      if (!navMenu.classList.contains("is-open")) return;
      const target = e.target;
      if (target instanceof Node) {
        const clickedInside =
          navMenu.contains(target) || navToggle.contains(target);
        if (!clickedInside) setMenu(false);
      }
    });

    // close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* =========================
    SCROLL PROGRESS
  ========================= */
  const progressBar = $("#progressBar");
  function updateProgress() {
    if (!progressBar) return;
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    progressBar.style.width = `${pct.toFixed(2)}%`;
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* =========================
    SCROLL REVEAL
  ========================= */
  const revealEls = $$(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12 },
  );

  revealEls.forEach((el) => io.observe(el));

  /* =========================
    COUNTERS (in hero)
  ========================= */
  const counters = $$("[data-counter]");
  let counterStarted = false;

  function animateCounters() {
    if (counterStarted) return;
    counterStarted = true;

    counters.forEach((el) => {
      const target = Number(el.getAttribute("data-counter")) || 0;
      const dur = 800;
      const start = performance.now();
      const from = 0;

      function tick(t) {
        const p = Math.min(1, (t - start) / dur);
        const val = Math.round(from + (target - from) * easeOutCubic(p));
        el.textContent = String(val);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  // start counters when hero content is visible
  const heroContent = $(".hero__content");
  if (heroContent) {
    const heroIO = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animateCounters();
          heroIO.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    heroIO.observe(heroContent);
  }

  /* =========================
    PRICING TOGGLE
  ========================= */
  const billingToggle = $("#billingToggle");
  const priceEls = $$("[data-price-month]");
  const periodEls = $$("[data-period]");

  function applyBilling(isYearly) {
    // Update toggle visuals
    if (billingToggle) {
      billingToggle.classList.toggle("is-on", isYearly);
      billingToggle.setAttribute("aria-pressed", String(isYearly));
    }

    // Update prices
    priceEls.forEach((el) => {
      const month = el.getAttribute("data-price-month");
      const year = el.getAttribute("data-price-year");
      el.textContent = isYearly ? `$${year}` : `$${month}`;
    });

    // Update period label
    periodEls.forEach((el) => {
      el.textContent = isYearly ? "/mo (billed yearly)" : "/mo";
    });

    storage.set("billingYearly", isYearly);
  }

  if (billingToggle) {
    const saved = storage.get("billingYearly", false);
    applyBilling(Boolean(saved));

    billingToggle.addEventListener("click", () => {
      const isYearly = !billingToggle.classList.contains("is-on");
      applyBilling(isYearly);
    });
  }

  /* =========================
    MODALS (open/close + focus trap)
  ========================= */
  let lastFocus = null;

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    // focus first focusable
    const focusable = getFocusable(modal);
    (focusable[0] || modal).focus?.();

    document.body.style.overflow = "hidden";
    trapFocus(modal);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  function getFocusable(root) {
    return $$(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      root,
    ).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
    );
  }

  function trapFocus(modal) {
    const focusables = getFocusable(modal);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    function onKeyDown(e) {
      if (!modal.classList.contains("is-open")) {
        document.removeEventListener("keydown", onKeyDown);
        return;
      }

      if (e.key === "Escape") {
        closeModal(modal);
        return;
      }

      if (e.key !== "Tab") return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
  }

  // open handlers
  $$("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-open-modal");
      if (!id) return;

      // Track modal opens
      if (id === "demoModal") {
        trackEvent("open_demo_modal", { text: btn.textContent?.trim() || "" });
      }
      if (id === "founderModal") {
        trackEvent("open_founder_modal", {
          text: btn.textContent?.trim() || "",
        });
      }

      openModal(id);
    });
  });

  // close handlers
  $$("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => {
      const modal = el.closest(".modal");
      closeModal(modal);
    });
  });

  // close modal when clicking close icon buttons
  $$(".modal .iconbtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      closeModal(modal);
    });
  });

  /* =========================
    DEMO GENERATOR (mock)
  ========================= */
  const generateBtn = $("#generateBtn");
  const outputBox = $("#outputBox");
  const ideaInput = $("#ideaInput");
  const audienceInput = $("#audienceInput");

  if (generateBtn && outputBox) {
    generateBtn.addEventListener("click", () => {
      const idea = (ideaInput?.value || "A productivity tool").trim();
      const audience = (audienceInput?.value || "Busy professionals").trim();

      const payload = makeMockBlueprint(idea, audience);
      outputBox.innerHTML = renderBlueprint(payload);

      toast(
        "Blueprint generated",
        "This is a mock output. Later you’ll connect the AI API.",
      );
    });
  }

  function makeMockBlueprint(idea, audience) {
    const nicheOptions = [
      `${audience} who struggle with time and consistency`,
      `${audience} who want results without complexity`,
      `${audience} who need a simple step-by-step system`,
    ];

    return {
      headline: `Launch a ${idea} for ${audience}`,
      positioning: {
        niche: nicheOptions[Math.floor(Math.random() * nicheOptions.length)],
        promise:
          "Reduce overwhelm and deliver measurable progress in days, not months.",
        differentiators: [
          "Guided framework (not generic chat)",
          "Clear deliverables per day",
          "Built-in landing narrative + pricing",
        ],
      },
      pricing: [
        {
          tier: "Starter",
          price: "$19/mo",
          includes: ["Core feature", "Basic templates"],
        },
        {
          tier: "Pro",
          price: "$29/mo",
          includes: ["Unlimited outputs", "Landing copy", "Roadmaps"],
        },
        {
          tier: "Founder",
          price: "$79/mo",
          includes: ["Advanced strategy", "Priority support"],
        },
      ],
      roadmap: [
        "Day 1: Validate pain + define ICP",
        "Day 2: Craft value proposition + differentiators",
        "Day 3: Build pricing tiers + packaging",
        "Day 4: Draft landing narrative + FAQs",
        "Day 5: Create MVP scope + delivery plan",
        "Day 6: Launch to early adopters",
        "Day 7: Collect feedback + iterate",
      ],
    };
  }

  function renderBlueprint(data) {
    return `
      <h4>${escapeHtml(data.headline)}</h4>
      <p class="muted"><strong>Positioning</strong></p>
      <ul>
        <li><strong>Niche:</strong> ${escapeHtml(data.positioning.niche)}</li>
        <li><strong>Promise:</strong> ${escapeHtml(data.positioning.promise)}</li>
      </ul>
      <p class="muted"><strong>Differentiators</strong></p>
      <ul>
        ${data.positioning.differentiators.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
      </ul>
      <p class="muted"><strong>Pricing</strong></p>
      <ul>
        ${data.pricing.map((p) => `<li><strong>${escapeHtml(p.tier)}:</strong> ${escapeHtml(p.price)} — ${escapeHtml(p.includes.join(", "))}</li>`).join("")}
      </ul>
      <p class="muted"><strong>7-day roadmap</strong></p>
      <ul>
        ${data.roadmap.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}
      </ul>
    `;
  }

  /* =========================
    FORMS: WAITLIST + FOUNDER
    (Mock “backend” using localStorage)
  ========================= */
  const waitlistForm = $("#waitlistForm");
  const formError = $("#formError");

  function saveLead(type, email) {
    const leads = storage.get("leads", []);
    const entry = { type, email, ts: new Date().toISOString() };
    leads.push(entry);
    storage.set("leads", leads);
  }

  if (waitlistForm) {
    waitlistForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!formError) return;

      const email = String($("#email")?.value || "").trim();
      if (!isEmail(email)) {
        formError.textContent = "Please enter a valid email.";
        return;
      }

      formError.textContent = "";
      saveLead("waitlist", email);
      trackEvent("submit_waitlist", { emailDomain: email.split("@")[1] || "" });
      waitlistForm.reset();

      toast(
        "Welcome to the Beta",
        "You’re on the waitlist. We’ll email you soon.",
      );
    });
  }

  const founderForm = $("#founderForm");
  const founderError = $("#founderError");

  if (founderForm) {
    founderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!founderError) return;

      const email = String($("#founderEmail")?.value || "").trim();
      if (!isEmail(email)) {
        founderError.textContent = "Please enter a valid email.";
        return;
      }

      founderError.textContent = "";
      saveLead("founder_offer", email);
      founderForm.reset();

      toast(
        "Founder request received",
        "We’ll notify you when payments are enabled.",
      );
      closeModal($("#founderModal"));
    });
  }

  /* =========================
    COOKIE BANNER
  ========================= */
  const cookieBanner = $("#cookieBanner");
  const cookieAccept = $("#cookieAccept");
  const cookieDecline = $("#cookieDecline");

  function showCookieBannerIfNeeded() {
    const pref = storage.get("cookiePref", null);
    if (pref) return;
    cookieBanner?.classList.add("is-open");
  }

  cookieAccept?.addEventListener("click", () => {
    storage.set("cookiePref", "accepted");
    cookieBanner?.classList.remove("is-open");
    toast(
      "Cookies accepted",
      "Thanks! You can change this later in your browser settings.",
    );
  });

  cookieDecline?.addEventListener("click", () => {
    storage.set("cookiePref", "declined");
    cookieBanner?.classList.remove("is-open");
    toast("Cookies declined", "No problem. Some features may be limited.");
  });

  showCookieBannerIfNeeded();
  /* =========================
    TRACK: CTA CLICKS
  ========================= */
  $$('a[href="#waitlist"]').forEach((a) => {
    a.addEventListener("click", () => {
      trackEvent("click_join_beta", {
        location: "link_to_waitlist",
        text: a.textContent?.trim() || "",
      });
    });
  });
  /* =========================
    COPY LINK
  ========================= */
  const copyLinkBtn = $("#copyLinkBtn");
  copyLinkBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied", "Share it with your first users.");
    } catch {
      toast(
        "Copy failed",
        "Your browser blocked clipboard. Copy the URL manually.",
      );
    }
  });
  /* =========================
    ADMIN MODE (Private Tools)
    - Toggle with: Ctrl + Alt + L
    - Stored in localStorage as LF_ADMIN="1"
  ========================= */
  const ADMIN_KEY = "LF_ADMIN";

  function isAdmin() {
    return storage.get(ADMIN_KEY, "0") === "1";
  }

  function applyAdminUI() {
    const ids = ["downloadLeadsBtn", "downloadEventsBtn", "clearEventsBtn"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("is-admin", isAdmin());
    });
  }

  // Secret keyboard toggle
  document.addEventListener("keydown", (e) => {
    const key = String(e.key || "").toLowerCase();
    const combo = e.ctrlKey && e.altKey && key === "l";

    if (!combo) return;

    const next = isAdmin() ? "0" : "1";
    storage.set(ADMIN_KEY, next);
    applyAdminUI();

    toast(
      next === "1" ? "Admin mode enabled" : "Admin mode disabled",
      next === "1"
        ? "Private tools are now visible."
        : "Private tools are hidden.",
    );
  });

  // Apply on load
  applyAdminUI();

  /* =========================
    EXPORT LEADS TO CSV (Robusto)
  ========================= */
  const downloadLeadsBtn = $("#downloadLeadsBtn");

  function leadsToCSV(leads) {
    const header = ["type", "email", "ts"];

    // CSV escaping compatible (sin replaceAll)
    const esc = (v) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [];
    lines.push(header.map(esc).join(","));

    for (const l of leads) {
      const row = [l?.type, l?.email, l?.ts].map(esc).join(",");
      lines.push(row);
    }

    return lines.join("\n");
  }

  function downloadTextFile(
    filename,
    content,
    mime = "text/csv;charset=utf-8",
  ) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // Garantiza que el click funcione en más navegadores
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  if (downloadLeadsBtn) {
    downloadLeadsBtn.addEventListener("click", () => {
      console.log("[DownloadLeads] Click detected ✅");

      const leads = storage.get("leads", []);
      console.log("[DownloadLeads] leads:", leads);

      if (!Array.isArray(leads) || leads.length === 0) {
        toast(
          "No leads yet",
          "Primero registra emails (Join Beta / Founder), luego descarga.",
        );
        return;
      }

      const csv = leadsToCSV(leads);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadTextFile(`launchforge_leads_${stamp}.csv`, csv);

      toast("Leads downloaded", `Exported ${leads.length} lead(s) to CSV.`);
    });
  } else {
    console.warn(
      "[DownloadLeads] Button not found. Revisa id='downloadLeadsBtn' en index.html",
    );
  }
  /* =========================
    EXPORT EVENTS TO CSV + CLEAR
  ========================= */
  const downloadEventsBtn = $("#downloadEventsBtn");
  const clearEventsBtn = $("#clearEventsBtn");

  function eventsToCSV(events) {
    const header = ["type", "meta", "ts"];
    const esc = (v) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines = [];
    lines.push(header.map(esc).join(","));

    for (const e of events) {
      const metaStr = JSON.stringify(e?.meta ?? {});
      lines.push([e?.type, metaStr, e?.ts].map(esc).join(","));
    }

    return lines.join("\n");
  }

  downloadEventsBtn?.addEventListener("click", () => {
    const events = storage.get("events", []);
    if (!Array.isArray(events) || events.length === 0) {
      toast(
        "No events yet",
        "Interact with the page first, then download events.",
      );
      return;
    }

    const csv = eventsToCSV(events);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`launchforge_events_${stamp}.csv`, csv);

    toast("Events downloaded", `Exported ${events.length} event(s) to CSV.`);
  });

  clearEventsBtn?.addEventListener("click", () => {
    const events = storage.get("events", []);
    if (!Array.isArray(events) || events.length === 0) {
      toast("Nothing to clear", "No events stored yet.");
      return;
    }

    const ok = confirm(
      `Clear ${events.length} tracked event(s)? This cannot be undone.`,
    );
    if (!ok) return;

    storage.set("events", []);
    toast("Events cleared", "Tracking storage is now empty.");
  });
})();
