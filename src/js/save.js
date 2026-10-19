function loadJSON(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch (e) {
    return null;
  }
}
function storeJSON(k, v) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {
  }
}
const SAVE_V = 8;
const UPGRADES = {
  1: (sv) => {
    sv.v = 2;
  },
  /* version 1 had the same fields */
  /* version 3 remembers what each block cost. Older blocks are priced as if bought in order: the i-th of a type at base + i/3 */
  3: (sv) => {
    if (sv.hull == null) {
      sv.hull = -1;
      sv.line = "";
    }
    sv.rbCd = 0;
    sv.v = 4;
  },
  /* version 4 has hulls: an older ship keeps the full square as a Legacy hull */
  6: (sv) => {
    sv.v = 7;
  },
  /* version 7 has block levels and heavy blocks: every old block loads at Mk I, facing the way it did */
  5: (sv) => {
    sv.field = [];
    sv.v = 6;
  },
  /* version 6 has the ether field: an older run starts with full space */
  4: (sv) => {
    sv.fitFrame = 1;
    sv.v = 5;
  },
  /* version 5 has frame plates: a hull bought before them gets its frame once, as it loads */
  2: (sv) => {
    const n = {};
    for (const b of sv.blocks) {
      const T = BT[b.t];
      if (!T || b.t === "core" || b.t === "ehull") {
        b.paid = 0;
        continue;
      }
      const i = n[b.t] | 0;
      n[b.t] = i + 1;
      b.paid = T.cost + Math.floor(i / 3);
    }
    sv.v = 3;
  }
};
function upgradeSave(sv) {
  if (!sv || typeof sv !== "object" || !Array.isArray(sv.blocks)) return null;
  sv.v = sv.v | 0 || 1;
  while (sv.v < SAVE_V) {
    const up = UPGRADES[sv.v];
    if (!up) return null;
    up(sv);
  }
  return sv;
}
function save() {
  if (S.over || !S.started) return;
  const one = (b, ox, oy) => ({ x: b.x + ox, y: b.y + oy, t: b.t, g: b.g, paid: b.paid | 0, f: b.frame ? 1 : void 0, r: b.rot || void 0, c: b.fc || void 0, mk: b.mk > 1 ? b.mk : void 0, u: b.upg > 0 ? b.upg : void 0 }), bl = P.blocks.filter((b) => !b.ghost).map((b) => one(b, 0, 0));
  if (LOG) {
    ev("save", "wave " + S.wave);
    persistLog();
  }
  noteAllWrecks();
  storeJSON("ew_save", { v: SAVE_V, field: fieldSave(), delta: S.delta, fog: fogSave(), corr: corrSave(), base: baseSave(), marks: S.marks, felt: S.felt, seed: S.seed, dev: S.dev || void 0, hull: S.hull, line: S.line, var: S.var, vk: S.vk | 0, pick: S.pick, diff: SET.diff, hAd: +(S.hAd || 0).toFixed(3), rbCd: Math.round(S.rbCd), cp: copySave(), pa: pactSave(), ec: echoSave(), st: stSave(), wt: +S.wt.toFixed(2), seenR: S.seenR, path: S.path.slice(-400), wave: waveLive > 0 ? Math.max(0, S.wave - 1) : S.wave, mid: waveLive > 0 ? 1 : 0, dirK: +(S.dirK || 1).toFixed(3), shield: Math.round(S.shield), pos: [Math.round(P.x), Math.round(P.y), Math.round(P.vx), Math.round(P.vy), +P.a.toFixed(3)], hold: S.hold ? 1 : 0, adapt: { dealt: S.dealt, mix: S.mixHist, share: S.armShare, t: S.armT }, scrap: S.scrap, ether: S.ether, halo: S.halo, pri: S.pri, kills: S.kills, st: S.st, blocks: bl, slots: P.slots.map((q) => ({ x: q.x, y: q.y, t: q.t, r: q.rot || void 0, c: q.fc || void 0 })) });
}
function reset(wave, seed) {
  Object.assign(S, {
    hAd: 0,
    pick: LINES[SET.line] ? SET.line : "lance",
    seed: Number.isInteger(seed) ? seed : Number.isInteger(window.__ewSeed) ? window.__ewSeed : Math.random() * 2147483647 | 0,
    echoUsed: false,
    duel: false,
    railSel: false,
    rail: { on: false, c: 0, spent: 0, hold: 0, p0: 0, top: false },
    dealt: [0, 0, 0],
    mixHist: [],
    armShare: 0,
    armT: null,
    pdWant: false,
    pdAcc: 0,
    railBeam: null,
    dev: false,
    god: false,
    t: 0,
    over: false,
    paused: false,
    ether: 70,
    shield: 30,
    lastHit: -9,
    ts: 1,
    pri: [0, 0, 0, 0],
    pw: [1, 1, 1, 1],
    low: false,
    lowT: -99,
    miniCd: 0,
    missCd: 0,
    scrap: 8,
    wave: wave | 0,
    fireCd: 0,
    shake: 0,
    kills: 0,
    halo: 0,
    net: 0,
    prev: 70,
    lastHarv: -9,
    lastFire: -9,
    wantT: 0,
    wt: 0,
    depth: 0,
    path: [],
    seenR: [],
    delta: {},
    fog: /* @__PURE__ */ new Set(),
    marks: {},
    felt: { drift: 1 },
    ram: 0,
    cur: null,
    corr: 0,
    cmp: 1,
    hd: 0,
    hsi: -1,
    pockets: [],
    pockT: 0,
    stage: 0,
    frayStage: 0,
    frostT: 0,
    hitStop: 0,
    pocketNeg: false,
    pocketCorr: false,
    mapOn: false,
    trip: null,
    newAch: [],
    frayT: 0,
    rackI: 0,
    racksFired: 0,
    fast: false,
    skip: null,
    inflight: 0,
    rb: null,
    rbCd: 0,
    rbWait: false,
    rbLoss: [],
    rbWarnT: -99,
    spilled: 0,
    hol: false,
    biome: "drift",
    cdMax: [0.3, 0.07, 1.3],
    alarmT: 0,
    hold: false,
    boost: false,
    ghostT: 0,
    tPick: false,
    tBoost: false,
    tPri: false,
    tBuild: false,
    best: +loadJSON("ew_best") || 0,
    st: { harv: 0, dmg: [0, 0, 0], time: 0, hol: 0, lost: 0, boss: 0, far: 0, edgeT: 0, frayLost: 0 },
    found: []
  });
  Object.assign(P, { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2, av: 0, tdx: 1, tdy: 0, tu: 0, form: false, slots: [] });
  $("stage").classList.remove("mapping");
  cam.x = cam.y = 0;
  mouse.down = mouse.rdown = mouse.mdown = false;
  FIELD.clear();
  starter();
  copies = [];
  S.lock = 0;
  S.cb = null;
  S.pacts = {};
  S.ech = [];
  S.rerolled = false;
  S.offer = null;
  S.momT = 0;
  echoRecalc();
  trader = null;
  evt = null;
  stBeams = [];
  S.win = null;
  S.dock = null;
  S.pend = [];
  S.bp = {};
  S.sold = {};
  S.ct = [];
  S.ctDone = {};
  S.storm = 0;
  S.evT = null;
  S.evLast = "";
  S.trWave = -1;
  {
    const a = $("stw"), b = $("evBox"), c = $("stAlert"), d = $("ctBox");
    if (a) a.hidden = true;
    if (b) b.hidden = true;
    if (c) c.hidden = true;
    if (d) d.hidden = true;
  }
  spills = [];
  build = false;
  tray = [];
  drag = null;
  fromTray = null;
  waveT = 14;
  waveLive = 0;
  show("build", false);
  show("flow", true);
  show("over", false);
  show("boss", false);
  $("keys").hidden = !SET.hints;
  setHull(0, S.pick, "normal");
  recalc();
  seedWorld(S.seed);
  planWave();
  setMood(0, true);
  syncSys();
  S.dirK = 1;
  S.hAd = 0;
  delete bobKind.handicap;
  cfHist.length = 0;
  S.wMinSh = S.wMinTk = S.wMinCore = 1;
  S.wLost = 0;
  S.wT0 = 0;
  atkSet.clear();
  cpulses.length = 0;
  trails.length = 0;
  S.poison = 0;
  S.curFree = 0;
  S.curAg = 0;
  S.cruise = false;
  S.cruiseV = 0;
  S.corrPulse = 0;
  S.autoT = 0;
  S.sec = null;
  S.resume = 0;
  S.spawn = 0;
  bobT = -99;
  bobKind = {};
  bobPrev = { sh: 1, corr: -1e9 };
  if (mus) mus.hbOn = 0;
}
function begin(sv, opt) {
  audio();
  sv = upgradeSave(sv);
  const ok = !!sv && sv.blocks.some((b) => b.t === "core");
  reset(ok ? sv.wave : 0, ok ? sv.seed : opt && opt.seed);
  if (!ok && opt && LINES[opt.line]) {
    S.pick = opt.line;
    setHull(0, S.pick, "normal");
    recalc();
  }
  if (!ok && opt && opt.pacts) {
    S.pacts = Object.assign({}, opt.pacts);
    recalc();
  }
  if (pactOn("nohold")) S.hold = false;
  if (ok) {
    S.dev = !!sv.dev;
    if (LINES[sv.pick]) S.pick = sv.pick;
    else if (LINES[sv.line]) S.pick = sv.line;
    if (DIFFS.some((d) => d[0] === sv.diff)) {
      SET.diff = sv.diff;
      storeJSON("ew_set", SET);
    }
    if (Array.isArray(sv.pos) && sv.pos.length === 5 && sv.pos.every(Number.isFinite)) {
      P.x = sv.pos[0];
      P.y = sv.pos[1];
      P.vx = sv.pos[2];
      P.vy = sv.pos[3];
      P.a = sv.pos[4];
      cam.x = P.x;
      cam.y = P.y;
      S.resume = 5;
    }
    S.dirK = clamp(+sv.dirK || 1, 1, TUNE.dirTop);
    S.hAd = clamp(+sv.hAd || 0, -TUNE.hAdMax, TUNE.hAdMax);
    S.hold = !!sv.hold;
    if (sv.adapt && Array.isArray(sv.adapt.dealt)) {
      S.dealt = sv.adapt.dealt.slice(0, 3).map((v) => +v || 0);
      S.mixHist = Array.isArray(sv.adapt.mix) ? sv.adapt.mix.slice(-40) : [];
      S.armShare = +sv.adapt.share || 0;
      S.armT = sv.adapt.t == null ? null : sv.adapt.t;
    }
    setHull(clamp(sv.hull | 0, -1, MAXHULL), LINES[sv.line] ? sv.line : S.pick, VARS[sv.var] ? sv.var : "normal");
    S.vk = clamp(sv.vk | 0, 0, 8);
    S.rbCd = clamp(+sv.rbCd || 0, 0, TUNE.rbCdMax);
    P.blocks = sv.blocks.filter((b) => BT[b.t] && !(b.f && b.t === "hull")).map((b) => {
      const k = mk(b.x | 0, b.y | 0, b.t, b.r | 0);
      if (b.c) k.fc = b.c & 3;
      k.mk = clamp(b.mk | 0 || 1, 1, 3);
      k.hp = maxHp(k);
      k.g = b.g ? 1 : 0;
      k.paid = Math.max(0, b.paid | 0);
      if (b.u > 0) k.upg = b.u | 0;
      return k;
    });
    S.scrap = sv.scrap | 0;
    S.kills = sv.kills | 0;
    if (Array.isArray(sv.field)) {
      for (const q of sv.field) if (Array.isArray(q) && q.length === 3) FIELD.set(cellKey(q[0] | 0, q[1] | 0), [clamp(+q[2] || 0, 0, 1), 0]);
    }
    if (Array.isArray(sv.pri) && sv.pri.length === 4) S.pri = sv.pri.map((v) => clamp(v | 0, 0, 2));
    if (Array.isArray(sv.slots)) P.slots = sv.slots.filter((q) => BT[q.t]).map((q) => ({ x: q.x | 0, y: q.y | 0, t: q.t, rot: q.r | 0, fc: (q.c | 0) & 3, on: false, cd: 1 }));
    if (sv.fitFrame && S.hull >= 1) fitFrame();
    if (sv.delta && typeof sv.delta === "object") S.delta = sv.delta;
    if (sv.marks && typeof sv.marks === "object") S.marks = sv.marks;
    if (sv.felt && typeof sv.felt === "object") S.felt = Object.assign({ drift: 1 }, sv.felt);
    fogLoad(sv.fog);
    S.wt = Math.max(0, +sv.wt || 0);
    driftSites();
    corrLoad(sv.corr);
    baseLoad(sv.base);
    resetChunks();
    refreshNear();
    if (Array.isArray(sv.seenR)) S.seenR = sv.seenR.filter(Number.isInteger);
    if (Array.isArray(sv.path)) S.path = sv.path.filter((q) => Array.isArray(q) && q.length === 2);
    if (sv.st && Array.isArray(sv.st.dmg)) {
      for (const k in S.st) if (typeof sv.st[k] === typeof S.st[k]) S.st[k] = sv.st[k];
    }
    pactLoad(sv.pa);
    echoLoad(sv.ec);
    stLoad(sv.st);
    ctBox();
    copyLoad(sv.cp);
    refit();
    recalc();
    S.ether = Math.min(P.cap, +sv.ether || 0);
    S.halo = Math.min(S.haloMax, +sv.halo || 0);
    if (+sv.shield > 0) S.shield = Math.min(400, +sv.shield);
    if (sv.mid) S.midLoad = 1;
    S.prev = pool();
    syncSys();
    if (S.wave >= TUNE.hWaves) bobKind.handicap = 1;
  }
  markFog();
  logStart(ok ? "continued from a save after wave " + S.wave : "new game");
  ev("start", (ok ? "continued" : "new") + ", " + diffName() + ", line " + S.pick + ", seed " + S.seed + ", " + heatName() + (pactList().length ? " (" + pactList().join(", ") + ")" : ""));
  show("start", false);
  show("wave", true);
  S.started = true;
  if (S.offer) {
    S.paused = true;
    echoShow();
  }
  S.spawn = 1.4;
  ring(P.x, P.y, 140, 320, 0);
  sfx("form");
  S.tipsOff = !!loadJSON("ew_tut");
  tip = !ok && !S.tipsOff && !loadJSON("ew_tips") ? 0 : -1;
  endLesson();
  showTip();
  toast(ok ? S.midLoad ? "Welcome back. You saved mid-wave, so wave " + (S.wave + 1) + " starts again." : "Welcome back. Wave " + (S.wave + 1) + " is coming." : tip < 0 ? "Shoot rocks. Fly through what falls out." : "", 3600);
  if (!loadJSON("ew_assist")) {
    storeJSON("ew_assist", 1);
    setTimeout(() => {
      if (S.started && !S.over) toast("Your ship has momentum now. V changes flight assist.", 4800);
    }, 4200);
  }
}
function menu() {
  menuEcho = void 0;
  const sv0 = loadJSON("ew_save"), old = !!sv0 && (sv0.v | 0) < SAVE_V, sv = old ? null : sv0, best = +loadJSON("ew_best") || 0;
  armed = false;
  show("mCont", !!sv);
  if (sv) $("mCont").textContent = "Continue: wave " + ((sv.wave | 0) + 1) + ", " + (sv.blocks ? sv.blocks.length : 0) + " blocks";
  $("go").className = sv ? "alt" : "";
  $("mBest").textContent = verName(VERSION) + ". " + (best ? "Best so far: wave " + best + ". " : "") + (old ? "Your saved run was in the old, smaller world, which is gone. " : "") + "Needs a keyboard and mouse.";
  const seen = loadJSON("ew_ver");
  if (seen !== VERSION) {
    if (seen == null && !sv && !best) storeJSON("ew_ver", VERSION);
    else showNews(seen);
  }
}
const verAfter = (a, b) => {
  const p = String(a).split(".").map(Number), q = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(p.length, q.length); i++) {
    if ((p[i] || 0) !== (q[i] || 0)) return (p[i] || 0) > (q[i] || 0);
  }
  return false;
};
function showNews(since) {
  const list = NEWS.filter((n) => since == null ? n === NEWS[0] : verAfter(n.v, since));
  if (!list.length) return;
  renderNews(list.map((n) => n.v));
  show("news", true);
}
function renderNews(vs) {
  $("newsVer").textContent = vs.length === 1 ? verName(vs[0]) : vs.length + " versions";
  const ul = (a) => "<ul>" + a.map((t) => "<li>" + t + "</li>").join("") + "</ul>";
  $("newsBody").innerHTML = '<nav class="nvl" aria-label="Versions">' + NEWS.map((n) => '<button type="button" class="nvb alt" data-v="' + n.v + '" aria-pressed="' + vs.includes(n.v) + '">' + verName(n.v) + "</button>").join("") + '</nav><div class="nvm">' + NEWS.filter((n) => vs.includes(n.v)).map((n) => "<h3>" + verName(n.v) + ": " + n.title + "</h3>" + ul(n.sum) + '<p class="hint">Try this</p>' + ul(n.tries)).join("") + "</div>";
}
function runCatalogue(rows) {
  if (S.dev) return;
  const bl = P.blocks.filter((b) => !b.ghost).map((b) => [b.x, b.y, b.t]), all = loadJSON("ew_runs") || [];
  all.unshift({ d: Date.now(), w: S.wave, df: diffName(), h: heatOf(), p: pactList(), e: (S.ech || []).map((h) => [echoName(h), h.r | 0, h.w | 0, (ECH_BY.get(h.id) || {}).cursed ? 1 : 0]), ln: hullName(), sd: S.seed, t: Math.round(S.t), k: S.kills, end: LOG && LOG.end || "", bl, rows });
  storeJSON("ew_runs", all.slice(0, 40));
}
const KINDCOL = { core: "#ffffff", tank: "#6ec6ff", shield: "#8be0b0", gun: "#ffb36b", eng: "#e8e08a", coll: "#b8ff8a", hull: "#8895a8" };
function drawRunShip(cv, bl) {
  const c = cv.getContext("2d");
  c.clearRect(0, 0, cv.width, cv.height);
  if (!bl || !bl.length) return;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of bl) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const s = Math.max(1, Math.min(Math.floor((cv.width - 8) / (x1 - x0 + 1)), Math.floor((cv.height - 8) / (y1 - y0 + 1)), 10)), ox = (cv.width - (x1 - x0 + 1) * s) / 2, oy = (cv.height - (y1 - y0 + 1) * s) / 2;
  for (const [x, y, t] of bl) {
    const T = BT[t], k = t === "core" ? "core" : !T ? "hull" : T.k === "tank" ? "tank" : T.k === "store" ? "tank" : /gun|weapon|rail|miss|art|mini|emit/.test(t + T.k) ? "gun" : T.k === "shield" ? "shield" : /eng|aft|thr/.test(t) ? "eng" : /coll/.test(t) ? "coll" : "hull";
    c.fillStyle = KINDCOL[k] || "#8895a8";
    c.fillRect(ox + (x - x0) * s, oy + (y - y0) * s, Math.max(1, s - (s > 3 ? 1 : 0)), Math.max(1, s - (s > 3 ? 1 : 0)));
  }
}
function recordsPage() {
  const a = loadJSON("ew_ach") || {}, got = Object.keys(ACH).filter((k) => a[k]), far = +loadJSON("ew_far") || 0, best = +loadJSON("ew_best") || 0, runs = loadJSON("ew_runs") || [], hb = loadJSON("ew_heat") || {};
  const hk = Object.keys(hb).sort((p, q) => +q.split(" H")[1] - +p.split(" H")[1] || p.localeCompare(q));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  $("recBody").innerHTML = '<dl class="recs"><dt>Best wave</dt><dd>' + (best || "none yet") + "</dd><dt>Farthest out</dt><dd>" + (far ? far.toLocaleString("en") + " past the edge" : "none yet") + "</dd></dl><h3>Best wave by difficulty and Heat</h3>" + (hk.length ? '<dl class="recs">' + hk.map((k) => "<dt>" + esc(k.replace(" H", " · Heat ")) + "</dt><dd>wave " + hb[k] + "</dd>").join("") + "</dl>" : "<p>None yet.</p>") + "<h3>Earned</h3><p>" + (got.length ? got.map((k) => ACH[k]).join(" &middot; ") : "Nothing yet. Some things are only found by flying there.") + "</p><h3>Past runs</h3>" + (runs.length ? '<div class="runs">' + runs.map((r, i) => {
    const dt = new Date(r.d), tm = Math.floor(r.t / 60) + "m";
    return '<details data-i="' + i + '"><summary>' + dt.toLocaleDateString() + " · wave " + r.w + " · " + esc(r.df) + (r.h ? " · Heat " + r.h : "") + " · " + esc(r.ln) + " · " + tm + '</summary><div class="runcard"><canvas width="220" height="160"></canvas><dl class="recs">' + (r.rows || []).map((q) => "<dt>" + esc(q[0]) + "</dt><dd>" + esc(q[1]) + "</dd>").join("") + (r.p && r.p.length ? "<dt>Pacts</dt><dd>" + esc(r.p.join(", ")) + "</dd>" : "") + (r.e && r.e.length ? "<dt>Echoes</dt><dd>" + r.e.map((x) => esc(x[0]) + (x[3] ? " (cursed)" : " (" + ["Common", "Rare", "Legendary"][x[1]] + ")") + " w" + x[2]).join(", ") + "</dd>" : "") + (r.end ? "<dt>End</dt><dd>" + esc(r.end) + "</dd>" : "") + "</dl></div></details>";
  }).join("") + "</div>" : "<p>No runs yet.</p>");
  for (const d of $("recBody").querySelectorAll("details")) d.addEventListener("toggle", () => {
    if (d.open) {
      const r = runs[+d.dataset.i];
      if (r) drawRunShip(d.querySelector("canvas"), r.bl);
    }
  });
  show("records", true);
}
const LINEFEET = { lance: "Long and fast", manta: "Swept wings and a big tank", wheel: "Round: thrusts every way in the New flight", bastion: "A heavy wedge that hits hard", brick: "A tough plain block" };
function seedFrom(txt) {
  txt = String(txt || "").trim();
  if (!txt) return void 0;
  if (/^-?\d{1,10}$/.test(txt)) {
    const n = +txt;
    if (Math.abs(n) <= 2147483647) return n;
  }
  let h = 2166136261;
  for (const c of txt.toLowerCase()) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h | 0);
}
function renderNew() {
  for (const b of $("ngDiff").children) b.setAttribute("aria-pressed", String(+b.dataset.d === SET.diff));
  if (!LINES[SET.line]) SET.line = "lance";
  $("ngLines").innerHTML = LINEORDER.map((l) => '<button type="button" class="alt" data-l="' + l + '" aria-pressed="' + (l === SET.line) + '"><img alt="" src="' + hullPic(2, l) + '"><b>' + LINES[l].name + "</b><small>" + LINEFEET[l] + ". " + LINES[l].perk + ".</small></button>").join("");
  {
    const n = Object.keys(pactsPicked()).length;
    $("ngHeat").textContent = n ? n + (n > 1 ? " pacts on" : " pact on") + " · Heat " + n : "no pacts · Heat 0";
  }
  $("ngLineNote").textContent = "Each line has its own shape from the very first ship, and its perks apply from the start. You keep your line for the whole run.";
}
function openNew() {
  armed = false;
  $("ngStart").textContent = "Start";
  renderNew();
  show("newgame", true);
  const first = !loadJSON("ew_ng");
  $("ngBob").textContent = first ? 'Bob: "Pick a difficulty and a ship, or just press Start. Difficulty modifiers are open now. Echoes, Records and the stations guide are all open."' : "";
  if (first) storeJSON("ew_ng", 1);
}
function startNew() {
  if (loadJSON("ew_save") && !armed) {
    armed = true;
    $("ngStart").textContent = "Overwrite the save? Click again";
    return;
  }
  const seed = seedFrom($("ngSeed").value);
  storeJSON("ew_save", null);
  show("newgame", false);
  begin(null, { seed, line: SET.line, pacts: pactsPicked() });
}
function closeNews() {
  show("news", false);
  storeJSON("ew_ver", VERSION);
}
function setPause(on) {
  if (build || S.over || !S.started || S.offer) return;
  S.paused = on;
  show("pause", on);
  ev("pause", on ? "paused" : "resumed");
  if (on) records();
}
function records() {
  const a = loadJSON("ew_ach") || {}, got = Object.keys(ACH).filter((k) => a[k]), far = +loadJSON("ew_far") || 0;
  show("pRec", got.length > 0);
  if (got.length) $("pRec").innerHTML = '<span class="lab">Records</span>' + (far ? '<p class="hint">Farthest out: ' + far.toLocaleString("en") + " past the edge</p>" : "") + "<p>" + got.map((k) => ACH[k]).join(" &middot; ") + "</p>";
}
function applySet() {
  rebuildKM();
  resize();
  document.body.classList.toggle("newflight", SET.flightModel === "new");
  if (typeof renderCtl === "function") renderCtl();
  $("mzLab").textContent = MZ[SET.mz] / 1e3 + "k";
  $("keys").hidden = build || !SET.hints;
  setVolumes();
  if (host) host.postMessage(SET.full ? "fullscreen:on" : "fullscreen:off");
}
function setFull(on) {
  SET.full = on;
  $("sFull").checked = on;
  storeJSON("ew_set", SET);
  applySet();
}
function saveNow() {
  if (!build) {
    save();
    if (S.started && !S.over) runFile("exit");
  }
}
function lostFocus() {
  for (const k in keys) keys[k] = false;
  mouse.down = mouse.rdown = mouse.mdown = false;
  if (S.started && !S.paused) setPause(true);
}
function endSplash() {
  if (splashDone) return;
  splashDone = true;
  $("splash").classList.add("out");
  setTimeout(() => {
    $("splash").hidden = true;
  }, 650);
}
