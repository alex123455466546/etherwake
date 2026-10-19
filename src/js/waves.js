let nextKind = "standard", curKind = "standard", kindMemo = { seed: null, list: [] };
const SIZE_RANGE = { small: [5, 9], escort: [14, 22], leader: [28, 46], frigate: [62, 88], cruiser: [102, 128], capital: [132, 168] };
const SIZE_FROM = { small: 1, escort: 10, leader: 15, frigate: 25, cruiser: 40, capital: 45 };
const SIZE_NAME = { small: ["ship", "ships"], escort: ["escort", "escorts"], leader: ["leader", "leaders"], frigate: ["Frigate", "Frigates"], cruiser: ["Cruiser", "Cruisers"], capital: ["Capital", "Capitals"] };
const sizeName = (n) => n < 10 ? "small" : n < 24 ? "escort" : n < 50 ? "leader" : n < 95 ? "frigate" : n < 130 ? "cruiser" : "capital";
const rollSize = (name) => {
  const r = SIZE_RANGE[name];
  return r[0] + (Math.random() * (r[1] - r[0] + 1) | 0);
};
const waveBudget = (w) => 12 + 6 * w + 0.06 * w * w;
const KIND_NAME = { skirmish: "a skirmish", standard: "a standard wave", battle: "a battle", flagship: "a flagship", duel: "a duel", bossduel: "the flagship alone", siege: "a siege" };
const GAP_OF = { skirmish: 15, standard: 25, battle: 40, flagship: 40, duel: 40, bossduel: 40, siege: 45 };
function kindOf(w) {
  if (kindMemo.seed !== S.seed) {
    kindMemo = { seed: S.seed, list: [null] };
  }
  const L = kindMemo.list;
  while (L.length <= w) {
    const n = L.length, prev = L[n - 1], relief = prev === "flagship" || prev === "duel" || prev === "bossduel", queue = kindMemo.queue || (kindMemo.queue = []);
    let sched = null;
    if (n >= 14 && (n - 14) % 7 === 0 && n % 5 === 0) sched = "bossduel";
    else if (n % 5 === 0) sched = "flagship";
    else if (n >= 14 && (n - 14) % 7 === 0) sched = "duel";
    else if (n >= 18 && n % 10 === 8) sched = "siege";
    if (sched) queue.push(sched);
    if (relief) {
      L.push("skirmish");
      continue;
    }
    if (queue.length) {
      L.push(queue.shift());
      continue;
    }
    const r = seeded(Math.imul(n, 2654435761) ^ (S.seed | 0))();
    L.push(n >= 20 && r < 0.25 ? "battle" : r < (n >= 20 ? 0.5 : 0.3) ? "skirmish" : "standard");
  }
  return L[w];
}
function planWave() {
  const w = S.wave + 1, kind = kindOf(w);
  nextKind = kind;
  nextWave = [];
  const opts = UNLOCK.filter((u) => u[1] <= w), pick = (allowed) => {
    const o = opts.filter((u) => !allowed || allowed.includes(u[0]));
    let tot = 0;
    for (const u of o) tot += u[2];
    if (!o.length) return "dart";
    let q = Math.random() * tot;
    for (const u of o) {
      q -= u[2];
      if (q <= 0) return u[0];
    }
    return o[0][0];
  };
  const BIG = ["gun", "mini", "rocket", "bomber", "bulwark", "brute"];
  let B = waveBudget(w) * (typeof dirK === "function" ? dirK() : 1) * swarmK();
  if (w === 100) {
    nextWave.push({ type: "reflection", n: 160, part: 0 });
    return nextWave;
  }
  const add = (type, n, part) => nextWave.push({ type, n, part: part | 0 });
  const smalls = (budget, part) => {
    while (budget > 5) {
      const n = rollSize("small");
      add(pick(), n, part);
      budget -= n;
    }
  };
  const escorts = (budget, part) => {
    while (budget > 14) {
      const n = rollSize("escort");
      add(pick(), n, part);
      budget -= n;
    }
  };
  if (kind === "duel" || kind === "bossduel") {
    if (kind === "bossduel") add("warden", Math.min(150, Math.round(B * 0.4) + 24), 0);
    else {
      const mine = allBlocks().filter((b) => !b.ghost).length, k = Math.min(2, 1.5 + Math.max(0, w - 14) / 35 * 0.5), n = Math.max(30, Math.round(mine * k)), t = pick(BIG.filter((x) => UNLOCK.some((u) => u[0] === x && u[1] <= w)));
      add(t, n, 0);
      nextWave[0].duel = true;
      nextWave[0].k = k;
      if (tierOf(w) >= TUNE.duelEscortTier) add(pick(), rollSize("escort"), 1);
    }
    return nextWave;
  }
  if (kind === "skirmish") B *= 0.5;
  else if (kind === "battle") B *= 1.75;
  else if (kind === "siege") B *= 1.5;
  if (kind === "flagship") {
    const wn = Math.min(150, Math.max(24, Math.round(B * 0.4)));
    const echo = loadJSON("ew_echo");
    if (w >= 30 && Array.isArray(echo) && echo.length && !S.echoUsed && Math.random() < 0.6) {
      S.echoUsed = true;
      add("gun", Math.min(150, Math.round(B * 0.4)), 0);
      nextWave[0].echo = echo[0];
    } else add("warden", wn, 0);
    B *= 0.6;
  }
  {
    let g = 0;
    if (typeof corrs !== "undefined") for (const c of corrs) g = Math.max(g, c.R / TUNE.corrFull);
    const k = w >= 15 && kind !== "skirmish" && g > 0 ? Math.min(4, Math.floor(g * 5)) : 0;
    for (let i = 0; i < k; i++) {
      const t = pick(BIG.filter((x) => UNLOCK.some((u) => u[0] === x && u[1] <= w)));
      add(t, rollSize("small"), 0);
      nextWave[nextWave.length - 1].corrupt = 1;
    }
  }
  if (w < 10) smalls(B, 0);
  else if (w < 25) {
    let left = B;
    if (w >= 15 && kind !== "skirmish") {
      const n = rollSize("leader");
      add(pick(BIG), n, 0);
      left -= n;
      const e1 = 3;
      for (let i = 0; i < e1; i++) {
        const m = rollSize("escort");
        add(pick(), m, 0);
        left -= m;
      }
    }
    const esc = left * 0.4;
    escorts(esc, 0);
    smalls(left - esc, 0);
  } else if (w < 40) {
    let left = B;
    const big = left * 0.5, fr = Math.max(1, Math.min(2, Math.round(big / 75)));
    for (let i = 0; i < fr; i++) {
      const n = rollSize("frigate");
      add(pick(BIG), n, 0);
      left -= n;
    }
    const esc = left * 0.4;
    escorts(esc, 0);
    smalls(left - esc, 0);
  } else {
    let left = B;
    const big = left * 0.6, cnt = Math.max(1, Math.min(3, Math.round(big / 130)));
    for (let i = 0; i < cnt; i++) {
      const n = rollSize(i && w >= 45 && Math.random() < 0.5 ? "capital" : "cruiser");
      add(pick(BIG), n, 0);
      left -= n;
    }
    smalls(Math.min(left, 160), 0);
  }
  const parts = kind === "battle" ? 3 + (Math.random() * 2 | 0) : kind === "standard" ? 2 + (Math.random() * 2 | 0) : 1;
  if (kind === "siege") for (const q of nextWave) q.siege = 1;
  if (parts > 1) nextWave.forEach((q, i) => {
    if (i > 0 && !(q.n >= 60)) q.part = i % parts;
  });
  if (w >= 12) {
    for (const q of nextWave) if (q.n >= 14 && Math.random() < 0.12) q.elite = 1;
  }
  return nextWave;
}
function iconOf(t) {
  const T = ET[t], cs = T && T.cells && T.cells.length && T.cells.length < 20 ? T.cells : null;
  if (!cs) return "<i>" + (T ? T.mark : "?") + "</i>";
  const xs = cs.map((c) => c[0]), ys = cs.map((c) => c[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0 + 1, h = Math.max(...ys) - y0 + 1, k = 5;
  return '<svg width="' + w * k + '" height="' + h * k + '" viewBox="0 0 ' + w * k + " " + h * k + '" aria-hidden="true">' + cs.map((c) => '<rect x="' + (c[0] - x0) * k + '" y="' + (c[1] - y0) * k + '" width="' + (k - 0.6) + '" height="' + (k - 0.6) + '" fill="#e5484d"/>').join("") + "</svg>";
}
function groupIcons(c) {
  const ks = Object.keys(c).sort((a, b) => c[b] - c[a]), top = ks.slice(0, 5), more = ks.slice(5).reduce((s, k) => s + c[k], 0);
  return top.map((t) => {
    const nm = t === "reflection" ? "???" : ET[t].name;
    return '<span class="ei" title="' + nm + '">' + (t === "reflection" ? "<i>?</i>" : iconOf(t)) + "<b>" + c[t] + " " + nm + "</b></span>";
  }).join("") + (more ? '<span class="ei">and ' + more + " more</span>" : "");
}
function liveHTML() {
  const c = {};
  for (const e of enemies) if (e.wave) c[e.type] = (c[e.type] || 0) + 1;
  return Object.keys(c).length ? groupIcons(c) : "";
}
function nextHTML() {
  if (S.wave + 1 === 100) return 'Next: <span class="ei" title="Unknown"><i>?</i></span> ?';
  if (nextKind === "duel" || nextKind === "bossduel") {
    const seen = loadJSON("ew_duel");
    return seen ? nextKind === "duel" && tierOf(S.wave + 1) >= TUNE.duelEscortTier ? "Next: one ship and an escort" : "Next: one ship" : '<span class="ei" title="Unknown"><i>?</i></span> Next: ?';
  }
  const c = {};
  for (const q of nextWave) c[q.type] = (c[q.type] || 0) + 1;
  const tr = ROMAN[tierOf(S.wave + 1)];
  const cor = nextWave.filter((q) => q.corrupt).length;
  return "Next " + KIND_NAME[nextKind] + ": " + groupIcons(c) + (tr ? " tier " + tr : "") + (S.armT && S.armShare > 0.1 ? " in " + COUNTER_NAME[S.armT] : "") + (cor ? ", " + cor + " corrupted" : "");
}
