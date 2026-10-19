function updGhosts(dt) {
  let n = 0;
  for (const q2 of P.slots) {
    if (q2.cd > 0) q2.cd -= dt;
    if (q2.on) n++;
  }
  if (n && !P.form && !S.limp) for (const b2 of P.blocks) {
    if (!b2.ghost) continue;
    const c = BT[b2.t].cost;
    if (S.scrap < c) {
      b2.fix = Math.min(b2.fix || 0, 0.95);
      continue;
    }
    b2.fix = (b2.fix || 0) + dt / 9;
    if (b2.fix >= 1) {
      S.scrap -= c;
      b2.paid = c;
      b2.ghost = false;
      b2.fix = 0;
      b2.hp = BT[b2.t].hp;
      if (LOG) {
        LOG.stand.fixed++;
        ev("stand-in", BT[b2.t].name + " made solid for " + c + " scrap");
      }
      const i = P.slots.indexOf(b2.slot);
      if (i >= 0) P.slots.splice(i, 1);
      b2.slot = null;
      recalc();
      const [wx2, wy2] = wpos(P, b2);
      ring(wx2, wy2, 26, 140, 2);
      sfx("place");
      toast(BT[b2.t].name + " rebuilt for " + c + " scrap");
      break;
    }
  }
  S.ghostT = (S.ghostT || 0) - dt;
  if (S.ghostT > 0 || P.form || pactOn("nostand") || S.depth >= TUNE.edgeBreak) return;
  const q = P.slots.find((q2) => !q2.on && !q2.frame && q2.cd <= 0 && q2.t !== "ehull" && !blockAt(q2.x, q2.y) && inHull(q2.x, q2.y));
  if (!q) return;
  const cost = S.mood === 3 ? 0 : TUNE.standCost * BT[q.t].cost;
  if ((pool() - cost) / Math.max(1, P.realCap) < TUNE.standKeep) return;
  if (cost) spend(cost, "Stand-ins");
  const b = mk(q.x, q.y, q.t, q.rot);
  if (q.fc) b.fc = q.fc & 3;
  b.ghost = true;
  b.hp = BT[q.t].hp * EKV("ghost", 0.5);
  b.slot = q;
  q.on = true;
  P.blocks.push(b);
  recalc();
  S.ghostT = 1;
  if (LOG) {
    LOG.stand.formed++;
    ev("stand-in", BT[q.t].name + " formed from ether");
  }
  const [wx, wy] = wpos(P, b);
  ring(wx, wy, 24, 120, 0);
  sfx("ghost");
}
const mmss = (s) => {
  s = Math.ceil(s);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
function lostSlots() {
  return P.slots.filter((q) => {
    const b = blockAt(q.x, q.y);
    return (!b || b.ghost) && inHull(q.x, q.y);
  });
}
const rbPay = (q) => q.t === "ehull" ? { s: 0, e: TUNE.rbPrice * BT.ehull.eth } : { s: TUNE.rbPrice * BT[q.t].cost, e: 0 }, canPay = (q) => {
  const p = rbPay(q);
  return S.scrap >= p.s && pool() >= p.e;
};
const rbCost = (list) => list.reduce((a, q) => a + rbPay(q).s, 0);
const rbNeed = () => Math.ceil(rbCost(lostSlots()));
function nextSlot() {
  let best = null, bp = 9, bd = 1e9;
  for (const q of lostSlots()) {
    const p = REB_PRI[q.t] || 5, d = Math.hypot(q.x, q.y);
    if (p < bp || p === bp && d < bd) {
      best = q;
      bp = p;
      bd = d;
    }
  }
  return best;
}
function rebuildSlot(q, paid) {
  const g = blockAt(q.x, q.y);
  if (g && g.ghost) P.blocks.splice(P.blocks.indexOf(g), 1);
  const nb = mk(q.x, q.y, q.t, q.rot);
  if (q.fc) nb.fc = q.fc & 3;
  nb.paid = paid;
  P.blocks.push(nb);
  if (LOG) ev("rebuilt", BT[q.t].name + " at " + q.x + "," + q.y);
  const i = P.slots.indexOf(q);
  if (i >= 0) P.slots.splice(i, 1);
  recalc();
  return nb;
}
function startRebuild() {
  if (S.rb) {
    endRebuild("Rebuild stopped");
    return;
  }
  if (!S.started || S.over || build) return;
  if (P.form) {
    toast("Re-form the hull first");
    return;
  }
  if (S.rbCd > 0) {
    toast("Rebuild ready in " + mmss(S.rbCd));
    return;
  }
  const list = lostSlots();
  if (!list.length) {
    toast("Nothing to rebuild");
    return;
  }
  const first = nextSlot();
  if (first && !canPay(first)) {
    toast(first.t === "ehull" ? "Rebuild needs " + Math.ceil(rbPay(first).e) + " ether in the pool for an Ether hull" : "Rebuild needs " + Math.ceil(rbCost(list)) + " scrap, you have " + Math.floor(S.scrap));
    return;
  }
  ev("rebuild", "full rebuild of " + list.length + " blocks");
  for (const q of list) q.frame = true;
  const dur = (TUNE.rbBase + TUNE.rbEach * list.length) * EK("rbT");
  S.rb = { n: list.length, done: 0, t: 0, dur, each: dur / list.length, next: dur / list.length };
  S.rbWarnT = -99;
  rebuildHum(dur);
  toast("Rebuilding " + list.length + (list.length > 1 ? " blocks" : " block"), 1800);
}
function stepRebuild(dt) {
  if (S.rbCd > 0) S.rbCd = Math.max(0, S.rbCd - dt);
  const r = S.rb;
  if (!r) return;
  r.t += dt;
  while (S.rb && r.t >= r.next) {
    r.next += r.each;
    const q = nextSlot();
    if (!q) {
      endRebuild();
      return;
    }
    const p = rbPay(q);
    if (!canPay(q)) {
      endRebuild(p.e ? "Not enough ether for the Ether hulls. The rest wait for the next rebuild" : "Out of scrap. The rest come back as stand-ins");
      return;
    }
    S.scrap -= p.s;
    if (p.e) spend(p.e, "Rebuild");
    const nb = rebuildSlot(q, p.s);
    r.done++;
    const [wx, wy] = wpos(P, nb);
    ring(wx, wy, 18, 120, 2);
    burst(wx, wy, 8, 90, 0, 0.4, 2.6);
    sfx("place");
  }
}
function endRebuild(msg) {
  const r = S.rb;
  if (!r) return;
  S.rb = null;
  for (const q of P.slots) q.frame = false;
  S.rbCd = waveLive > 0 ? TUNE.rbCdWave : TUNE.rbCd;
  stopHum();
  sfx("snap");
  ring(P.x, P.y, 60, 240, 0);
  if (LOG) {
    LOG.rebuilds++;
    LOG.rbBlocks += r.done;
  }
  toast(msg || "Rebuilt " + r.done + (r.done > 1 ? " blocks" : " block") + ". Next rebuild in " + mmss(S.rbCd), 3e3);
}
function noteLoss() {
  S.rbLoss = (S.rbLoss || []).filter((t) => S.t - t < TUNE.rbWindow);
  S.rbLoss.push(S.t);
  if (S.rbLoss.length >= TUNE.rbWarn && !S.rb) S.rbWarnT = S.t;
}
function toggleForm() {
  if (P.form) {
    P.form = false;
    sfx("unform");
    S.lastHit = S.t;
    ring(P.x, P.y, 70, 220, 0);
    toast("Hull re-forms");
    return;
  }
  if (poolF() < 0.4) {
    toast("Fill the pool to 40% to shed the hull");
    return;
  }
  if (S.rb) {
    toast("Not while rebuilding");
    return;
  }
  P.form = true;
  sfx("form");
  ring(P.x, P.y, 90, 300, 0);
  ring(P.x, P.y, 60, 180, 2);
  toast("Pure ether. Fly through them.");
}
