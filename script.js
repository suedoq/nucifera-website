(() => {
  "use strict";

  const SERVER_IP = "play.nucifera.cc";
  const STATUS_REFRESH_MS = 60_000;

  /* ---------------- toast ---------------- */

  let toastEl;
  let toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      toastEl.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(toastEl);
    }
    toastEl.querySelector("span").textContent = message;
    // restart the transition when copying twice in a row
    toastEl.classList.remove("show");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------------- copy server IP ---------------- */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // clipboard API is unavailable on file:// and some older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  document.querySelectorAll("[data-copy-ip]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(SERVER_IP);
      toast(ok ? "Server IP copied" : "Copy failed: " + SERVER_IP);
      if (!ok) return;
      btn.classList.add("copied");
      // these icons are <svg>, which has no .hidden property — set the attribute
      const copyIcon = btn.querySelector("[data-icon-copy]");
      const checkIcon = btn.querySelector("[data-icon-check]");
      const swap = (copied) => {
        copyIcon?.toggleAttribute("hidden", copied);
        checkIcon?.toggleAttribute("hidden", !copied);
      };
      swap(true);
      setTimeout(() => {
        btn.classList.remove("copied");
        swap(false);
      }, 1800);
    });
  });

  /* ---------------- mobile menu ---------------- */

  const menuBtn = document.querySelector("[data-menu-btn]");
  const menu = document.getElementById("mobile-menu");
  if (menuBtn && menu) {
    const setOpen = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.hidden = !open;
    };
    menuBtn.addEventListener("click", () => setOpen(menu.hidden));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { setOpen(false); menuBtn.focus(); }
    });
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 921px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------------- tabs ---------------- */

  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------------- table of contents scrollspy ---------------- */

  const toc = document.querySelector("[data-toc]");
  if (toc) {
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const targets = links
      .map((a) => ({ link: a, el: document.getElementById(a.getAttribute("href").slice(1)) }))
      .filter((t) => t.el);
    let lastChip = null;

    const update = () => {
      // active = the last heading (in document order) that has scrolled past the
      // top reading line; nested items come after their section, so they win
      const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 24 || 140;
      let current = null;
      for (const t of targets) if (t.el.getBoundingClientRect().top <= line) current = t;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = targets[targets.length - 1];

      links.forEach((a) => a.classList.remove("active"));
      if (!current) return;
      current.link.classList.add("active");
      // keep the parent section highlighted while reading one of its items
      const parent = current.link.closest("ol")?.closest("li")?.querySelector(":scope > a");
      if (parent) parent.classList.add("active");

      // on mobile the toc is a horizontal chip bar; keep the active chip in view
      const chip = parent || current.link;
      if (chip !== lastChip && toc.scrollWidth > toc.clientWidth) {
        toc.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
      }
      lastChip = chip;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---------------- live server status ---------------- */

  const statusEls = {
    states: document.querySelectorAll("[data-server-state]"),
    text: document.querySelectorAll("[data-status-text]"),
    online: document.querySelectorAll("[data-players-online]"),
    max: document.querySelectorAll("[data-players-max]"),
    version: document.querySelectorAll("[data-version]"),
    motd: document.querySelector("[data-motd]"),
    icon: document.querySelector("[data-server-icon]"),
    list: document.querySelector("[data-player-list]"),
  };

  const MC_COLORS = {
    0: "#000000", 1: "#0000AA", 2: "#00AA00", 3: "#00AAAA",
    4: "#AA0000", 5: "#AA00AA", 6: "#FFAA00", 7: "#AAAAAA",
    8: "#555555", 9: "#5555FF", a: "#55FF55", b: "#55FFFF",
    c: "#FF5555", d: "#FF55FF", e: "#FFFF55", f: "#FFFFFF",
  };

  // Turns a raw §-coded MOTD into DOM nodes. Built with textContent only,
  // so nothing coming back from the status API is ever parsed as HTML.
  function renderMotd(raw) {
    const frag = document.createDocumentFragment();
    raw.split("\n").slice(0, 2).forEach((line) => {
      const row = document.createElement("div");
      let style = { color: MC_COLORS[7] };
      let buf = "";
      const flush = () => {
        if (!buf) return;
        const span = document.createElement("span");
        span.textContent = buf;
        span.style.color = style.color;
        if (style.bold) span.style.fontWeight = "700";
        if (style.italic) span.style.fontStyle = "italic";
        const deco = [style.underline && "underline", style.strike && "line-through"].filter(Boolean);
        if (deco.length) span.style.textDecoration = deco.join(" ");
        row.appendChild(span);
        buf = "";
      };
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === "§" && i + 1 < line.length) {
          flush();
          const code = line[++i].toLowerCase();
          if (code in MC_COLORS) style = { color: MC_COLORS[code] };
          else if (code === "l") style.bold = true;
          else if (code === "o") style.italic = true;
          else if (code === "n") style.underline = true;
          else if (code === "m") style.strike = true;
          else if (code === "r") style = { color: MC_COLORS[7] };
          else if (code === "x" && i + 12 < line.length) {
            // §x§R§R§G§G§B§B hex colour
            const hex = line.slice(i + 1, i + 13).replace(/§/g, "");
            if (/^[0-9a-f]{6}$/i.test(hex)) { style = { color: "#" + hex }; i += 12; }
          }
          continue;
        }
        buf += ch;
      }
      flush();
      if (!row.childNodes.length) row.textContent = " ";
      frag.appendChild(row);
    });
    return frag;
  }

  function normalizeMcstatus(d) {
    return {
      online: !!d.online,
      count: d.players?.online ?? 0,
      max: d.players?.max ?? 0,
      list: (d.players?.list || []).map((p) => ({ name: p.name_clean, uuid: p.uuid })),
      version: d.version?.name_clean || "",
      motd: d.motd?.raw || "",
      icon: d.icon || "",
    };
  }

  function normalizeMcsrvstat(d) {
    return {
      online: !!d.online,
      count: d.players?.online ?? 0,
      max: d.players?.max ?? 0,
      list: (d.players?.list || []).map((p) => ({ name: p.name, uuid: p.uuid })),
      version: d.version || "",
      motd: Array.isArray(d.motd?.raw) ? d.motd.raw.join("\n") : "",
      icon: d.icon || "",
    };
  }

  async function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function getStatus() {
    try {
      return normalizeMcstatus(await fetchJson("https://api.mcstatus.io/v2/status/java/" + SERVER_IP));
    } catch {
      return normalizeMcsrvstat(await fetchJson("https://api.mcsrvstat.us/3/" + SERVER_IP));
    }
  }

  const setAll = (nodes, value) => nodes.forEach((n) => { n.textContent = value; });

  function renderPlayers(s) {
    const box = statusEls.list;
    if (!box) return;
    box.replaceChildren();
    if (!s.online) return;

    // server list samples sometimes carry decorative text instead of names
    const real = s.list.filter((p) => /^\w{3,16}$/.test(p.name || ""));
    if (!real.length) {
      const note = document.createElement("span");
      note.className = "empty";
      note.textContent = s.count === 0 ? "Nobody online. Be the first!" : "Player list hidden";
      box.appendChild(note);
      return;
    }
    const shown = real.slice(0, 8);
    shown.forEach((p) => {
      const id = /^[0-9a-f-]{32,36}$/i.test(p.uuid || "") ? p.uuid.replace(/-/g, "") : p.name;
      const img = document.createElement("img");
      img.src = "https://mc-heads.net/avatar/" + encodeURIComponent(id) + "/32";
      img.alt = p.name;
      img.title = p.name;
      img.width = 28;
      img.height = 28;
      img.loading = "lazy";
      img.className = "pixel";
      box.appendChild(img);
    });
    const extra = s.count - shown.length;
    if (extra > 0) {
      const more = document.createElement("span");
      more.className = "more";
      more.textContent = "+" + extra;
      box.appendChild(more);
    }
  }

  function applyStatus(s) {
    const state = s ? (s.online ? "online" : "offline") : "error";
    statusEls.states.forEach((n) => { n.dataset.state = state; });

    if (!s) {
      setAll(statusEls.text, "Status unavailable");
      setAll(statusEls.online, "–");
      return;
    }
    if (!s.online) {
      setAll(statusEls.text, "Server offline");
      setAll(statusEls.online, "0");
      setAll(statusEls.max, String(s.max || 20));
      renderPlayers(s);
      return;
    }

    const n = s.count;
    setAll(statusEls.text, "Online · " + n + (n === 1 ? " player" : " players") + " now");
    setAll(statusEls.online, String(n));
    setAll(statusEls.max, String(s.max));

    const ver = (s.version.match(/\d+(?:\.\d+)+/) || [])[0];
    if (ver) setAll(statusEls.version, "Java " + ver);

    if (statusEls.motd && s.motd) statusEls.motd.replaceChildren(renderMotd(s.motd));
    if (statusEls.icon && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s.icon)) statusEls.icon.src = s.icon;
    renderPlayers(s);
  }

  let statusTimer;
  async function refreshStatus() {
    clearTimeout(statusTimer);
    try {
      applyStatus(await getStatus());
    } catch {
      applyStatus(null);
    }
    statusTimer = setTimeout(refreshStatus, STATUS_REFRESH_MS);
  }

  if (statusEls.states.length) {
    refreshStatus();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearTimeout(statusTimer);
      else refreshStatus();
    });
  }

  /* ---------------- footer year ---------------- */

  document.querySelectorAll("[data-year]").forEach((n) => { n.textContent = new Date().getFullYear(); });
})();
