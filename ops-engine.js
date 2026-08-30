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

  const $ = (id) => document.getElementById(id);
  const state = {
    running: false,
    paused: false,
    started: 0,
    elapsed: 0,
    speed: 1,
    progress: 0,
    stage: -1,
    lang: "pl",
    waitingApproval: false,
    photos: [],
    portals: ["OLX", "Otodom", "Morizon", "Gratka", "Domiporta", "Nieruchomosci.pl"],
    mission: loadMission(),
    agents: Object.fromEntries(AGENTS.map((a) => [a.id, { status: "IDLE", task: "Standby", progress: 0 }])),
    events: [],
    throughput: []
  };

  function loadMission() {
    try { return JSON.parse(localStorage.getItem("vshark.mission") || "null") || defaultMission(); }
    catch { return defaultMission(); }
  }
  function defaultMission() {
    return {
      seller: "Anna Konełka",
      phone: "+48 601 221 527",
      title: "Sprzedam bezpośrednio Hotel i Restauracja Dolina Leśna",
      price: 4500000,
      area: 2280,
      description: $("inDescription") ? $("inDescription").value : "",
      youtube: "",
      woj: "lubuskie", powiat: "słubicki", city: "Ośno Lubuskie", zip: "69-220",
      district: "Dolina Leśna", street: "Dolina Leśna", market: "Wtórny", type: "obiekt",
      use: "handlowy", rooms: "80", media: "prąd, woda, gaz, internet"
    };
  }

  function ppm() {
    const p = Number(state.mission.price) || 0;
    const a = Number(state.mission.area) || 1;
    return Math.round(p / a).toLocaleString("pl-PL") + " zł / m²";
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
    $("agentRoster").onclick = (e) => {
      const card = e.target.closest(".agent-card");
      if (!card) return;
      const a = AGENTS.find((x) => x.id === card.dataset.id);
      $("selImg").src = a.img;
      $("selName").textContent = a.name;
      $("selTask").textContent = state.agents[a.id].task;
    };
  }

  function log(agent, msg, kind = "info") {
    const t = new Date().toLocaleTimeString("pl-PL", { hour12: false });
    state.events.unshift({ t, agent, msg, kind });
    state.events = state.events.slice(0, 80);
    $("eventFeed").innerHTML = state.events.map((e) =>
      `<article class="${e.kind}">[${e.t}] ${e.agent.padEnd(9)} ${e.msg}</article>`
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

  function photosForPortal(name) {
    const cap = PHOTO_CAPS[name] || 20;
    return state.photos.slice(0, Math.min(cap, 20));
  }

  function applyMissionToUI() {
    const m = state.mission;
    $("cardTitle").textContent = m.title.slice(0, 42);
    $("cardMeta").textContent = Number(m.price).toLocaleString("pl-PL") + " zł · " + m.area + " m² · " + ppm();
    $("sellerLine").textContent = m.seller + " · " + m.phone;
    $("missionTitle").textContent = m.title;
    $("portalMetric").textContent = String(state.portals.length).padStart(2, "0");
    $("cardPortals").textContent = state.portals.length + " portals armed";
    $("photoThumbs").innerHTML = state.photos.slice(0, 6).map((p) => `<img src="${p}" alt="">`).join("");
    $("teleList").innerHTML = [
      "WOJ " + m.woj,
      "CITY " + m.city,
      "ROOMS " + m.rooms,
      "MEDIA " + (m.media || "").slice(0, 28)
    ].map((x) => `<li>${x}</li>`).join("");
  }

  function setStage(i) {
    state.stage = i;
    [...$("stages").children].forEach((el, idx) => el.classList.toggle("on", idx <= i));
    $("cardStage").textContent = STAGES[i] || "STANDBY";
  }

  function tick(ts) {
    if (!state.running || state.paused || state.waitingApproval) {
      requestAnimationFrame(tick);
      return;
    }
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
      setAgent("airlock", "WAITING APPROVAL", "Human gate", 62);
      setAgent("publisher", "WAITING APPROVAL", "Pack staged", 60);
      log("AIRLOCK", "Safety registry locked. Listing publication pending human.", "warn");
      if (window.portalLink) window.portalLink.requestApproval({ portals: state.portals.length });
    }

    if (state.progress >= 1) {
      state.running = false;
      log("VERIFY", "All live links compiled.", "ok");
      setAgent("verify", "IDLE", "Verified", 100);
    }

    drawSpark();
    requestAnimationFrame(tick);
  }

  function runStage(stage) {
    const names = STAGES;
    log("SYSTEM", "Stage → " + names[stage], "info");
    if (stage === 0) {
      setAgent("relay", "WORKING", "Registering cabinets", 20);
      setAgent("vault", "WORKING", "Mounting credentials", 15);
      log("VAULT", "Portal registry mounted.", "ok");
      log("RELAY", "Logging into " + state.portals.length + " portals.", "info");
      if (window.listingLedger) window.listingLedger.startMission("RE-042").then(() =>
        window.listingLedger.createArtifact({ baseId: "intake", type: "brief", label: "Seller brief", createdBy: "helm", payload: state.mission })
      );
    }
    if (stage === 1) {
      setAgent("helm", "WORKING", "Routing work graph", 40);
      state.portals.forEach((p) => log("HELM", p + " photo cap " + (PHOTO_CAPS[p] || 20) + " → using " + photosForPortal(p).length, "info"));
    }
    if (stage === 2) {
      setAgent("scribe", "WORKING", "SEO title ≤70 chars", 55);
      log("SCRIBE", "Title length " + (state.mission.title || "").length + "/70", "ok");
    }
    if (stage === 3) {
      setAgent("sentinel", "WORKING", "Portal rules audit", 70);
      log("SENTINEL", "Description " + (state.mission.description || "").length + "/5000", "ok");
    }
    if (stage === 4) {
      setAgent("publisher", "WORKING", "Pushing listings", 80);
    }
    if (stage === 5) {
      setAgent("verify", "WORKING", "Checking live URLs", 90);
      state.portals.forEach((p) => log("VERIFY", p + " live https://" + p.toLowerCase().replace(/\s/g, "") + ".pl/re-042", "ok"));
    }
    $("ledgerCount").textContent = (stage + 1) * 2 + " ARTIFACTS";
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
  }

  function setupPhotos() {
    const input = $("inPhotos");
    const drop = $("photoDrop");
    const preview = $("photoPreview");
    const addFiles = (files) => {
      [...files].slice(0, 20 - state.photos.length).forEach((f) => {
        const r = new FileReader();
        r.onload = () => {
          state.photos.push(r.result);
          renderPhotos();
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
        };
      });
    }
  }

  function bind() {
    $("startBtn").onclick = async () => {
      if (state.running && state.paused) { state.paused = false; $("pauseBtn").textContent = "Pause"; return; }
      state.running = true; state.paused = false; state.started = performance.now(); state.last = 0; state.elapsed = 0; state.approved = false;
      if (window.portalLink) await window.portalLink.connect();
      log("GROK", "Pack transport connected. Portisystems online.", "ok");
      requestAnimationFrame(tick);
    };
    $("pauseBtn").onclick = () => {
      state.paused = !state.paused;
      $("pauseBtn").textContent = state.paused ? "Resume" : "Pause";
      if (window.portalLink) window.portalLink.setMissionState(state.paused ? "paused" : "running");
    };
    $("resetBtn").onclick = () => {
      state.running = false; state.elapsed = 0; state.progress = 0; state.waitingApproval = false; state.approved = false; state.stage = -1;
      $("progressBar").style.width = "0";
      $("approvalRequest").hidden = true; $("approvalIdle").hidden = false;
      AGENTS.forEach((a) => setAgent(a.id, "IDLE", "Standby", 0));
      log("SYSTEM", "Mission aborted.", "warn");
    };
    $("speed").onchange = (e) => { state.speed = Number(e.target.value); };
    $("setupBtn").onclick = () => $("setupDialog").showModal();
    $("saveSetup").onclick = () => {
      state.mission = {
        seller: $("inSeller").value, phone: $("inPhone").value, title: $("inTitle").value,
        price: Number($("inPrice").value), area: Number($("inArea").value),
        description: $("inDescription").value, youtube: $("inVideo").value,
        woj: $("inWoj").value, powiat: $("inPowiat").value, city: $("inCity").value, zip: $("inZip").value,
        district: $("inDistrict").value, street: $("inStreet").value, market: $("inMarket").value,
        type: $("inType").value, use: $("inUse").value, rooms: $("inRooms").value, media: $("inMedia").value
      };
      state.portals = $("inPortals").value.split(/\n/).map((s) => s.trim()).filter(Boolean);
      localStorage.setItem("vshark.mission", JSON.stringify(state.mission));
      applyMissionToUI();
      $("setupDialog").close();
      log("HELM", "Mission input sealed.", "ok");
    };
    $("approveBtn").onclick = () => {
      state.waitingApproval = false; state.approved = true;
      $("approvalRequest").hidden = true; $("approvalIdle").hidden = false;
      $("airlockMetric").textContent = "CLEAR";
      log("AIRLOCK", "Approved: " + ($("approvalNote").value || "no comment"), "ok");
      if (window.listingLedger) window.listingLedger.recordApproval("approved");
      if (window.portalLink) window.portalLink.resolveApproval("approved");
    };
    $("rejectBtn").onclick = () => {
      state.waitingApproval = false; state.running = false;
      log("AIRLOCK", "Rejected by operator.", "err");
      if (window.listingLedger) window.listingLedger.recordApproval("rejected");
    };
    $("ledgerMini").onclick = () => $("ledgerDrawer").showModal();
    $("langBtn").onclick = () => {
      state.lang = state.lang === "pl" ? "en" : "pl";
      document.documentElement.lang = state.lang;
    };
    const recount = () => {
      $("titleCount").textContent = $("inTitle").value.length;
      $("descriptionCount").textContent = $("inDescription").value.length;
      const p = Number($("inPrice").value) || 0, a = Number($("inArea").value) || 1;
      $("ppm").textContent = Math.round(p / a).toLocaleString("pl-PL") + " zł / m²";
    };
    ["inTitle", "inDescription", "inPrice", "inArea"].forEach((id) => $(id).addEventListener("input", recount));
    recount();
    $("inExcel").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const text = typeof r.result === "string" ? r.result : "";
        const lines = text.split(/\r?\n/).map((l) => l.split(/[,;\t]/)[0].trim()).filter(Boolean);
        if (lines.length) {
          state.portals = lines.slice(0, 40);
          $("inPortals").value = state.portals.join("\n");
          log("VAULT", "Excel portals imported: " + state.portals.length, "ok");
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

  particles();
  renderAgents();
  $("selImg").src = AGENTS[0].img;
  applyMissionToUI();
  setupPhotos();
  bind();
  log("SYSTEM", "Station status. Rope telemetry idle.", "info");
})();
