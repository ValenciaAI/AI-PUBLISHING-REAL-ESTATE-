(() => {
  "use strict";

  const AGENTS = [
    { id: "helm", name: "HELM", role: "Orchestrator", img: "assets/agent-helm.jpg" },
    { id: "scribe", name: "SCRIBE", role: "Content & SEO", img: "assets/agent-scribe.jpg" },
    { id: "sentinel", name: "SENTINEL", role: "Compliance", img: "assets/agent-sentinel.jpg" },
    { id: "relay", name: "RELAY", role: "Registration & Auth", img: "assets/agent-relay.jpg" },
    { id: "vault", name: "VAULT", role: "Credential Manager", img: "assets/agent-vault.jpg" },
    { id: "airlock", name: "AIRLOCK", role: "Safety & Approval", img: "assets/agent-airlock.jpg" },
    { id: "publisher", name: "PUBLISHER", role: "Multi-portal Publish", img: "assets/agent-publisher.jpg" },
    { id: "verify", name: "VERIFY", role: "Link Checker", img: "assets/agent-verify.jpg" }
  ];

  const STAGES = ["REGISTER", "PREPARE", "CONTENT", "COMPLIANCE", "PUBLISH", "VERIFY"];
  const DURATION = 360000;
  const PHOTO_CAPS = { OLX: 10, Otodom: 15, Morizon: 20, Gratka: 12, Domiporta: 15, "Nieruchomosci.pl": 20 };
  const REQUIRED = ["seller", "phone", "title", "price", "area", "description", "woj", "city"];

  const $ = (id) => document.getElementById(id);
  const state = {
    running: false,
    paused: false,
    looping: false,
    last: 0,
    elapsed: 0,
    speed: 1,
    progress: 0,
    stage: -1,
    lang: "pl",
    waitingApproval: false,
    approved: false,
    photos: [],
    portals: ["OLX", "Otodom", "Morizon", "Gratka", "Domiporta", "Nieruchomosci.pl"],
    creds: [],
    packs: [],
    mission: null,
    agents: Object.fromEntries(AGENTS.map((a) => [a.id, { status: "IDLE", task: "Standby", progress: 0 }])),
    events: [],
    throughput: []
  };

  function num(v) {
    const n = Number(String(v || "").replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function pricePerM2(price, area) {
    const a = num(area);
    const p = num(price);
    if (a <= 0 || p <= 0) return "—";
    return Math.round(p / a).toLocaleString("pl-PL") + " zł / m²";
  }

  function collectMission() {
    return {
      seller: ($("inSeller").value || "").trim(),
      phone: ($("inPhone").value || "").trim(),
      title: ($("inTitle").value || "").trim().slice(0, 70),
      price: num($("inPrice").value),
      area: num($("inArea").value),
      plot: num($("inPlot").value),
      ppm: pricePerM2($("inPrice").value, $("inArea").value),
      description: ($("inDescription").value || "").slice(0, 5000),
      youtube: ($("inVideo").value || "").trim(),
      woj: ($("inWoj").value || "").trim(),
      powiat: ($("inPowiat").value || "").trim(),
      city: ($("inCity").value || "").trim(),
      zip: ($("inZip").value || "").trim(),
      district: ($("inDistrict").value || "").trim(),
      street: ($("inStreet").value || "").trim(),
      market: $("inMarket").value,
      type: ($("inType").value || "").trim(),
      use: ($("inUse").value || "").trim(),
      rooms: ($("inRooms").value || "").trim(),
      media: ($("inMedia").value || "").trim(),
      photoCount: state.photos.length
    };
  }

  function parsePortals() {
    state.portals = $("inPortals").value.split(/\n/).map((s) => s.trim()).filter(Boolean);
    state.creds = $("inCreds").value.split(/\n/).map((line) => {
      const [portal, login] = line.split("|").map((s) => (s || "").trim());
      return portal ? { portal, login: login || "" } : null;
    }).filter(Boolean);
  }

  function missingFields(m) {
    return REQUIRED.filter((k) => {
      const v = m[k];
      return v === "" || v === null || v === undefined || v === 0;
    });
  }

  function presentFields(m) {
    return Object.entries(m).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== 0 && v !== "—");
  }

  function payloadForPortal(portal) {
    const m = state.mission;
    const cap = PHOTO_CAPS[portal] || 20;
    const photos = state.photos.slice(0, Math.min(cap, 20));
    const body = {
      portal,
      title: m.title,
      description: m.description,
      price_zl: m.price,
      area_m2: m.area,
      plot_m2: m.plot || null,
      price_per_m2: m.ppm,
      seller: m.seller,
      phone: m.phone,
      wojewodztwo: m.woj,
      powiat: m.powiat || null,
      city: m.city,
      zip: m.zip || null,
      district: m.district || null,
      street: m.street || null,
      rynek: m.market || null,
      rodzaj: m.type || null,
      przeznaczenie: m.use || null,
      rooms: m.rooms || null,
      media: m.media || null,
      youtube: m.youtube || null,
      photos: photos.length,
      photoPolicy: "priority order, first " + photos.length + " of " + state.photos.length + " (cap " + cap + ")"
    };
    Object.keys(body).forEach((k) => { if (body[k] === null || body[k] === "") delete body[k]; });
    return body;
  }

  function applyMissionToUI() {
    const m = state.mission;
    if (!m) return;
    $("cardTitle").textContent = (m.title || "—").slice(0, 48);
    $("cardMeta").textContent = [
      m.price ? Number(m.price).toLocaleString("pl-PL") + " zł" : null,
      m.area ? m.area + " m² użytk." : null,
      m.plot ? "działka " + m.plot + " m²" : null,
      m.ppm && m.ppm !== "—" ? m.ppm : null
    ].filter(Boolean).join(" · ") || "brak danych";
    $("sellerLine").textContent = [m.seller, m.phone].filter(Boolean).join(" · ") || "—";
    $("missionTitle").textContent = m.title || "Brak tytułu — uzupełnij Mission Input";
    $("portalMetric").textContent = String(state.portals.length).padStart(2, "0");
    $("cardPortals").textContent = state.portals.length + " portals armed";
    $("photoThumbs").innerHTML = state.photos.slice(0, 6).map((p) => `<img src="${p}" alt="">`).join("");
    $("teleList").innerHTML = presentFields({
      WOJ: m.woj, CITY: m.city, PLOT: m.plot ? m.plot + " m²" : "", ROOMS: m.rooms, MEDIA: (m.media || "").slice(0, 32)
    }).map(([k, v]) => `<li>${k} ${v}</li>`).join("");
  }

  function livePrice() {
    const ppm = pricePerM2($("inPrice").value, $("inArea").value);
    $("ppm").textContent = ppm;
    $("titleCount").textContent = $("inTitle").value.length;
    $("descriptionCount").textContent = $("inDescription").value.length;
    state.mission = collectMission();
    parsePortals();
    applyMissionToUI();
  }

  function particles() {
    const box = $("particles");
    for (let i = 0; i < 40; i++) {
      const d = document.createElement("i");
      d.style.left = Math.random() * 100 + "%";
      d.style.bottom = "-10px";
      d.style.animationDelay = Math.random() * 12 + "s";
      d.style.opacity = String(0.2 + Math.random() * 0.5);
      box.appendChild(d);
    }
  }

  function renderAgents() {
    $("agentRoster").innerHTML = AGENTS.map((a) => {
      const s = state.agents[a.id];
      const cls = s.status === "WORKING" ? "working" : s.status.includes("WAIT") ? "wait" : s.status === "ERROR" ? "error" : "idle";
      return `<article class="agent-card" data-id="${a.id}">
        <img src="${a.img}" alt="${a.name}">
        <div><b>${a.name}</b><small>${a.role}</small><div>${s.task}</div></div>
        <em class="st ${cls}">${s.status}<br>${s.progress}%</em>
      </article>`;
    }).join("");
  }

  function log(agent, msg, kind = "info") {
    const t = new Date().toLocaleTimeString("pl-PL", { hour12: false });
    state.events.unshift({ t, agent, msg, kind });
    state.events = state.events.slice(0, 80);
    $("eventFeed").innerHTML = state.events.map((e) =>
      `<article class="${e.kind}">[${e.t}] ${String(e.agent).padEnd(9)} ${e.msg}</article>`
    ).join("");
    $("eventCount").textContent = state.events.length + " EVENTS";
    const comm = document.createElement("article");
    comm.textContent = `${agent} · ${msg}`;
    $("commItems").prepend(comm);
    while ($("commItems").children.length > 8) $("commItems").lastChild.remove();
    if (window.portalLink) window.portalLink.recordEvent({ agent, msg, kind });
  }

  function setAgent(id, status, task, progress) {
    state.agents[id] = { status, task, progress: progress ?? state.agents[id].progress };
    renderAgents();
  }

  function setHoloMode(mode) {
    const stage = document.querySelector(".holo-stage");
    if (!stage) return;
    stage.classList.remove("mission-live", "mission-paused");
    if (mode) stage.classList.add(mode);
  }

  function setStage(i) {
    state.stage = i;
    [...$("stages").children].forEach((el, idx) => el.classList.toggle("on", idx <= i));
    $("cardStage").textContent = STAGES[i] || "STANDBY";
  }

  function resetProgressUi() {
    $("progressBar").style.width = "0";
    $("ringFg").style.strokeDashoffset = "327";
    $("ringPct").textContent = "0%";
    $("progressLabel").textContent = "0% · 06:00 left";
    $("clock").textContent = "00:00:00";
    $("spendMetric").textContent = "$0.00";
    $("airlockMetric").textContent = "CLEAR";
    setStage(-1);
    $("cardStage").textContent = "STANDBY";
    $("approvalRequest").hidden = true;
    $("approvalIdle").hidden = false;
  }

  function tick(ts) {
    state.looping = true;
    if (!state.running) {
      state.looping = false;
      return;
    }
    if (state.paused || state.waitingApproval) {
      setHoloMode("mission-paused");
      state.last = ts;
      requestAnimationFrame(tick);
      return;
    }
    setHoloMode("mission-live");
    if (!state.last) state.last = ts;
    const dt = (ts - state.last) * state.speed;
    state.last = ts;
    state.elapsed += dt;
    state.progress = Math.min(1, state.elapsed / DURATION);
    const pct = Math.round(state.progress * 100);
    $("progressBar").style.width = pct + "%";
    $("ringFg").style.strokeDashoffset = String(327 * (1 - state.progress));
    $("ringPct").textContent = pct + "%";
    const left = Math.max(0, DURATION - state.elapsed);
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    $("progressLabel").textContent = pct + "% · " + mm + ":" + ss + " left";
    $("clock").textContent = new Date(state.elapsed).toISOString().substr(11, 8);
    $("spendMetric").textContent = "$" + (state.progress * 4.2).toFixed(2);

    const stage = Math.min(5, Math.floor(state.progress * 6));
    if (stage !== state.stage) {
      setStage(stage);
      runStage(stage);
    }

    if (state.progress >= 0.62 && !state.waitingApproval && !state.approved) {
      state.waitingApproval = true;
      $("approvalIdle").hidden = true;
      $("approvalRequest").hidden = false;
      $("airlockMetric").textContent = "HOLD";
      setAgent("airlock", "WAITING APPROVAL", "Human gate — no publish yet", 62);
      setAgent("publisher", "WAITING APPROVAL", "Pack staged, not sent", 60);
      log("AIRLOCK", "Publication blocked until operator APPROVE. Payload = operator fields only.", "warn");
      if (window.portalLink) window.portalLink.requestApproval({ portals: state.portals.length });
    }

    if (state.progress >= 1) {
      state.running = false;
      setHoloMode("");
      log("VERIFY", "Mission complete. No extra facts added.", "ok");
      setAgent("verify", "IDLE", "Checked submitted fields only", 100);
      state.looping = false;
      return;
    }

    drawSpark();
    requestAnimationFrame(tick);
  }

  function runStage(stage) {
    const m = state.mission;
    const miss = missingFields(m);
    log("SYSTEM", "Stage → " + STAGES[stage], "info");

    if (stage === 0) {
      setAgent("vault", "WORKING", "Read credentials as provided", 20);
      setAgent("relay", "WORKING", "Auth only where login exists", 20);
      if (state.creds.length) {
        state.creds.forEach((c) => log("VAULT", "Credential present for " + c.portal + (c.login ? " (" + c.login + ")" : "") + " — password not logged.", "ok"));
      } else {
        log("VAULT", "No portal logins provided. Will not invent accounts.", "warn");
      }
      state.portals.forEach((p) => {
        const c = state.creds.find((x) => x.portal.toLowerCase() === p.toLowerCase());
        log("RELAY", c && c.login ? p + " — login provided, session attempt." : p + " — no login in input, skip auto-register.", c ? "ok" : "warn");
      });
      if (window.listingLedger) {
        window.listingLedger.startMission("RE-042").then(() =>
          window.listingLedger.createArtifact({ baseId: "intake", type: "brief", label: "Seller brief", createdBy: "helm", payload: m })
        );
      }
    }

    if (stage === 1) {
      setAgent("helm", "WORKING", "Route only supplied fields", 40);
      if (miss.length) log("HELM", "Missing required: " + miss.join(", ") + ". Will not fabricate.", "warn");
      else log("HELM", "Required fields present. Optional blanks stay blank.", "ok");
      log("HELM", "Title=" + JSON.stringify(m.title), "info");
      log("HELM", "Price=" + m.price + " zł | użytkowa=" + m.area + " m² | działka=" + (m.plot || "n/d") + " m² | " + m.ppm, "info");
      state.portals.forEach((p) => {
        const n = Math.min(PHOTO_CAPS[p] || 20, state.photos.length);
        log("HELM", p + " photos: " + n + "/" + (PHOTO_CAPS[p] || 20) + " cap (have " + state.photos.length + ")", "info");
      });
    }

    if (stage === 2) {
      setAgent("scribe", "WORKING", "Copy operator title/body as-is", 55);
      log("SCRIBE", "Using operator title (" + (m.title || "").length + "/70). No rewrite.", "ok");
      log("SCRIBE", "Description chars " + (m.description || "").length + "/5000 — verbatim.", "ok");
      if (m.youtube) log("SCRIBE", "YouTube attached as provided: " + m.youtube, "info");
      else log("SCRIBE", "No YouTube URL in input — field omitted.", "info");
    }

    if (stage === 3) {
      setAgent("sentinel", "WORKING", "Audit: no invented facts", 70);
      if ((m.title || "").length > 70) log("SENTINEL", "Title exceeds 70 — truncated to input maxlength.", "warn");
      else log("SENTINEL", "Title within 70.", "ok");
      if ((m.description || "").length > 5000) log("SENTINEL", "Description exceeds 5000 — truncated.", "warn");
      else log("SENTINEL", "Description within 5000.", "ok");
      log("SENTINEL", "Cena za m² calculated from price/użytkowa only: " + m.ppm, "ok");
      if (!m.plot) log("SENTINEL", "Plot m² empty — will not publish a plot size.", "warn");
    }

    if (stage === 4) {
      parsePortals();
      state.mission = collectMission();
      applyMissionToUI();
      setAgent("publisher", "WORKING", "POST only known fields", 85);
      state.packs = state.portals.map((p) => payloadForPortal(p));
      state.packs.forEach((pack) => {
        const keys = Object.keys(pack).filter((k) => k !== "portal");
        log("PUBLISHER", pack.portal + " payload keys: " + keys.join(", "), "ok");
        log("PUBLISHER", pack.portal + " " + pack.title + " | " + pack.price_zl + " zł | " + pack.area_m2 + " m² | " + pack.price_per_m2, "info");
      });
    }

    if (stage === 5) {
      setAgent("verify", "WORKING", "Confirm submitted payload only", 95);
      state.packs.forEach((pack) => {
        log("VERIFY", pack.portal + " — submitted fields only. Live public URL unknown (no portal ACK). Not inventing a link.", "warn");
      });
    }

    $("ledgerCount").textContent = (stage + 1) + " ARTIFACTS";
    $("ledgerItems").innerHTML = state.packs.map((p) =>
      `<article><b>${p.portal}</b><pre>${JSON.stringify(p, null, 2)}</pre></article>`
    ).join("") || "<p>No packs yet</p>";
  }

  function drawSpark() {
    const c = $("spark");
    const ctx = c.getContext("2d");
    state.throughput.push(20 + Math.sin(state.elapsed / 400) * 12 + Math.random() * 6);
    if (state.throughput.length > 60) state.throughput.shift();
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#3ee7ff";
    ctx.beginPath();
    state.throughput.forEach((v, i) => {
      const x = (i / 60) * c.width;
      const y = c.height - (v / 50) * c.height;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    $("throughput").textContent = Math.round(state.throughput.at(-1) || 0) + " / min";
    $("queueDepth").textContent = String(state.portals.length);
  }

  function setupPhotos() {
    const input = $("inPhotos");
    const drop = $("photoDrop");
    const preview = $("photoPreview");
    const addFiles = (files) => {
      [...files].slice(0, 20 - state.photos.length).forEach((f) => {
        if (!f.type.startsWith("image/")) return;
        const r = new FileReader();
        r.onload = () => {
          state.photos.push(r.result);
          renderPhotos();
          livePrice();
        };
        r.readAsDataURL(f);
      });
    };
    input.onchange = () => addFiles(input.files);
    drop.onclick = () => input.click();
    drop.ondragover = (e) => e.preventDefault();
    drop.ondrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
    function renderPhotos() {
      preview.innerHTML = state.photos.map((src, i) => `<img draggable="true" data-i="${i}" src="${src}" alt="p${i}">`).join("");
      let drag = null;
      preview.querySelectorAll("img").forEach((img) => {
        img.ondragstart = () => { drag = Number(img.dataset.i); };
        img.ondragover = (e) => e.preventDefault();
        img.ondrop = () => {
          const j = Number(img.dataset.i);
          const [item] = state.photos.splice(drag, 1);
          state.photos.splice(j, 0, item);
          renderPhotos();
          livePrice();
        };
      });
    }
  }

  function persist() {
    try { localStorage.setItem("vshark.mission", JSON.stringify({ mission: collectMission(), portals: state.portals, credsText: $("inCreds").value })); } catch { /* ignore */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem("vshark.mission") || "null");
      if (!saved) return;
      const m = saved.mission || saved;
      const map = {
        inSeller: m.seller, inPhone: m.phone, inTitle: m.title, inPrice: m.price, inArea: m.area, inPlot: m.plot,
        inDescription: m.description, inVideo: m.youtube, inWoj: m.woj, inPowiat: m.powiat, inCity: m.city,
        inZip: m.zip, inDistrict: m.district, inStreet: m.street, inType: m.type, inUse: m.use, inRooms: m.rooms, inMedia: m.media
      };
      Object.entries(map).forEach(([id, val]) => { if ($(id) && val !== undefined && val !== null) $(id).value = val; });
      if (m.market) $("inMarket").value = m.market;
      if (saved.portals) $("inPortals").value = saved.portals.join("\n");
      if (saved.credsText) $("inCreds").value = saved.credsText;
    } catch { /* ignore */ }
  }

  async function startMission() {
    if (state.running && state.paused) {
      state.paused = false;
      $("pauseBtn").textContent = "Pause";
      setHoloMode("mission-live");
      return;
    }
    if (state.running) return;
    parsePortals();
    state.mission = collectMission();
    persist();
    applyMissionToUI();
    const miss = missingFields(state.mission);
    if (miss.length) log("HELM", "Start with missing: " + miss.join(", ") + ". Empty fields will stay empty.", "warn");
    state.running = true;
    state.paused = false;
    state.approved = false;
    state.waitingApproval = false;
    state.elapsed = 0;
    state.progress = 0;
    state.stage = -1;
    state.last = 0;
    state.packs = [];
    $("pauseBtn").textContent = "Pause";
    setHoloMode("mission-live");
    if (window.portalLink) await window.portalLink.connect();
    log("HELM", "Mission snapshot sealed from Mission Input. Agents will not add facts.", "ok");
    if (!state.looping) requestAnimationFrame(tick);
  }

  function bind() {
    $("agentRoster").addEventListener("click", (e) => {
      const card = e.target.closest(".agent-card");
      if (!card) return;
      const a = AGENTS.find((x) => x.id === card.dataset.id);
      $("selImg").src = a.img;
      $("selName").textContent = a.name;
      $("selTask").textContent = state.agents[a.id].task;
    });
    $("startBtn").onclick = () => { startMission().catch((err) => log("SYSTEM", String(err), "err")); };
    $("pauseBtn").onclick = () => {
      if (!state.running) return;
      state.paused = !state.paused;
      $("pauseBtn").textContent = state.paused ? "Resume" : "Pause";
      setHoloMode(state.paused ? "mission-paused" : "mission-live");
      if (window.portalLink) window.portalLink.setMissionState(state.paused ? "paused" : "running");
    };
    $("resetBtn").onclick = () => {
      state.running = false;
      state.paused = false;
      state.waitingApproval = false;
      state.approved = false;
      state.elapsed = 0;
      state.progress = 0;
      state.stage = -1;
      state.last = 0;
      setHoloMode("");
      resetProgressUi();
      AGENTS.forEach((a) => setAgent(a.id, "IDLE", "Standby", 0));
      $("pauseBtn").textContent = "Pause";
      log("SYSTEM", "Mission aborted. No portal writes.", "warn");
    };
    $("speed").onchange = (e) => { state.speed = Number(e.target.value) || 1; };
    $("setupBtn").onclick = () => $("setupDialog").showModal();
    $("saveSetup").onclick = () => {
      parsePortals();
      state.mission = collectMission();
      persist();
      applyMissionToUI();
      $("setupDialog").close();
      log("HELM", "Mission input saved. ppm=" + state.mission.ppm, "ok");
    };
    $("approveBtn").onclick = () => {
      if (!state.waitingApproval) return;
      state.waitingApproval = false;
      state.approved = true;
      setHoloMode("mission-live");
      $("approvalRequest").hidden = true;
      $("approvalIdle").hidden = false;
      $("airlockMetric").textContent = "CLEAR";
      log("AIRLOCK", "Approved. Publishing sealed payload only. Note: " + ($("approvalNote").value || "none"), "ok");
      if (window.listingLedger) window.listingLedger.recordApproval("approved");
      if (window.portalLink) window.portalLink.resolveApproval("approved");
    };
    $("rejectBtn").onclick = () => {
      state.waitingApproval = false;
      state.running = false;
      setHoloMode("");
      $("approvalRequest").hidden = true;
      $("approvalIdle").hidden = false;
      log("AIRLOCK", "Rejected. Nothing published.", "err");
      if (window.listingLedger) window.listingLedger.recordApproval("rejected");
    };
    $("ledgerMini").onclick = () => $("ledgerDrawer").showModal();
    $("langBtn").onclick = () => {
      state.lang = state.lang === "pl" ? "en" : "pl";
      document.documentElement.lang = state.lang;
      $("langBtn").textContent = state.lang === "pl" ? "PL / EN" : "EN / PL";
    };
    ["inTitle", "inDescription", "inPrice", "inArea", "inPlot", "inSeller", "inPhone", "inVideo",
      "inWoj", "inPowiat", "inCity", "inZip", "inDistrict", "inStreet", "inType", "inUse", "inRooms", "inMedia", "inPortals", "inCreds"
    ].forEach((id) => {
      $(id).addEventListener("input", livePrice);
      $(id).addEventListener("change", livePrice);
      $(id).addEventListener("keyup", livePrice);
    });
    $("inMarket").addEventListener("change", livePrice);
    $("inExcel").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const text = typeof r.result === "string" ? r.result : "";
        const lines = text.split(/\r?\n/).map((l) => l.split(/[,;\t|]/)[0].trim()).filter(Boolean);
        if (lines.length) {
          $("inPortals").value = lines.slice(0, 40).join("\n");
          parsePortals();
          livePrice();
          log("VAULT", "Portal list imported: " + state.portals.length + " names. No extra portals added.", "ok");
        } else {
          log("VAULT", "File had no readable portal names. List unchanged.", "warn");
        }
      };
      r.readAsText(f);
    };
    if (window.portalLink) {
      window.portalLink.addEventListener("connection", () => {
        $("connectionBadge").classList.remove("connecting");
        $("connectionText").textContent = "ONLINE";
        $("netStatus").textContent = "ONLINE";
      });
      window.portalLink.connect();
    }
  }

  restore();
  particles();
  renderAgents();
  $("selImg").src = AGENTS[0].img;
  setupPhotos();
  bind();
  livePrice();
  log("SYSTEM", "Station ready. Agents publish operator data only.", "info");
})();
