const ECH_TIER = [{ n: "Common", m: 1, c: "#9fb4d4" }, { n: "Rare", m: 1.6, c: "#e8c35a" }, { n: "Legendary", m: 2.4, c: "#c78cff" }], ECH_ODDS = [0.7, 0.25, 0.05], ECH_CURSED = 0.25;
const pcn = (v, m) => Math.round(v * m * 100);
const ECHOES = [
  { id: "dry", fam: "Missiles", name: "Dry racks", own: () => P.racks.length > 0, fx: (m) => ({ mcost: 1 - Math.min(0.7, 0.3 * m) }), txt: (m) => "Missiles cost " + Math.round(Math.min(0.7, 0.3 * m) * 100) + "% less ether." },
  { id: "warh", fam: "Missiles", name: "Heavy warheads", own: () => P.racks.length > 0, fx: (m) => ({ d2: 1 + 0.2 * m }), txt: (m) => "Missiles hit " + pcn(0.2, m) + "% harder." },
  { id: "beam", fam: "Lasers", name: "Focused beam", own: () => P.emit.length > 0, fx: (m) => ({ d0: 1 + 0.2 * m }), txt: (m) => "Lasers hit " + pcn(0.2, m) + "% harder." },
  { id: "shred", fam: "Miniguns", name: "Shredder", own: () => P.minis.length > 0, fx: (m) => ({ d1: 1 + 0.2 * m }), txt: (m) => "Miniguns hit " + pcn(0.2, m) + "% harder." },
  { id: "barrel", fam: "Guns", name: "Long barrel", own: () => P.emit.length + P.minis.length + P.arts.length > 0, fx: (m) => ({ range: 1 + 0.15 * m }), txt: (m) => "Your guns reach " + pcn(0.15, m) + "% farther." },
  { id: "dead", fam: "Rail", name: "Deadeye", own: () => P.rails.length > 0, fx: (m) => ({ rail: 1 + 0.25 * m }), txt: (m) => "The rail gun does " + pcn(0.25, m) + "% more damage." },
  { id: "quick", fam: "Shield", name: "Quick restart", own: () => true, fx: (m) => ({ sdelay: Math.max(0.2, 1 - 0.25 * m) }), txt: (m) => "The shield starts mending after " + (TUNE.shieldDelay * Math.max(0.2, 1 - 0.25 * m)).toFixed(2) + " s instead of " + TUNE.shieldDelay.toFixed(2) + " s." },
  { id: "deep", fam: "Halo", name: "Deep shield", own: () => true, fx: (m) => ({ shield: 1 + 0.2 * m }), txt: (m) => "The shield holds " + pcn(0.2, m) + "% more." },
  { id: "steady", fam: "Tanks", name: "Steady tanks", own: () => P.blocks.some((b) => b.t === "dtank"), fx: (m) => ({ steady: 1, ether: 1 + 0.05 * (m - 1) }), txt: (m) => "Dense tanks stop bursting." + (m > 1 ? " Tanks hold " + pcn(0.05, m - 1) + "% more." : "") },
  { id: "reach", fam: "Collection", name: "Long reach", own: () => P.coll > 0, fx: (m) => ({ reach: 1 + 0.25 * m }), txt: (m) => "Collectors reach " + pcn(0.25, m) + "% farther." },
  { id: "refine", fam: "Refining", name: "Thin refine", own: () => true, fx: (m) => ({ refine: 1 + m }), txt: (m) => "Surplus ether turns to scrap " + (1 + m).toFixed(1) + " times faster." },
  { id: "weld", fam: "Salvage", name: "Salvage weld", own: () => true, fx: (m) => ({ weld: 5 * m }), txt: (m) => "Drawing ether from a wreck mends your blocks " + (5 * m).toFixed(0) + " health a second." },
  { id: "ghost", fam: "Stand-ins", name: "Ghost hull", own: () => true, fx: (m) => ({ ghost: Math.min(1, 0.5 + 0.25 * m) }), txt: (m) => "Stand-ins form with " + Math.round(Math.min(1, 0.5 + 0.25 * m) * 100) + "% health instead of 50%." },
  { id: "hands", fam: "Rebuild", name: "Quick hands", own: () => true, fx: (m) => ({ rbT: Math.max(0.3, 1 - 0.2 * m) }), txt: (m) => "A rebuild takes " + Math.round(Math.max(0.3, 1 - 0.2 * m) * 100) + "% of the time." },
  { id: "mom", fam: "Flight", name: "Momentum", own: () => true, fx: (m) => ({ mom: 1 + 0.3 * m }), txt: (m) => "Boosting for 2 seconds makes the next 3 seconds of fire do " + pcn(0.3, m) + "% more." },
  { id: "mixed", fam: "Adaptation", name: "Mixed arms", own: () => true, fx: (m) => ({ mixed: 0.1 + 0.05 * (m - 1) }), txt: (m) => "While your top two kinds of damage are within " + Math.round((0.1 + 0.05 * (m - 1)) * 100) + "% of each other, enemies adapt to neither." },
  { id: "poker", fam: "Adaptation", name: "Poker face", own: () => true, fx: (m) => ({ poker: Math.max(0.15, 1 - 0.5 * m) }), txt: (m) => "Enemies adapt " + Math.round(Math.min(0.85, 0.5 * m) * 100) + "% slower." },
  { id: "glass", cursed: 1, fam: "Cursed", name: "Glass cannon", own: () => true, fx: () => ({ dmg: 1.5, shield: 0.5 }), txt: () => "+50% damage from every weapon, but the shield holds half as much." },
  { id: "over", cursed: 1, fam: "Cursed", name: "Overclock", own: () => true, fx: () => ({ rate: 1.4, halo: 0.5 }), txt: () => "+40% fire rate for lasers and miniguns, but the halo holds half as much." },
  { id: "hungry", cursed: 1, fam: "Cursed", name: "Hungry guns", own: () => true, fx: () => ({ dmg: 1.4, use: 1.4 }), txt: () => "+40% damage from every weapon, but everything costs 40% more ether." }
];
const ECH_DUEL = {
  gun: { id: "u_gun", fam: "Duel", name: "Borrowed lens", fx: (m) => ({ d0: 1 + 0.3 * m }), txt: (m) => "Lasers hit " + pcn(0.3, m) + "% harder. From the Gunner you beat." },
  mini: { id: "u_mini", fam: "Duel", name: "Spent casings", fx: (m) => ({ d1: 1 + 0.3 * m }), txt: (m) => "Miniguns hit " + pcn(0.3, m) + "% harder. From the Strafer you beat." },
  rocket: { id: "u_rocket", fam: "Duel", name: "Spare warheads", fx: (m) => ({ d2: 1 + 0.3 * m }), txt: (m) => "Missiles hit " + pcn(0.3, m) + "% harder. From the Rocketeer you beat." },
  bomber: { id: "u_bomber", fam: "Duel", name: "Blast lining", fx: (m) => ({ bomb: Math.max(0.2, 1 - 0.25 * m) }), txt: (m) => "Bombs do " + Math.round(Math.min(0.8, 0.25 * m) * 100) + "% less damage to you. From the Bomber you beat." },
  bulwark: { id: "u_bulwark", fam: "Duel", name: "Plate scrap", fx: (m) => ({ shield: 1 + 0.15 * m, halo: 1 + 0.15 * m }), txt: (m) => "Shield and halo hold " + pcn(0.15, m) + "% more. From the Bulwark you beat." },
  brute: { id: "u_brute", fam: "Duel", name: "Ram scars", fx: (m) => ({ hp: 1 + 0.15 * m }), txt: (m) => "Your blocks have " + pcn(0.15, m) + "% more health. From the Brute you beat." },
  warden: { id: "u_warden", fam: "Duel", name: "Warden crown", fx: (m) => ({ dmg: 1 + 0.08 * m, shield: 1 + 0.08 * m, speed: 1 + 0.08 * m }), txt: (m) => "+" + pcn(0.08, m) + "% damage, shield and speed. From the Warden you beat." }
};
const ECH_BY = /* @__PURE__ */ new Map();
for (const q of ECHOES) ECH_BY.set(q.id, q);
for (const k in ECH_DUEL) ECH_BY.set(ECH_DUEL[k].id, ECH_DUEL[k]);
const echMul = (e) => e.cursed ? 1 : ECH_TIER[e.r | 0].m;
let EKC = {};
function echoRecalc() {
  const t = {};
  for (const h of S.ech || []) {
    const q = ECH_BY.get(h.id);
    if (!q) continue;
    const fx = q.fx(q.cursed ? 1 : ECH_TIER[h.r | 0].m);
    for (const k in fx) t[k] = (t[k] === void 0 ? 1 : t[k]) * fx[k];
  }
  EKC = t;
}
const EK = (k) => EKC[k] === void 0 ? 1 : EKC[k];
const EKV = (k, d) => EKC[k] === void 0 ? d : EKC[k];
const echoHas = (id) => !!(S.ech && S.ech.some((h) => h.id === id));
function echoText(h) {
  const q = ECH_BY.get(h.id);
  return q ? q.txt(q.cursed ? 1 : ECH_TIER[h.r | 0].m) : "";
}
function echoName(h) {
  const q = ECH_BY.get(h.id);
  return q ? q.name : h.id;
}
let weldT = 0;
function echoWeld(dt) {
  const w = EKV("weld", 0);
  if (w <= 0) return;
  let left = w * dt;
  for (const b of P.blocks) {
    if (left <= 0) break;
    if (b.ghost) continue;
    const mx = BT[b.t].hp * (b.mk > 1 ? 1 + 0.5 * (b.mk - 1) : 1);
    if (b.hp < mx) {
      const a = Math.min(mx - b.hp, left);
      b.hp += a;
      left -= a;
    }
  }
}
function echoStep(dt) {
  if (!EKC.mom) {
    S.momT = 0;
    S.boostRun = 0;
    return;
  }
  if (S.boost) S.boostRun = (S.boostRun || 0) + dt;
  else {
    if ((S.boostRun || 0) >= 2) {
      S.momT = 3;
      S.momV = EKC.mom;
      if (LOG) ev("echo", "Momentum armed");
    }
    S.boostRun = 0;
  }
  if (S.momT > 0) S.momT -= dt;
}
function echoOwned(q) {
  try {
    return q.own ? q.own() : true;
  } catch (_) {
    return true;
  }
}
function rollTier() {
  const r = Math.random();
  return r < ECH_ODDS[0] ? 0 : r < ECH_ODDS[0] + ECH_ODDS[1] ? 1 : 2;
}
function echoDraw(duelType) {
  const have = new Set((S.ech || []).map((h) => h.id)), cards = [], fams = /* @__PURE__ */ new Set();
  const take = (q) => {
    cards.push({ id: q.id, r: q.cursed ? 0 : rollTier() });
    fams.add(q.fam);
    have.add(q.id);
  };
  const du = ECH_DUEL[duelType];
  if (du && !have.has(du.id)) take(du);
  const pool = (cursed) => ECHOES.filter((q) => !!q.cursed === cursed && !have.has(q.id) && !fams.has(q.fam));
  const want = 3 - cards.length;
  for (let i = 0; i < want; i++) {
    let cur = Math.random() < ECH_CURSED && pool(true).length > 0;
    let list = pool(cur);
    if (!list.length) {
      list = pool(false);
      if (!list.length) list = pool(true);
    }
    if (!list.length) break;
    if (i === want - 1 && !cards.some((c) => {
      const q2 = ECH_BY.get(c.id);
      return !q2.fam || echoOwned(q2);
    })) {
      const o = list.filter(echoOwned);
      if (o.length) list = o;
    }
    const q = list[Math.random() * list.length | 0];
    take(q);
  }
  return cards;
}
function echoOffer(duelType) {
  const cards = echoDraw(duelType);
  if (!cards.length) return;
  S.offer = { cards, duel: duelType || "", wave: S.wave };
  S.paused = true;
  echoShow();
  sfx("echo");
  if (LOG) ev("echo", "offered " + cards.map((c) => echoName(c) + (ECH_BY.get(c.id).cursed ? " (cursed)" : " (" + ECH_TIER[c.r].n + ")")).join(", "));
  if (LOG) (LOG.ech = LOG.ech || { offers: [], picks: [] }).offers.push([S.wave, cards.map((c) => c.id + ":" + c.r)]);
}
function rerollCost() {
  return 40 + 3 * S.wave;
}
function echoReroll() {
  if (!S.offer || S.rerolled) return;
  const c = rerollCost();
  if (S.scrap < c) {
    toast("A reroll costs " + c + " scrap.", 2200);
    return;
  }
  S.scrap -= c;
  S.rerolled = true;
  S.offer.cards = echoDraw(S.offer.duel);
  sfx("echo");
  echoShow();
  if (LOG) ev("echo", "rerolled for " + c + " scrap");
}
function echoPick(i) {
  if (!S.offer) return;
  const c = S.offer.cards[i];
  if (!c) return;
  (S.ech = S.ech || []).push({ id: c.id, r: c.r, w: S.wave });
  echoRecalc();
  recalc();
  S.offer = null;
  S.paused = false;
  show("echoO", false);
  sfx("echoPick");
  const q = ECH_BY.get(c.id);
  toast("Echo: " + q.name + ". " + q.txt(q.cursed ? 1 : ECH_TIER[c.r].m), 5200, true);
  if (LOG) {
    ev("echo", "picked " + q.name + (q.cursed ? " (cursed)" : " (" + ECH_TIER[c.r].n + ")") + " at wave " + S.wave);
    (LOG.ech = LOG.ech || { offers: [], picks: [] }).picks.push([S.wave, c.id + ":" + c.r]);
  }
  save();
}
function echoShow() {
  const o = S.offer;
  if (!o) return;
  show("echoO", true);
  $("echoCards").innerHTML = o.cards.map((c, i) => {
    const q = ECH_BY.get(c.id), t = q.cursed ? { n: "Cursed", c: "#ff6b6b" } : ECH_TIER[c.r];
    return '<button type="button" class="echo' + (q.cursed ? " cur" : "") + '" data-i="' + i + '" style="--ec:' + t.c + '"><i>' + t.n + "</i><b>" + q.name + "</b><small>" + q.fam + (o.duel && q.fam === "Duel" ? " (this duel)" : "") + "</small><span>" + q.txt(q.cursed ? 1 : ECH_TIER[c.r].m) + "</span></button>";
  }).join("");
  const rc = rerollCost();
  $("echoRe").disabled = !!S.rerolled || S.scrap < rc;
  $("echoRe").textContent = S.rerolled ? "Reroll used" : "Reroll (" + rc + " scrap)";
}
function echoList() {
  const l = S.ech || [];
  $("echoLHead").textContent = "Your Echoes";
  $("echoLBody").innerHTML = l.length ? l.map((h) => {
    const q = ECH_BY.get(h.id), t = q && q.cursed ? { n: "Cursed", c: "#ff6b6b" } : ECH_TIER[h.r | 0];
    return '<li style="--ec:' + t.c + '"><b>' + echoName(h) + "</b> <i>" + t.n + ", wave " + h.w + "</i><span>" + echoText(h) + "</span></li>";
  }).join("") : "<li><span>None yet. A duel you win offers three.</span></li>";
  show("echoL", true);
}
function echoCodex() {
  $("echoLHead").textContent = "Special upgrades";
  const row = (q) => {
    const t = q.cursed ? "Cursed. " + q.txt(1) : "Common: " + q.txt(1) + " Rare: " + q.txt(1.6) + " Legendary: " + q.txt(2.4);
    return '<li style="--ec:' + (q.cursed ? "#ff6b6b" : "#9fb4d4") + '"><b>' + q.name + "</b> <i>" + q.fam + "</i><span>" + t + "</span></li>";
  };
  $("echoLBody").innerHTML = "<li><span>After each duel you win, the game offers three: one from that duel ship and two from the pool below. Each card is Common, Rare or Legendary by luck. About one in four is cursed. One reroll a run. L shows what you hold.</span></li>" + ECHOES.map(row).join("") + "<li><span><b>Unique to a duel ship</b></span></li>" + Object.values(ECH_DUEL).map(row).join("");
  show("echoL", true);
}
function echoSave() {
  return { l: (S.ech || []).map((h) => [h.id, h.r | 0, h.w | 0]), rr: !!S.rerolled, o: S.offer ? { c: S.offer.cards.map((c) => [c.id, c.r | 0]), d: S.offer.duel, w: S.offer.wave } : null };
}
function echoLoad(a) {
  S.ech = [];
  S.rerolled = false;
  S.offer = null;
  if (a && Array.isArray(a.l)) {
    for (const x of a.l) if (Array.isArray(x) && ECH_BY.has(x[0])) S.ech.push({ id: x[0], r: clamp(x[1] | 0, 0, 2), w: x[2] | 0 });
  }
  S.rerolled = !!(a && a.rr);
  if (a && a.o && Array.isArray(a.o.c)) {
    const cards = a.o.c.filter((x) => ECH_BY.has(x[0])).map((x) => ({ id: x[0], r: clamp(x[1] | 0, 0, 2) }));
    if (cards.length) S.offer = { cards, duel: a.o.d || "", wave: a.o.w | 0 };
  }
  echoRecalc();
}
