function syncSys() {
  sysEl.forEach((el, i) => {
    el.dataset.s = S.pri[i];
    el.children[1].textContent = PRN[S.pri[i]] + " " + Math.round(S.pw[i] * 100) + "%";
    el.classList.toggle("thr", S.pw[i] < 0.99);
  });
}
function tapSys(i) {
  S.tPri = true;
  const now = performance.now();
  if (now - tapT[i] < 330) S.pri[i] = 2;
  else S.pri[i] = S.pri[i] === 0 ? 1 : 0;
  tapT[i] = now;
  S.tickN = S.pri[i];
  sfx("tick");
  syncSys();
}
const TOAST_IMP = /low|raid|cannot|can't|needs|no rail|too weak|failing|dry|broke|lost|warden/i;
function toast(msg, ms, imp) {
  if (!msg) {
    toastEl.textContent = "";
    toastEl.classList.remove("on");
    return;
  }
  if (imp === void 0) imp = TOAST_IMP.test(msg);
  const life = imp ? Math.max(ms || 0, 4800) : ms || 2200;
  let el = [...toastEl.children].find((c) => c.dataset.t === msg);
  if (el) {
    clearTimeout(+el.dataset.k);
    toastEl.appendChild(el);
    el.classList.remove("out");
  } else {
    el = document.createElement("div");
    el.dataset.t = msg;
    el.textContent = msg;
    toastEl.appendChild(el);
  }
  el.className = "m" + (imp ? " imp" : "");
  while (toastEl.children.length > 4) toastEl.firstChild.remove();
  el.dataset.k = setTimeout(() => {
    el.classList.add("out");
    setTimeout(() => {
      el.remove();
      if (!toastEl.children.length) toastEl.classList.remove("on");
    }, 300);
  }, life);
  toastEl.classList.add("on");
}
function setMood(m, quiet) {
  S.mood = m;
  const M = MOODS[m];
  $("mName").innerHTML = '<span class="ico">' + M.icon + "</span> " + M.name;
  $("mDesc").textContent = M.desc;
  S.moodT = S.t;
  if (!quiet) {
    sfx("mood");
    ring(P.x, P.y, 90, 260, 0);
    ring(P.x, P.y, 60, 150, 1);
  }
}
const trail = { e: { v: 0, t: 0 }, h: { v: 0, t: 0 }, s: { v: 0, t: 0 } }, shown = { e: 0, h: 0, s: 0 };
function trailOf(k, now, dt) {
  const q = trail[k];
  if (now >= q.v) {
    q.v = now;
    q.t = TUNE.trailHold;
  } else if ((q.t -= dt) <= 0) q.v = Math.max(now, q.v - Math.max(4e-3, (q.v - now) * 8 * dt));
  return q.v;
}
function seg(id, a, b) {
  const el = $(id).style;
  a = clamp(a, 0, 1);
  b = clamp(b, 0, 1);
  el.left = a * 100 + "%";
  el.width = Math.max(0, b - a) * 100 + "%";
}
function flowBars(dt) {
  const e = S.ether / P.cap, h = S.halo / S.haloMax, s = S.smax > 0 ? S.shield / S.smax : 0, inc = S.inflight + (S.skip ? S.skip.left : 0), toTank = Math.min(inc, P.cap - S.ether);
  seg("eTr", e, trailOf("e", e, dt));
  seg("hTr", h, trailOf("h", h, dt));
  seg("sTr", s, trailOf("s", s, dt));
  seg("eIn", e, e + toTank / P.cap);
  seg("hIn", h, h + (inc - toTank) / S.haloMax);
  const sp = e + toTank / P.cap;
  seg("eSp", sp, sp + S.spilled / P.cap);
  const k = Math.min(1, dt * 12);
  shown.e += (S.ether - shown.e) * k;
  shown.h += (S.halo - shown.h) * k;
  shown.s += (S.shield - shown.s) * k;
}
const setHtml = (el, h) => {
  if (el._h !== h) {
    el._h = h;
    el.innerHTML = h;
  }
};
let emR = 0;
let hintsSeen = null;
function hintsStep() {
  if (!S.started || S.over || S.paused || build) return;
  const h = hintsSeen || (hintsSeen = loadJSON("ew_hint") || {}), say = (k, t) => {
    h[k] = 1;
    storeJSON("ew_hint", h);
    toast(t, 6200, true);
    ev("hint", k);
  };
  if (!h.wedge && S.wave >= 1 && rifts.some((q) => q.t >= 0.2)) say("wedge", "Ships are about to arrive. The red wedge on the ring round your ship points at where they come from, and counts the seconds.");
  else if (!h.wheel && S.line === "wheel" && S.t > 20 && !S.hostile) say("wheel", "The Wheel has no front or back: its keys follow the ship, so W pushes the way it faces, and it thrusts every way equally.");
  else if (!h.cruise && S.t > 120 && waveLive <= 0 && !S.hostile && pool() > 10) say("cruise", "Press " + keyName(boundTo("KeyC")) + " for cruise control: it holds your speed, W and S change it, and " + keyName(boundTo("KeyC")) + " again stops it. Good for long trips.");
}
function cpList() {
  const el = $("cpl");
  if (!el) return;
  const on = copies.length > 0 || !!S.cb;
  if (el.hidden === on) el.hidden = !on;
  if (!on) return;
  let low = null;
  for (const c of copies) if (!low || copyHp(c) < copyHp(low)) low = c;
  const rows = copies.map((c) => "<li" + (c === low ? ' class="nx"' : "") + "><span>" + (c === low ? "▸ " : "") + c.blocks.length + " blocks</span><b>" + Math.round(copyHp(c) * 100) + "%</b></li>").join("");
  const mk = S.cb ? '<p class="bld">Making a copy: ' + S.cb.cost.scrap + " scrap, " + S.cb.cost.lock + " ether</p>" : "";
  const html = mk + '<span class="lab">Copies <kbd>Z</kbd> recalls the weakest</span><ul>' + rows + "</ul>";
  if (el.dataset.h !== html) {
    el.dataset.h = html;
    el.innerHTML = html;
  }
}
let cfHist = [];
function hud() {
  hintsStep();
  {
    const r = S.resume > 0 && S.started;
    if ($("resume").hidden === r) $("resume").hidden = !r;
    if (r) $("resumeN").textContent = Math.ceil(S.resume);
  }
  {
    const sc = Math.max(10, P.cap * 0.03);
    emR += ((S.net || 0) - emR) * Math.min(1, DT * 2.5);
    const f = clamp(emR / sc, -1, 1), up = f > 0 ? f * 50 : 0, dn = f < 0 ? -f * 50 : 0;
    $("fhUp").style.width = up + "%";
    $("fhDn").style.width = dn + "%";
    if (S.frame % 4 === 0) {
      const r = Math.round(emR * 10) / 10, full = pool() >= P.cap + S.haloMax - 1, inC = typeof corrAt === "function" && corrAt(P.x, P.y);
      $("emRate").textContent = (r >= 0 ? "+" : "-") + Math.abs(r).toFixed(1) + "/s";
      $("emNote").textContent = S.t < (S.corrPulse || 0) ? "OFFLINE: Corruption pulse " + Math.ceil(S.corrPulse - S.t) + " s" : derelict() ? "refilling: a derelict station" : inC ? S.corr > 0.5 ? "reduced: the Corruption (30%)" : "entering the Corruption" : full && r > 0 ? "full, losing it" : r < -0.5 ? "draining" : r > 0.5 ? "filling" : "steady";
    }
  }
  {
    const lk = S.lock || 0, tot = P.cap + lk;
    $("eBar").style.width = S.ether / tot * 100 + "%";
    $("eLk").style.width = lk / tot * 100 + "%";
  }
  $("sBar").style.width = (S.smax > 0 ? Math.min(1, S.shield / S.smax) * 100 : 0) + "%";
  $("hBar").style.width = S.halo / S.haloMax * 100 + "%";
  $("hRow").hidden = S.halo < 0.5 && S.inflight <= 0;
  flowBars(DT);
  for (let i = 0; i < 4; i++) sysEl[i].children[2].firstChild.style.width = Math.min(100, S.pw[i] * 100) + "%";
  if (S.frame % 6) return;
  syncSys();
  $("eVal").textContent = Math.round(shown.e) + " / " + Math.round(P.cap) + (S.lock ? " (+" + Math.round(S.lock) + " locked)" : "");
  cpList();
  $("sVal").textContent = Math.round(Math.min(shown.s, S.smax)) + " / " + Math.round(S.smax);
  $("hVal").textContent = Math.round(shown.h) + " / " + S.haloMax;
  $("vVal").textContent = S.mood === 3 ? "free" : ((P.emit.length * TUNE.laserCost + P.minis.length * TUNE.miniCost) * (S.pri[2] === 2 ? TUNE.wmaxCost : 1)).toFixed(1);
  $("mWhy").textContent = S.mood === 3 ? "Tanks drain, guns cost nothing" : S.mood === 1 ? S.hostile ? S.hostile + " hostile near" : "Under fire" : S.mood === 2 ? "Drawing ether in" : "No threats, not harvesting";
  show("mDepth", S.mood === 3);
  if (S.mood === 3) {
    const hd = S.hd || 0, th = [0, TUNE.holRim, TUNE.holCold, TUNE.holHeart, 1], cells = $("mDepth").firstChild.children;
    for (let i = 0; i < 4; i++) cells[i].style.setProperty("--f", clamp((hd - th[i]) / (th[i + 1] - th[i]), 0, 1));
    $("mDepthAt").textContent = hd < TUNE.holRim ? "Rim" : hd < TUNE.holCold ? "Quiet" : hd < TUNE.holHeart ? "Cold" : "Heart";
  }
  if ($("dev") && !$("dev").hidden) {
    const o = Math.hypot(P.x, P.y);
    $("dDepth").textContent = o > WORLD ? "Past the ring: " + Math.round(o - WORLD).toLocaleString("en") + " deep" : "Inside the ring, " + Math.round(WORLD - o).toLocaleString("en") + " from the edge. Region: " + (RT[S.biome] || RT.drift).name;
  }
  const rg = RT[S.biome] || RT.drift, kn = S.felt[S.biome] || S.biome === "edge";
  $("bioName").textContent = kn ? rg.name : "Unknown space";
  $("bioWhy").textContent = kn ? rg.short : "Fly on to find out";
  $("bioSw").style.background = S.biome === "edge" ? "none" : kn ? rg.col : "#3a4350";
  $("stVal").textContent = "+" + Math.round(S.stream * 100) + "%";
  $("spVal").textContent = Math.round(Math.hypot(P.vx, P.vy)) + (S.cruise ? " (C)" : "");
  $("spVal").classList.toggle("cr", !!S.cruise);
  $("scVal").textContent = Math.floor(S.scrap);
  {
    const en = (S.ech || []).length, et = en ? en + (en > 1 ? " Echoes" : " Echo") + ", press L" : "";
    if ($("echoTag").textContent !== et) {
      $("echoTag").textContent = et;
      $("echoTag").hidden = !en;
    }
  }
  {
    const ht = heatName();
    if ($("heatTag").textContent !== ht) $("heatTag").textContent = ht;
  }
  const co = P.blocks.find((b) => b.t === "core") || P.blocks[0], cf = clamp(co.hp / BT.core.hp, 0, 1);
  $("coVal").textContent = Math.round(cf * 100) + "%";
  $("coBar").style.width = cf * 100 + "%";
  $("coBar").parentNode.classList.toggle("low", cf < 0.3);
  const dry = pool() < 1, cook = S.cook > 0 ? Math.max(0, Math.ceil(TUNE.cookT - S.cook)) : 0;
  if (cfHist.length && cfHist[0][0] > S.t) cfHist.length = 0;
  if (S.frame % 30 === 0) {
    cfHist.push([S.t, cf]);
    while (cfHist.length && S.t - cfHist[0][0] > 8) cfHist.shift();
  }
  const dying = S.started && !S.over && waveLive > 0 && (cf < 0.5 && S.smax > 0 && S.shield < S.smax * 0.15 || cfHist.reduce((m, q) => Math.max(m, q[1]), cf) - cf > 0.3);
  const warn = !S.started || S.over ? "" : dry ? S.cook > TUNE.cookT ? "Out of ether: the hull is failing, hits hurt more" : S.cook > 0 ? "Out of ether: " + cook + "s to get away or refill" : "Tanks dry: engines and weapons are out, only the core laser fires" : dying ? "Core at " + Math.round(cf * 100) + "% and hits are getting through: pull back" : S.low ? "Ether low: systems throttling" : "";
  $("sWarn").textContent = warn;
  $("sWarn").hidden = !warn;
  $("pool").classList.toggle("need", !!warn && cf >= 0.3);
  $("pool").classList.toggle("danger", cf < 0.3);
  const armed = !!S.railSel && P.rails.length > 0, rc = S.rail && S.rail.on ? Math.round(clamp(S.rail.spent / (0.8 * (S.rail.p0 || 1)), 0, 1) * 100) : 0;
  $("game").classList.toggle("railing", armed);
  if (P.racks.length || armed) {
    $("wpn").hidden = false;
    setHtml($("wpn"), (armed ? '<span><b class="railtag">RAIL GUN ARMED</b> ' + (S.rail.on ? S.rail.spent >= 0.2 * S.rail.p0 - 0.01 ? S.rail.hold > 0 ? '<b class="fast">FULL (' + rc + "%): firing by itself</b>" : '<b class="fast">READY (' + rc + "%): let go to fire, hold for a wider shot</b>" : "charging <b>" + rc + "%</b>, too weak to fire yet" : "hold fire to charge, Q stows") + "</span>" : "") + (P.racks.length ? "<span>Missiles <b>" + allRacks().length + "</b> racks, <b>" + (S.missCd <= 0 ? "loaded" : "reloading") + "</b></span><span>Warhead <b>×" + warhead().toFixed(2) + "</b></span>" + (S.fast ? '<span><b class="fast">Fast fire</b></span>' : "") : ""));
  } else $("wpn").hidden = true;
  $("mDesc").classList.toggle("gone", S.t - (S.moodT || 0) > 8 && S.started);
  const lost = S.started && !S.over ? lostSlots() : [];
  let rb = "";
  if (S.rb) rb = "Rebuilding " + S.rb.done + " of " + S.rb.n + ". G stops";
  else if (S.rbWait) rb = "Pieces coming home to rebuild";
  else if (lost.length && S.rbCd <= 0 && S.scrap < rbCost(lost)) rb = "Rebuild needs " + Math.ceil(rbCost(lost)) + " scrap, you have " + Math.floor(S.scrap);
  else if (lost.length && S.t - S.rbWarnT < 8) rb = lost.length + (lost.length > 1 ? " blocks" : " block") + " broken · " + (S.rbCd > 0 ? "rebuild ready in " + mmss(S.rbCd) : "rebuild for " + rbCost(lost) + " scrap · press G");
  $("wRb").textContent = rb;
  show("rbl", !!rb);
  $("rbl").classList.toggle("need", !!rb);
  const gap = waveLive <= 0 && !rifts.length;
  $("wNum").textContent = S.wave ? "Wave " + S.wave : "Get ready";
  $("wLab").textContent = !gap ? waveLive + " hostile" + (S.hold ? ", then on hold" : "") : S.hold ? "waves on hold, H resumes" : "next wave in " + Math.max(0, Math.ceil(waveT)) + "s, N calls it, H holds";
  setHtml($("wNext"), gap ? nextHTML() : liveHTML());
  $("flow").classList.toggle("need", S.low);
  $("stage").classList.toggle("menu", !S.started || S.over);
  $("wBar").style.width = (gap && !S.hold ? clamp(waveT / ((GAP_OF[curKind] || 25) * gapK()), 0, 1) * 100 : 0) + "%";
  $("stage").classList.toggle("danger", S.started && !S.over && (cf < 0.3 || waveLive > 0 && S.smax > 0 && S.shield <= 0 || pool() < P.cap * 0.15 && S.hostile > 0));
  $("flowHint").hidden = S.st.time > 90;
  keyHints();
  const boss = S.started && !S.over && !build ? enemies.find((e) => ET[e.type] && (ET[e.type].boss || e.type === "reflection")) : null;
  show("boss", !!boss);
  if (boss && boss.type === "reflection") {
    $("bossL").textContent = "The Last Reflection";
    $("bossB").style.width = clamp(boss.hp / boss.max, 0, 1) * 100 + "%";
    $("bossP").textContent = boss.core ? "Armoured. It adapts to what you use most" : "Core gone, " + boss.blocks.length + " blocks left. Break every one";
  } else if (boss) {
    $("bossL").textContent = "Warden";
    $("bossB").style.width = clamp(boss.hp / boss.max, 0, 1) * 100 + "%";
    $("bossP").textContent = boss.ph ? "Venting. Open for " + Math.ceil(boss.pt) + "s" : "Shelled for " + Math.ceil(boss.pt) + "s. Collectors on priority strip it";
  }
  if (!$("dbg").hidden && S.frame % 30 === 0) $("dbgBody").textContent = logText();
  if (tip >= 0 && S.started && !S.over && TIPS[tip][1]()) {
    tip++;
    if (tip >= TIPS.length) {
      tip = -1;
      storeJSON("ew_tips", 1);
      toast("That is the lot for now. More as you go; Esc lists every control.", 3600);
    }
    showTip();
  }
  lessons();
}
let hintKey = "";
function keyHints() {
  if (!SET.hints || build) return;
  const h = [];
  if (S.st.time < 120) h.push(["Esc", "Menu and guide"], ["B", "Shipyard"], ...pactOn("nohold") ? [] : [["H", "Hold waves"]]);
  else {
    if (waveLive <= 0 && !rifts.length && waveT > 12 && !S.hold) h.push(["N", "Call the wave early"]);
    if (lostSlots().length && !S.rb && S.rbCd <= 0) h.push(["G", "Rebuild"]);
    if (S.hull >= 2 && S.hostile && !copies.length) h.push(["X", "Copy (hold)"]);
    if (S.depth > 0) h.push(["Tab", "Map: the way home"]);
  }
  const k = h.map((q) => q[0]).join();
  if (k === hintKey) return;
  hintKey = k;
  $("keys").classList.toggle("fade", !h.length);
  if (h.length) $("keys").innerHTML = h.map((q) => "<span><kbd>" + q[0] + "</kbd> " + q[1] + "</span>").join("");
}
function blockPic(t) {
  const pc = document.createElement("canvas");
  pc.width = pc.height = 32;
  const q = pc.getContext("2d");
  q.scale(2, 2);
  q.translate(8, 8);
  const f = S.fill;
  S.fill = 0.6;
  drawBlocks({ x: 0, y: 0, a: 0, c: q }, [{ x: 0, y: 0, t, hp: BT[t].hp }]);
  S.fill = f;
  return pc;
}
function guidePics() {
  const W2 = 420, H2 = 170, cv2 = document.createElement("canvas");
  cv2.width = W2 * 2;
  cv2.height = H2 * 2;
  const c = cv2.getContext("2d");
  c.scale(2, 2);
  const ext = P.blocks.reduce((m, b) => Math.max(m, Math.hypot(b.x, b.y) * CELL + CELL), CELL), k = Math.min(3.2, 40 / ext), cx = 110, cy = H2 / 2, f = S.fill;
  S.fill = 0.7;
  c.save();
  c.translate(cx, cy);
  c.scale(k, k);
  drawBlocks({ x: 0, y: 0, a: 0, c, cell: cellMap(P.blocks) }, P.blocks);
  c.restore();
  S.fill = f;
  const R = 46;
  c.lineWidth = 2;
  c.strokeStyle = C.ink;
  c.setLineDash([3, 4]);
  c.beginPath();
  c.arc(cx, cy, R, 0, TAU);
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = C.ether;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, R + 7, -Math.PI / 2, -Math.PI / 2 + TAU * 0.7);
  c.stroke();
  c.strokeStyle = C.deep;
  c.lineWidth = 5;
  c.globalAlpha = 0.6;
  c.beginPath();
  c.arc(cx, cy, R + 17, 0, TAU);
  c.stroke();
  c.globalAlpha = 1;
  c.font = '700 11px "Atkinson Hyperlegible",sans-serif';
  c.fillStyle = C.ink;
  c.textAlign = "left";
  const lab = (t, x, y, lx, ly) => {
    c.strokeStyle = C.dim;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(lx, ly);
    c.lineTo(x - 4, y - 4);
    c.stroke();
    c.fillText(t, x, y);
  };
  lab("Halo: takes 30% of each hit", 190, 30, cx + 50, cy - 48);
  lab("Tanks (the ring's fill)", 190, 62, cx + 46, cy - 22);
  lab("Shield", 190, 94, cx + 46, cy + 6);
  lab("Core: lose it and the run ends", 190, 126, cx + 6, cy + 2);
  const one = cv2.toDataURL(), cv3 = document.createElement("canvas");
  cv3.width = 600;
  cv3.height = 120;
  const d = cv3.getContext("2d");
  d.scale(2, 2);
  [["eng", "1 Drive", "drive"], ["hull", "2 Shield", "shield"], ["emit", "3 Weapons", "gun"], ["coll", "4 Collect", "coll"]].forEach(([t, n, j], i) => {
    const x = 10 + i * 72, img = new Image();
    d.fillStyle = JOBC[j];
    d.fillRect(x, 8, 56, 3);
    d.font = '700 11px "Atkinson Hyperlegible",sans-serif';
    d.fillStyle = C.ink;
    d.fillText(n, x, 52);
    d.drawImage(blockPic(t), x, 16, 24, 24);
  });
  return '<h3>Your ship</h3><img class="gpic" alt="Your ship: the core in the middle, the shield ring, the tank ring and the halo outside it" src="' + one + '"><h3>The four keys</h3><p class="hint">Each key powers one job, and every block of that job wears its colour.</p><img class="gpic" alt="1 Drive, 2 Shield, 3 Weapons, 4 Collect" src="' + cv3.toDataURL() + '"><h3>Ether in and out</h3><p class="hint">Everything runs on ether: what you gather fills the tanks, and every system draws from them.</p><img class="gpic" alt="Rocks, wrecks, kills and collectors fill the tanks; the drive, shield, weapons and halo draw from them. Empty tanks put every system at 25%" src="' + flowPic() + '">';
}
function flowPic() {
  const W2 = 360, H2 = 176, cv = document.createElement("canvas");
  cv.width = W2 * 2;
  cv.height = H2 * 2;
  const c = cv.getContext("2d");
  c.scale(2, 2);
  const rows = [34, 70, 106, 142], tx = 160, ty = 60, ox = 252, font = (w, z) => {
    c.font = w + " " + z + 'px "Atkinson Hyperlegible",sans-serif';
  };
  c.fillStyle = C.dim;
  font(700, 10);
  c.fillText("IN", 8, 12);
  c.fillText("OUT", ox, 12);
  const flow = (x1, y1, x2, y2) => {
    c.strokeStyle = C.ether;
    c.globalAlpha = 0.35;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x1, y1);
    c.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
    c.stroke();
    c.globalAlpha = 0.9;
    c.fillStyle = C.ether;
    for (const k of [0.3, 0.6, 0.85]) {
      const u = 1 - k, x = u * u * u * x1 + 3 * u * u * k * (x1 + x2) / 2 + 3 * u * k * k * (x1 + x2) / 2 + k * k * k * x2, y = u * u * u * y1 + 3 * u * u * k * y1 + 3 * u * k * k * y2 + k * k * k * y2;
      c.beginPath();
      c.arc(x, y, 1.6, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  };
  rows.forEach((y) => {
    flow(104, y, tx - 2, ty + 20);
    flow(tx + 42, ty + 20, ox - 2, y);
  });
  c.fillStyle = "#6b7480";
  c.beginPath();
  [[0, -10], [9, -4], [7, 8], [-4, 10], [-10, 2], [-7, -8]].forEach((q, i) => c[i ? "lineTo" : "moveTo"](20 + q[0], rows[0] + q[1]));
  c.closePath();
  c.fill();
  c.fillStyle = C.line;
  c.strokeStyle = C.dim;
  c.lineWidth = 1;
  [[10, rows[1] - 9], [20, rows[1] - 9], [10, rows[1] + 1], [24, rows[1] + 3]].forEach((q) => {
    c.fillRect(q[0], q[1], 9, 9);
    c.strokeRect(q[0] + 0.5, q[1] + 0.5, 8, 8);
  });
  c.strokeStyle = C.hostile;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(18, rows[2], 7, 0.5, TAU - 0.5);
  c.stroke();
  c.fillStyle = C.hostile;
  [[27, rows[2] - 7], [29, rows[2] + 3], [24, rows[2] + 9]].forEach((q) => c.fillRect(q[0], q[1], 3, 3));
  c.drawImage(blockPic("coll"), 8, rows[3] - 12, 24, 24);
  font(700, 11);
  c.fillStyle = C.ink;
  ["Rocks", "Wrecks", "Kills", "Collectors"].forEach((t, i) => c.fillText(t, 38, rows[i] + 4));
  c.drawImage(blockPic("tank"), tx, ty, 40, 40);
  c.textAlign = "center";
  c.fillText("Tanks", tx + 20, ty + 56);
  font(400, 10);
  c.fillStyle = C.dim;
  c.fillText("When they run dry,", tx + 20, ty + 76);
  c.fillText("systems drop to 25%", tx + 20, ty + 88);
  c.textAlign = "left";
  ["eng", "hull", "emit"].forEach((t, i) => c.drawImage(blockPic(t), ox, rows[i] - 12, 24, 24));
  c.strokeStyle = C.deep;
  c.globalAlpha = 0.7;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(ox + 12, rows[3], 9, 0, TAU);
  c.stroke();
  c.globalAlpha = 1;
  font(700, 11);
  c.fillStyle = C.ink;
  ["Drive", "Shield", "Weapons", "Halo"].forEach((t, i) => c.fillText(t, ox + 30, rows[i] + 4));
  return cv.toDataURL();
}
function moodPic() {
  const W2 = 340, H2 = 112, cv = document.createElement("canvas");
  cv.width = W2 * 2;
  cv.height = H2 * 2;
  const c = cv.getContext("2d");
  c.scale(2, 2);
  c.lineCap = "round";
  const why = ["Cruising", "Fighting", "Harvesting", "Negative ether"], N = 24;
  MOODS.forEach((m, M) => {
    const x0 = 6 + M * 85, pt = (i) => {
      const t = i / N;
      return [x0 + 8 + t * 56, 58 - 20 * t + 7 * Math.sin(t * Math.PI)];
    };
    for (let i = 1; i <= N; i++) {
      if (M === 3 && i % 3 === 0) continue;
      const f = i / N;
      let [ax, ay] = pt(i - 1), [bx, by] = pt(i);
      if (M === 2) {
        const w = Math.sin(i * 0.9) * 7 * (1 - f);
        ay += w;
        by += Math.sin((i + 1) * 0.9) * 7 * (1 - f);
      }
      c.strokeStyle = M === 3 ? C.dim : PAL[0];
      c.globalAlpha = 0.15 + 0.55 * f;
      c.lineWidth = 0.6 + 2.6 * f;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
    }
    c.globalAlpha = 1;
    if (M === 1) for (const [i, dx, dy, col] of [[6, -3, -6, "#ffffff"], [10, 4, 6, PAL[0]], [14, -2, -7, "#ffffff"], [18, 3, 5, PAL[0]], [21, -4, 4, "#ffffff"]]) {
      const [px, py] = pt(i);
      c.fillStyle = col;
      c.fillRect(px + dx, py + dy, 2, 2);
    }
    if (M === 3) for (const i of [4, 9, 15]) {
      const [px, py] = pt(i);
      c.fillStyle = C.dim;
      c.globalAlpha = 0.6;
      c.fillRect(px + 2, py + 5, 2, 2);
      c.globalAlpha = 1;
    }
    const [sx, sy] = pt(N);
    c.drawImage(blockPic("core"), sx - 6, sy - 6, 12, 12);
    c.font = '700 11px "Atkinson Hyperlegible",sans-serif';
    c.fillStyle = C.ink;
    c.fillText(m.icon + " " + m.name, x0 + 2, 88);
    c.font = '400 10px "Atkinson Hyperlegible",sans-serif';
    c.fillStyle = C.dim;
    c.fillText(why[M], x0 + 2, 103);
  });
  return '<img class="gpic" alt="The trail in each mood: long and smooth when Calm, throwing sparks when Volatile, curling when Resonant, grey and flaking when Hollow" src="' + cv.toDataURL() + '">';
}
function buildGuide() {
  const dl = (rows) => '<dl class="ctl">' + rows.map((q) => "<dt>" + q[0] + "</dt><dd>" + q[1] + "</dd>").join("") + "</dl>";
  $("guideBody").innerHTML = guidePics() + "<h3>Ether moods</h3>" + moodPic() + dl(MOODS.map((m) => [m.icon + " " + m.name, m.desc])) + '<h3>Regions</h3><p class="hint">The world is about ninety regions, 40,000 to 60,000 across, with a Bloom and a Shallows near home and the harder kinds further out. You learn what a region does by flying in it. Their centres drift slowly between waves. Tab opens the map of what you have charted.</p>' + dl(Object.keys(RT).filter((k) => k !== "edge").map((k) => [RT[k].name, RT[k].desc + "."])) + CATS.map((c) => "<h3>" + c[0] + "</h3>" + dl(c[1].map((t) => [BT[t].name, BT[t].info + "<small>" + (t === "ehull" ? BT.ehull.eth + " ether" : BT[t].cost + " scrap") + (t in ULK ? ", from wave " + ULK[t] : "") + "</small>"]))).join("") + "<h3>Hostiles</h3>" + dl(Object.keys(ET).map((k) => ["[" + ET[k].mark + "] " + ET[k].name, ET[k].info])) + '<h3>Enemy parts</h3><p class="hint">At waves 10, 25 and 45 every enemy grows a part (I, II, III), shown as extra cells. Each one changes how it fights.</p>' + dl(Object.keys(PARTS).map((k) => [ET[k].name, PARTS[k].map((p, i) => ROMAN[i + 1] + ": " + p.name).join(" · ")]));
}
function shipStats() {
  const em = Math.max(0, P.wt - P.carry), wm = clamp(TUNE.turnK * (TUNE.turnG0 + TUNE.turnG * P.gyro) / Math.sqrt(Math.max(1, P.spin)), TUNE.turnMin, TUNE.turnMax), acc = TUNE.thrustK * (1.12 + 0.11 * P.thr + 0.22 * P.aft) / Math.max(1, P.wt), rows = [
    ["Speed", Math.round(250 * (1.08 + Math.min(1, 0.11 * P.thr)) / (1 + em * 0.012) * PK("speed"))],
    ["Half turn", (Math.PI / (wm * PK("turn")) + 1 / TUNE.turnAcc).toFixed(1) + " s"],
    ["Shield", Math.round(S.smax || (30 + 10 * P.hull) * 1.15)],
    ["Tanks", Math.round(P.cap)],
    ["Halo", S.haloMax],
    ["Reach", Math.round(95 + 48 * P.coll + P.radius)],
    ["Push", Math.round(acc)],
    ["Weight", Math.round(P.wt)],
    ["Blocks", P.mass],
    ["Shot cost", (P.emit.length * TUNE.laserCost + P.minis.length * TUNE.miniCost).toFixed(1)],
    ["Gun range", Math.round(0.95 * TUNE.rangeLaser * 900 * rngK()) + (P.sensor ? " (+" + Math.round((rngK() - 1) * 100) + "% from " + Math.min(3, P.sensor) + " sensor" + (P.sensor > 1 ? "s" : "") + ")" : "")]
  ];
  $("bStats").innerHTML = rows.map((q) => "<dt>" + q[0] + "</dt><dd>" + q[1] + "</dd>").join("");
}
function showTip() {
  show("tip", (tip >= 0 || !!lesson) && !build);
  if (tip >= 0) $("tipT").textContent = tip + 1 + " of " + TIPS.length + ". " + TIPS[tip][0];
}
const LESSONS = [
  ["ether", () => S.wave >= 1 && S.lastFire > 0 && S.ether < P.cap * 0.8, "Shooting and boosting spend ether. Your tanks are the bar at the top left.", "pool"],
  ["yard", () => S.wave >= 1 && waveLive <= 0 && !rifts.length, "Wave cleared. Press B: a Collector is picked, and collectors draw ether in from space.", null, () => {
    if (unlocked("coll")) {
      pick = "coll";
      tab = 3;
    }
  }],
  ["mood", () => S.mood === 1, "Volatile: fighting stirs the ether. Your bolts hit harder, but they wobble.", "mood"],
  ["halo", () => S.halo > 1, "Spare ether becomes your halo, the ring around you. It takes 30% of every hit before the shield.", "pool"],
  ["pri", () => S.low, "Ether is low, so systems throttle. Tap 3 to keep the weapons firing.", "flow"],
  ["miss", () => unlocked("miss") && S.wave >= 4 && waveLive <= 0 && !rifts.length, "Missile racks are unlocked. They fire with your guns whenever enemies are near. Press B.", null, () => {
    pick = "miss";
    tab = 2;
  }],
  ["warden", () => enemies.some((e) => ET[e.type].boss), "A Warden: its shell blocks everything. Hit it while it vents, or put Collectors on priority to strip it.", "wave"],
  ["skip", () => S.wave >= 6 && waveLive <= 0 && !rifts.length && waveT > 12, "N calls the next wave early: a time skip that pays back the ether you would have made.", "wave"],
  ["hull", () => S.hull >= 0 && S.hull < MAXHULL && S.scrap >= HULLS.price[S.hull + 1] && hullOpen(S.hull + 1), "You can afford a bigger hull. Buy it on the right of the shipyard (B).", null],
  ["copy", () => S.hull >= 2, "Hold X to build a copy of your ship: an AI ship that fights beside you. It costs scrap and locks some ether. Z recalls the weakest.", null],
  ["rebuild", () => lostSlots().length >= 3, "Blocks broke. G rebuilds them, weapons first, at a price, then it cools down.", "wave"],
  ["map", () => S.seenR.length >= 2, "A new region. Tab opens the map; regions drift slowly between waves.", "scope"]
];
let lesson = null, learned = null;
function endLesson() {
  if (!lesson) return;
  if (lesson.hl) $(lesson.hl).classList.remove("teach");
  lesson = null;
  showTip();
}
function lessons() {
  if (lesson) {
    if (S.t - lesson.t > 9 || S.over) endLesson();
    return;
  }
  if (tip >= 0 || build || !S.started || S.over || S.tipsOff) return;
  if (!learned) learned = loadJSON("ew_learn") || {};
  for (const L of LESSONS) {
    if (learned[L[0]] || !L[1]()) continue;
    learned[L[0]] = 1;
    storeJSON("ew_learn", learned);
    lesson = { id: L[0], t: S.t, hl: L[3] };
    if (L[4]) L[4]();
    $("tipT").textContent = L[2];
    if (L[3]) $(L[3]).classList.add("teach");
    showTip();
    sfx("biome");
    break;
  }
}
const BOBL = {
  shield: { calm: ["Your shield is gone. Please try not to panic.", "The shield has fallen. I would keep moving."], sarcastic: ["Your shield is gone. A bold choice.", "Shield offline. I admire the confidence."], mixed: ["Shield offline. Unfortunate. You may call it something else.", "The shield is down. Do try to look busy."] },
  ether: { calm: ["Ether reserves are low. I am sure you have a plan.", "The tanks are nearly empty. A collector would help."], sarcastic: ["Ether is low. Wonderful. Let us see how that goes.", "The tanks are empty. Everything is fine."], mixed: ["Ether low. I would conserve it. Or not.", "The tanks are low. Do not mind me."] },
  handicap: { calm: ["Your guns and shield are at full strength now. From here the game is what it is.", "The early-wave help has lifted. You are on your own merits now."], sarcastic: ["Your training wheels are off. Do try to stay upright.", "Full strength, full responsibility."], mixed: ["The early-wave help is gone. Full strength, full risk.", "Guns and shield are at full strength. So are they."] },
  dying: { calm: ["The core is taking real damage and the shield cannot hold. I suggest breaking away.", "Hits are reaching the core faster than it mends. Please consider retreating."], sarcastic: ["The core is losing health quickly. I only mention it.", "Something is hitting the core a great deal. You may want to be elsewhere."], mixed: ["The core is dropping fast and the shield is no help. Time to be somewhere else.", "Core health is falling quickly. I would leave, if I were you. I am, regrettably, you."] },
  core: { calm: ["Core integrity is critical. It has been a pleasure.", "The core is failing. Please move away."], sarcastic: ["Core critical. Please take your time. I would like to see how this ends.", "The core is nearly gone. Do carry on."], mixed: ["Core critical. I am sure it is fine. It is not.", "Core failing. I recommend not being hit."] },
  corr: { calm: ["Something is wrong, {dir}, about {dist} units. I would not go there.", "I detect something, {dir}. About {dist} units. It is best avoided."], sarcastic: ["Something is wrong, {dir}, {dist} units. You will go anyway. You always do.", "There is evil {dir}, {dist} units out. I assume that is where we are going."], mixed: ["Anomaly detected, {dir}, {dist} units. I advise against it.", "Something {dir}, {dist} units away. It feels wrong."] }
};
let bobT = -99, bobKind = {}, bobHide = 0, bobPrev = { sh: 1, corr: -1e9 };
function bobSay(kind, vars, warn) {
  const tone = SET.bob || "mixed";
  if (tone === "off" || S.t - bobT < 25 || S.t - (bobKind[kind] || -1e9) < 90) return false;
  const b = BOBL[kind];
  if (!b) return false;
  const pool2 = b[tone === "mixed" ? "mixed" : tone] || b.mixed;
  let t = pool2[Math.random() * pool2.length | 0];
  for (const k in vars || {}) t = t.replace("{" + k + "}", vars[k]);
  bobT = S.t;
  bobKind[kind] = S.t;
  $("bobTxt").textContent = t;
  $("bob").classList.toggle("warn", !!warn);
  $("bob").hidden = false;
  bobHide = S.t + SET.bobSec;
  if (warn) {
    $("alertEdge").classList.add("on");
    setTimeout(() => $("alertEdge").classList.remove("on"), 900);
  }
  if (typeof tone === "string" && AC) try {
    sfx("bob");
  } catch (_) {
  }
  ev("bob", kind + ": " + t);
  return true;
}
function compass(dx, dy) {
  const a = Math.atan2(dy, dx), n = ["east", "south east", "south", "south west", "west", "north west", "north", "north east"];
  return n[Math.round((a + TAU) % TAU / (TAU / 8)) % 8];
}
function stepBob(dt) {
  if (!S.started || S.over) {
    return;
  }
  if (!$("bob").hidden && S.t > bobHide) $("bob").hidden = true;
  if (S.t < 8) return;
  const co = P.blocks.find((b) => b.t === "core"), cf = co ? co.hp / BT.core.hp : 1, fight = waveLive > 0;
  if (fight && bobPrev.sh > 0 && S.shield <= 0 && S.smax > 0) bobSay("shield", null, true);
  bobPrev.sh = S.shield;
  if (S.wave >= TUNE.hWaves && !bobKind.handicap && fight === false && bobSay("handicap")) bobKind.handicap = S.t;
  if (cf < 0.35) bobSay("core", null, true);
  else if (fight && (cf < 0.5 && S.smax > 0 && S.shield < S.smax * 0.15 || cfHist.reduce((m, q) => Math.max(m, q[1]), cf) - cf > 0.3)) bobSay("dying", null, true);
  else if (pool() < P.cap * 0.12 && !build && fight) bobSay("ether", null, true);
  if (typeof corrs !== "undefined" && corrs.length && S.t - bobPrev.corr > 180) {
    let best = null, bd = 1e12;
    for (const c of corrs) {
      const d = Math.hypot(c.x - P.x, c.y - P.y) - c.R;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best && bd > 0 && bd < 2e4) {
      if (bobSay("corr", { dir: compass(best.x - P.x, best.y - P.y), dist: Math.round(bd / 1e3) * 1e3 })) bobPrev.corr = S.t;
    }
  }
}
function setTitles() {
  const T = { eVal: "Ether in your tanks. It is your drive, shield and weapons.", hVal: "The halo: spare ether around the ship that takes hits first.", sVal: "The shield. It takes hits after the halo and recovers when you are not hit.", coVal: "The core. Lose it and the ship is gone.", scVal: "Scrap: spend it in the shipyard (B).", nVal: "Ether coming in minus going out each second.", spVal: "Your speed.", stVal: "The stream: the speed bonus from stored ether.", vVal: "What a volley of your lasers and miniguns costs." };
  for (const k in T) {
    const el = $(k);
    if (el) {
      el.title = T[k];
      if (el.parentNode) el.parentNode.title = T[k];
    }
  }
}
