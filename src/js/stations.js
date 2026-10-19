const REPN = [0, 6, 20, 45], REPNAME = ["Stranger", "Known", "Yours", "Partner"];
const STN_A = ["Anchorage", "Waystation", "Lantern", "Relay", "Harbor", "Quay", "Outpost", "Rest"], STN_B = ["Ash", "Vale", "Reed", "Halo", "Tarn", "Mere", "Oak", "Dunn", "Fen", "Crest"];
const STN_IMMUNE = /* @__PURE__ */ new Set(["hollows", "reach"]);
const DOCK_R = 700, DOCK_T = 3, DOCK_EN = 1500;
let stations = [], trader = null, evt = null, stBeams = [], stAlertT = 0;
const stLvl = (s) => {
  let l = 0;
  for (let i = 1; i < REPN.length; i++) if (s.rep >= REPN[i]) l = i;
  return l;
};
function srng(n) {
  let h = ((S.seed | 0) ^ Math.imul(n + 1, 2654435761)) >>> 0;
  return () => {
    h = Math.imul(h ^ h >>> 15, 2246822507) >>> 0;
    h = Math.imul(h ^ h >>> 13, 3266489909) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
function seedStations() {
  stations = [];
  if (!sites.length) return;
  const cs = new Set(corrs.map((c) => c.si)), ok = [];
  sites.forEach((s, i) => {
    if (STN_IMMUNE.has(s.k) || cs.has(i)) return;
    const d = Math.hypot(s.bx, s.by);
    if (d > WORLD * 0.85) return;
    ok.push(i);
  });
  let near = -1, nd = 1e12;
  for (const i of ok) {
    const d = Math.hypot(sites[i].bx, sites[i].by);
    if (d > 5e3 && d < nd) {
      nd = d;
      near = i;
    }
  }
  for (const i of ok) {
    const r = srng(1e3 + i);
    if (i !== near && r() > 0.33) continue;
    if (stations.length >= 14) break;
    const s = sites[i], a = r() * TAU, d = r() * 3500, rn = srng(2e3 + i);
    let x = s.bx + Math.cos(a) * d, y = s.by + Math.sin(a) * d;
    if (i === near) {
      const L = Math.hypot(s.bx, s.by) || 1, D = 9e3 + r() * 5e3;
      x = s.bx / L * Math.min(L, D);
      y = s.by / L * Math.min(L, D);
    }
    stations.push({ id: stations.length, si: i, x, y, name: STN_B[rn() * STN_B.length | 0] + " " + STN_A[rn() * STN_A.length | 0], hp: 1e3, hpMax: 1e3, rep: 0, up: 0, sc: 0, et: 0, dead: false, att: [], attT: 60 + rn() * 60, cd: 0, saved: 0, seen: false, sold: {}, hit: 0, ph: rn() * TAU });
  }
}
const stHpMax = (s) => 1e3 * (1 + 0.25 * s.up), stDps = (s) => (5 + S.wave * 0.7) * (1 + 0.3 * s.up);
const stNear = (x, y, r) => {
  let b = null, bd = r * r;
  for (const s of stations) {
    if (s.dead) continue;
    const d = (s.x - x) ** 2 + (s.y - y) ** 2;
    if (d < bd) {
      bd = d;
      b = s;
    }
  }
  return b;
};
function updStations(dt) {
  if (!S.started || S.over) return;
  stBeams = stBeams.filter((b) => (b.t -= dt) > 0);
  for (const s of stations) {
    if (s.dead) continue;
    const dp = Math.hypot(P.x - s.x, P.y - s.y);
    if (!s.seen && dp < 4200) {
      s.seen = true;
      stSeen(s);
    }
    const lvl = stLvl(s), corr = !!corrAt(s.x, s.y);
    if (lvl >= 2) {
      s.sc = Math.min(stCap(s, 0), s.sc + dt * (0.03 + 0.012 * s.up) * (1 + S.wave * 0.02));
      s.et = Math.min(stCap(s, 1), s.et + dt * (0.8 + 0.4 * s.up));
      mnStep(s, dt);
    }
    s.att = s.att.filter((e) => e.hp > 0 && enemies.indexOf(e) >= 0);
    if (corr) {
      if (dp > 26e3) s.hp -= s.hpMax * 3e-4 * dt;
      else {
        s.attT -= dt;
        if (s.attT <= 0 && !s.att.length) {
          s.attT = rnd(90, 150);
          stAttack(s);
        }
      }
    } else if (!s.att.length && s.hp < stHpMax(s)) s.hp = Math.min(stHpMax(s), s.hp + stHpMax(s) * 6e-3 * dt);
    s.hpMax = stHpMax(s);
    if (s.att.length) {
      let dmg = 0;
      for (const e of s.att) {
        if (Math.hypot(e.x - s.x, e.y - s.y) < 900) dmg += s.hpMax * 25e-4;
        else if (dp > 3500) {
          e.look = { x: s.x, y: s.y, t: S.t + 6 };
        }
      }
      s.hp -= dmg * dt;
      s.hit = dmg > 0 ? 0.25 : Math.max(0, s.hit - dt);
    } else if (s.hunted) {
      s.hunted = false;
      s.saved++;
      s.rep += 12;
      S.scrap += 10 + S.wave;
      toast(s.name + " is saved. Reputation +12.", 3600);
      sfx("clear");
      if (LOG) {
        LOG.st.saved++;
        LOG.st.rep += 12;
      }
      ev("station", s.name + " saved");
    }
    if (dp < 7e3 || s.att.length) {
      s.cd -= dt;
      if (s.cd <= 0) {
        s.cd = 0.8;
        stFire(s);
      }
    }
    if (s.hp <= 0) stFall(s);
  }
  stDock(dt);
  stTrader(dt);
  stEvents(dt);
  stAlert(dt);
  ctStep(dt);
}
const stCap = (s, k) => k ? 400 * (1 + 0.5 * s.up) : 60 * (1 + 0.5 * s.up);
function stAttack(s) {
  const n = 2 + Math.floor(S.wave / 10) + (s.up > 1 ? 0 : 1), types = ["gun", "mini", "rocket", "dart", "brute"];
  s.hunted = true;
  for (let k = 0; k < n; k++) {
    const a = rnd(0, TAU), r = rnd(1100, 1700), e = mkEnemy(types[k % types.length], s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
    e.awake = true;
    e.corrupt = true;
    e.tier = Math.min(3, (e.tier | 0) + 1);
    e.name = "Corrupted " + ET[e.type].name;
    e.look = { x: s.x, y: s.y, t: S.t + 30 };
    enemies.push(e);
    s.att.push(e);
    ring(e.x, e.y, 20, 160, 3);
  }
  if (Math.hypot(P.x - s.x, P.y - s.y) < 3e4) toast(s.name + " is under attack from the Corruption.", 3800);
  sfx("stalarm");
  if (LOG) {
    LOG.st.attacks++;
  }
  ev("station", s.name + " attacked by the Corruption: " + n + " ships");
  if (Math.random() < 0.4) mnLose(s);
}
function stFire(s) {
  let b = null, bd = 1600 * 1600;
  for (const e of enemies) {
    if (!e.awake || e.hp <= 0) continue;
    const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
    if (d < bd) {
      bd = d;
      b = e;
    }
  }
  if (!b) return;
  const blk = blockHit(b, b.x, b.y) || b.blocks && b.blocks[0];
  if (!blk) return;
  hurtEnemy(b, blk, stDps(s) * 0.8, null);
  stBeams.push({ x1: s.x, y1: s.y, x2: b.x, y2: b.y, t: 0.14 });
}
function stFall(s) {
  s.dead = true;
  s.hp = 0;
  for (const e of s.att) e.look = null;
  s.att = [];
  s.hunted = false;
  for (let k = 0; k < 3; k++) wrecks.push(mkWreck(s.x + rnd(-300, 300), s.y + rnd(-300, 300), true));
  burst(s.x, s.y, 160, 380, 1, 1.4, 4);
  sfx("boom");
  if (Math.hypot(P.x - s.x, P.y - s.y) < 4e4) toast(s.name + " is destroyed.", 4200);
  if (LOG) {
    LOG.st.lost++;
  }
  ev("station", s.name + " destroyed");
  if (S.win && S.win.kind === "st" && S.win.id === s.id) stClose();
}
function stSeen(s) {
  const h = hintsSeen || (hintsSeen = loadJSON("ew_hint") || {});
  if (!h.station) {
    h.station = 1;
    storeJSON("ew_hint", h);
    toast('Bob: "A station. Fly close and press U. Hold still for three seconds and it will trade with you. Nobody hostile nearby, mind."', 6400, true);
  }
  if (LOG) {
    LOG.st.seen++;
  }
  ev("station", "found " + s.name + " (" + Math.round(Math.hypot(s.x, s.y) / 1e3) + "k out)");
}
function stAlert(dt) {
  stAlertT -= dt;
  if (stAlertT > 0) return;
  stAlertT = 0.5;
  let best = null, bd = 1e12;
  for (const s of stations) {
    if (s.dead || !s.att.length) continue;
    const d = Math.hypot(P.x - s.x, P.y - s.y);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  const el = $("stAlert");
  if (!el) return;
  if (!best) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = best.name + " is under attack: " + (bd < 1e4 ? (bd / 1e3).toFixed(1) : Math.round(bd / 1e3)) + "k away, " + Math.max(0, Math.round(best.hp / best.hpMax * 100)) + "% health";
}
function stTarget() {
  const s = stNear(P.x, P.y, DOCK_R), t = trader && !trader.gone && Math.hypot(P.x - trader.x, P.y - trader.y) < DOCK_R ? trader : null;
  if (s && t) return Math.hypot(P.x - s.x, P.y - s.y) < Math.hypot(P.x - t.x, P.y - t.y) ? s : t;
  return s || t;
}
function stPress() {
  if (!S.started || S.over || S.paused) return;
  if (S.win) {
    stClose();
    return;
  }
  const o = stTarget();
  if (!o) {
    toast("Nothing to dock with here. Stations and the trader are marked on the map (Tab).", 2400);
    return;
  }
  S.dock = { o, t: 0, ok: false };
  sfx("menuPick");
}
function stBusy(o) {
  for (const e of enemies) {
    if (!e.awake || e.hp <= 0) continue;
    if ((e.x - P.x) ** 2 + (e.y - P.y) ** 2 < DOCK_EN * DOCK_EN) return true;
  }
  return false;
}
function stDock(dt) {
  const d = S.dock;
  if (!d) return;
  if (d.ok) {
    const o2 = d.o;
    if (o2.dead || o2.gone || Math.hypot(P.x - o2.x, P.y - o2.y) > DOCK_R * 1.6) {
      stClose();
      return;
    }
    if (stBusy(o2)) {
      stClose();
      toast("Undocked: something hostile is close.", 2400);
    }
    return;
  }
  const o = d.o;
  if (o.dead || o.gone || Math.hypot(P.x - o.x, P.y - o.y) > DOCK_R) {
    S.dock = null;
    toast("Docking cancelled.", 1600);
    return;
  }
  if (stBusy(o)) {
    S.dock = null;
    toast("Docking cancelled: something hostile is close.", 2400);
    return;
  }
  if (Math.hypot(P.vx, P.vy) > 140) {
    d.t = Math.max(0, d.t - dt * 2);
    return;
  }
  d.t += dt;
  if (d.t >= DOCK_T) {
    d.ok = true;
    S.win = { kind: o === trader ? "tr" : "st", id: o.id };
    sfx("dock");
    stDraw();
    if (LOG) {
      if (o === trader) LOG.tr.visits++;
      else LOG.st.visits++;
    }
    ev(o === trader ? "trader" : "station", "docked at " + (o.name || "the trader"));
  }
}
function stClose() {
  S.dock = null;
  S.win = null;
  const w = $("stw");
  if (w) w.hidden = true;
}
function stOffers(o) {
  const tr = o === trader, lvl = tr ? 0 : stLvl(o), disc = tr ? 1 : 1 - 0.05 * lvl, r = srng((tr ? 9e3 + o.id : o.id * 31) + Math.floor(S.wave / 5)), out = [];
  const price = (v) => Math.max(1, Math.ceil(v * disc));
  let miss = 0;
  for (const b of P.blocks) {
    if (b.ghost) continue;
    miss += Math.max(0, BT[b.t].hp * (b.mk > 1 ? 1 + 0.5 * (b.mk - 1) : 1) - b.hp);
  }
  out.push({ key: "repair", name: "Mend every block", txt: miss > 1 ? "Brings every block back to full health." : "Nothing needs mending.", price: price(miss * 0.2 + 3), off: miss <= 1, buy() {
    for (const b of P.blocks) {
      if (!b.ghost) b.hp = BT[b.t].hp * (b.mk > 1 ? 1 + 0.5 * (b.mk - 1) : 1);
    }
    recalc();
  } });
  const room = Math.max(0, P.cap - S.ether);
  out.push({ key: "ether", name: "Fill the tanks", txt: room > 1 ? "Adds " + Math.round(room) + " ether." : "The tanks are full.", price: price(room / 5), off: room <= 1, buy() {
    addEther(room, "Station");
  } });
  const pool = ["emit", "mini", "miss", "tank", "sgen", "coll", "hull", "eng", "pd", "mirror"].filter((t) => BT[t] && unlocked(t));
  for (let k = 0; k < (tr ? 1 : 2) && pool.length; k++) {
    const t = pool.splice(r() * pool.length | 0, 1)[0], key = "blk" + t, p = price(BT[t].cost * 3 + 12 + S.wave * 1.5);
    out.push({ key, name: "Mk II " + BT[t].name, txt: "A tougher " + BT[t].name.toLowerCase() + ", delivered to your shipyard tray.", price: p, off: !!(S.sold && S.sold[(tr ? "t" : "s") + o.id + key + Math.floor(S.wave / 5)]), sold: 1, buy() {
      (S.pend = S.pend || []).push(t);
      if (S.sold) S.sold[(tr ? "t" : "s") + o.id + key + Math.floor(S.wave / 5)] = 1;
      toast("A Mk II " + BT[t].name + " is in your shipyard tray (B).", 3600);
    } });
  }
  const bp = Object.keys(HEAVYH).filter((t) => BT[t] && !(S.bp && S.bp[t]) && S.hull < HEAVYH[t] && !(t in ULK && !unlocked(t) && false));
  if (bp.length) {
    const t = bp[r() * bp.length | 0];
    out.push({ key: "bp" + t, name: "Blueprint: " + BT[t].name, txt: "Lets you build the " + BT[t].name.toLowerCase() + " now, before your hull allows it.", price: price(Math.round(2.5 * BT[t].cost + 3 * S.wave)), off: false, buy() {
      (S.bp = S.bp || {})[t] = 1;
      toast("You can build the " + BT[t].name + " now.", 3600);
    } });
  }
  if (tr) {
    out.push({ key: "reroll", name: "Echo reroll", txt: "One more reroll for an Echo offer.", price: price(rerollCost()), off: false, buy() {
      S.rerolled = false;
      toast("You have a reroll again.", 2600);
    } });
  }
  return out;
}
function stBuy(key) {
  const w = S.win;
  if (!w) return;
  const o = w.kind === "tr" ? trader : stations[w.id];
  if (!o) return;
  const it = stOffers(o).find((q) => q.key === key);
  if (!it || it.off) return;
  if (S.scrap < it.price) {
    toast("That costs " + it.price + " scrap.", 1800);
    sfx("soon");
    return;
  }
  S.scrap -= it.price;
  it.buy();
  sfx("buy");
  if (w.kind === "st") {
    const g = Math.ceil(it.price / 30);
    if (g > 0) {
      o.rep += g;
      if (LOG) LOG.st.rep += g;
    }
    if (LOG) {
      LOG.st.buys++;
      LOG.st.spent += it.price;
    }
  } else if (LOG) {
    LOG.tr.buys++;
    LOG.tr.spent += it.price;
  }
  ev(w.kind === "tr" ? "trader" : "station", "bought " + it.name + " for " + it.price);
  stDraw();
}
function stDraw() {
  const w = S.win, el = $("stw");
  if (!w || !el) return;
  const o = w.kind === "tr" ? trader : stations[w.id];
  if (!o) {
    stClose();
    return;
  }
  const tr = w.kind === "tr", lvl = tr ? 0 : stLvl(o), next = REPN[lvl + 1], offers = stOffers(o);
  let h = '<div class="row"><b>' + (tr ? "The drifter" : o.name) + '</b><span class="hint">Scrap <b class="sc">' + Math.floor(S.scrap) + "</b></span></div>";
  if (!tr) {
    h += '<p class="hint">' + REPNAME[lvl] + " &middot; reputation " + Math.floor(o.rep) + (next ? " of " + next + " for the next step" : "") + " &middot; health " + Math.round(o.hp / o.hpMax * 100) + "%</p>";
    h += '<div class="bar thin"><i style="width:' + Math.min(100, 100 * (o.rep - REPN[lvl]) / Math.max(1, (next || o.rep + 1) - REPN[lvl])) + '%"></i></div>';
  } else h += '<p class="hint">A trader on the drift. It leaves in ' + Math.max(0, Math.round(o.left)) + " seconds.</p>";
  h += '<ul class="offers">' + offers.map((q) => '<li><button type="button" class="alt" data-buy="' + q.key + '"' + (q.off || S.scrap < q.price ? " disabled" : "") + "><b>" + q.name + "</b><small>" + q.txt + "</small><i>" + q.price + " scrap</i></button></li>").join("") + "</ul>";
  if (!tr) {
    if (lvl >= 1) h += stContractsHtml(o);
    else h += '<p class="hint">Contracts open at reputation ' + REPN[1] + ". Buying and saving the station earn it.</p>";
    if (lvl >= 2) {
      h += '<div class="row"><span>Waiting here: ' + Math.floor(o.sc) + " scrap, " + Math.floor(o.et) + ' ether</span><button type="button" class="alt" data-act="collect">Collect</button></div>';
      h += '<div class="row"><span>Miners: ' + (o.miners | 0) + " of " + mnMax(o) + ' (each draws ether from the field round the station)</span><button type="button" class="alt" data-act="mn"' + ((o.miners | 0) >= mnMax(o) || S.scrap < mnCost(o) ? " disabled" : "") + ">" + ((o.miners | 0) >= mnMax(o) ? "Full" : mnCost(o) + " scrap") + "</button></div>";
    } else h += '<p class="hint">At reputation ' + REPN[2] + " the station is yours: it makes scrap and ether and you collect them here.</p>";
    if (lvl >= 3) {
      const c = Math.round(120 * Math.pow(1.8, o.up) + S.wave * 6);
      h += '<div class="row"><span>Upgrade ' + (o.up + 1) + ' of 3: stronger guns and hull, bigger stores</span><button type="button" class="alt" data-act="up"' + (o.up >= 3 || S.scrap < c ? " disabled" : "") + ">" + (o.up >= 3 ? "Done" : c + " scrap") + "</button></div>";
    } else if (lvl >= 2) h += '<p class="hint">Upgrades open at reputation ' + REPN[3] + ".</p>";
  }
  h += '<div class="grp"><button type="button" id="stwClose">Undock (U)</button></div>';
  el.innerHTML = h;
  el.hidden = false;
}
function stAct(a) {
  const w = S.win;
  if (!w || w.kind !== "st") return;
  const o = stations[w.id];
  if (!o) return;
  if (a === "collect") {
    const sc = Math.floor(o.sc), room = Math.max(0, P.cap + S.haloMax - S.ether - S.halo), et = Math.min(Math.floor(o.et), Math.floor(room));
    if (sc < 1 && et < 1) {
      toast("Nothing to collect yet.", 1800);
      return;
    }
    S.scrap += sc;
    o.sc -= sc;
    o.et -= et;
    if (et > 0) addEther(et, "Station");
    sfx("buy");
    toast("Collected " + sc + " scrap and " + et + " ether.", 2600);
    if (LOG) {
      LOG.st.coll.sc += sc;
      LOG.st.coll.et += et;
    }
    ev("station", "collected " + sc + " scrap, " + et + " ether at " + o.name);
  } else if (a === "up" && o.up < 3) {
    const c = Math.round(120 * Math.pow(1.8, o.up) + S.wave * 6);
    if (S.scrap < c) return;
    S.scrap -= c;
    o.up++;
    o.hpMax = stHpMax(o);
    o.hp = o.hpMax;
    sfx("buy");
    toast(o.name + " is upgraded.", 2600);
    if (LOG) LOG.st.ups++;
    ev("station", o.name + " upgraded to " + o.up);
  } else if (a === "mn") {
    mnHire(o);
  } else if (a && (a.startsWith("ct") || a.startsWith("cx"))) {
    stContractAct(o, a);
  }
  stDraw();
}
function stTrader(dt) {
  if (trader) {
    trader.left -= dt;
    trader.x += trader.vx * dt;
    trader.y += trader.vy * dt;
    trader.a = Math.atan2(trader.vy, trader.vx);
    const away = S.dock && S.dock.o === trader ? false : Math.hypot(P.x - trader.x, P.y - trader.y) > 6e4;
    if (trader.left <= 0 || away) {
      if (S.dock && S.dock.o === trader) stClose();
      ev("trader", "left");
      trader.gone = true;
      trader = null;
    }
    return;
  }
  if (S.wave >= 9 && S.wave % 10 === 9 && S.trWave !== S.wave && waveLive <= 0 && !rifts.length) {
    S.trWave = S.wave;
    const a = rnd(0, TAU), d = rnd(5200, 7600);
    trader = { id: S.wave, x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, vx: rnd(-30, 30), vy: rnd(-30, 30), a: 0, left: 240, gone: false };
    if (corrAt(trader.x, trader.y) || kindAt(trader.x, trader.y) === "hollows") {
      trader.x = P.x - Math.cos(a) * d;
      trader.y = P.y - Math.sin(a) * d;
    }
    const h = hintsSeen || (hintsSeen = loadJSON("ew_hint") || {});
    toast(h.trader ? "A trader drifts in, about " + compass8(a) + " of you." : 'Bob: "A drifter trader, to the ' + compass8(a) + '. It sells for scrap. Fly close, press U and hold still."', 6e3, true);
    h.trader = 1;
    storeJSON("ew_hint", h);
    sfx("beacon");
    if (LOG) LOG.tr.seen++;
    ev("trader", "appeared " + compass8(a) + " of you at wave " + S.wave);
  }
}
const EVN = { derelict: "derelict", storm: "ether storm", beacon: "distress beacon" };
function evPlace(min, max) {
  for (let t = 0; t < 30; t++) {
    const a = rnd(0, TAU), d = rnd(min, max), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (Math.hypot(x, y) > WORLD * 0.92 || corrAt(x, y) || corrFree(x, y)) continue;
    return [x, y, a];
  }
  return null;
}
function stEvents(dt) {
  const W2 = S.wave;
  if (evt) {
    evt.t += dt;
    if (evt.k === "storm") stormStep(dt);
    else if (evt.k === "derelict") derelictStep(dt);
    else if (evt.k === "beacon") beaconStep(dt);
    return;
  }
  S.evT = (S.evT == null ? rnd(120, 200) : S.evT) - dt;
  if (W2 < 6 || S.evT > 0 || waveLive > 0 || rifts.length || S.dock && S.dock.ok) return;
  S.evT = rnd(240, 400);
  const opts = ["derelict", "storm", "beacon"].filter((k2) => k2 !== S.evLast);
  const k = opts[Math.random() * opts.length | 0];
  S.evLast = k;
  evStart(k);
}
function evStart(k) {
  const h = hintsSeen || (hintsSeen = loadJSON("ew_hint") || {});
  if (k === "storm") {
    evt = { k, t: 0, dur: 60, strike: 2 };
    S.storm = 1;
    toast(h.storm ? "An ether storm is rolling in." : 'Bob: "An ether storm. Collectors will love it. The lightning will not love you. Keep your shield up."', 5200, true);
    sfx("wave");
  } else {
    const p = evPlace(k === "derelict" ? 7e3 : 14e3, k === "derelict" ? 12e3 : 22e3);
    if (!p) {
      S.evT = 60;
      return;
    }
    if (k === "derelict") {
      evt = { k, t: 0, x: p[0], y: p[1], prog: 0, need: 10, done: false };
      toast(h.derelict ? "A derelict station is marked, about " + compass8(p[2]) + "." : 'Bob: "A derelict station, about ' + compass8(p[2]) + '. Dock beside it for ten seconds with nothing hostile near and it will give up its salvage."', 6e3, true);
    } else {
      evt = { k, t: 0, x: p[0], y: p[1], ans: 0, open: true, phase: 0, age: 0, ships: [], prog: 0 };
      showBeaconBox();
      sfx("beacon");
      toast(h.beacon ? "A distress beacon." : 'Bob: "A distress call! Press Y to answer, N to turn it down. It is a long way out."', 5200, true);
    }
  }
  h[k] = 1;
  storeJSON("ew_hint", h);
  if (LOG) (LOG.evs[k] = LOG.evs[k] || { n: 0, done: 0, paid: 0 }).n++;
  ev("event", EVN[k] + " started" + (evt.x != null ? " " + Math.round(Math.hypot(evt.x - P.x, evt.y - P.y) / 1e3) + "k away" : ""));
}
function evEnd(done, paid, msg) {
  if (!evt) return;
  const k = evt.k;
  if (LOG && done) {
    const q = LOG.evs[k] || (LOG.evs[k] = { n: 0, done: 0, paid: 0 });
    q.done++;
    q.paid += paid || 0;
  }
  ev("event", EVN[k] + (done ? " finished" : " ended") + (paid ? ", paid " + paid + " scrap" : ""));
  if (msg) toast(msg, 3600);
  if (k === "beacon") hideBeaconBox();
  evt = null;
  S.storm = 0;
}
function stormStep(dt) {
  S.storm = 1;
  if (evt.t >= evt.dur) {
    evEnd(true, 0, "The storm passes.");
    return;
  }
  evt.strike -= dt;
  if (evt.strike <= 0) {
    evt.strike = rnd(3, 5.5);
    const a = rnd(0, TAU), r = rnd(100, 500), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r;
    ring(x, y, 60, 420, 2);
    burst(x, y, 40, 320, 2, 0.7, 3);
    sfx("boom");
    S.flashT = 0.25;
    if ((x - P.x) ** 2 + (y - P.y) ** 2 < (P.radius + 160) ** 2 && !S.god && !P.form) {
      const dm = (8 + S.wave * 0.9) * 1, sa = Math.min(S.shield, dm);
      S.shield -= sa;
      const rest = dm - sa;
      if (rest > 0) spend(rest, "Storm lightning");
      S.lastHit = S.t;
      S.shake = Math.max(S.shake, 0.5);
      if (LOG) add(LOG.taken, "Storm lightning", dm);
    }
  }
}
const stormK = () => S.storm ? 1.8 : 1;
function derelictStep(dt) {
  const d = Math.hypot(P.x - evt.x, P.y - evt.y);
  if (evt.t > 420 && d > 8e3) {
    evEnd(false, 0, "The derelict drifted out of reach.");
    return;
  }
  if (d < 520 && !stBusy() && Math.hypot(P.vx, P.vy) < 260) {
    evt.prog += dt;
    if (evt.prog >= evt.need) {
      const pay = Math.round(40 + S.wave * 5);
      S.scrap += pay;
      dropMotes(evt.x, evt.y, 12, 1, 1);
      for (let k = 0; k < 2; k++) wrecks.push(mkWreck(evt.x + rnd(-300, 300), evt.y + rnd(-300, 300), true));
      sfx("buy");
      evEnd(true, pay, "Salvage done: +" + pay + " scrap, and some wrecks left behind.");
    }
  } else evt.prog = Math.max(0, evt.prog - dt * 0.5);
}
function showBeaconBox() {
  const b = $("evBox");
  if (!b) return;
  b.hidden = false;
  beaconText();
}
function hideBeaconBox() {
  const b = $("evBox");
  if (b) b.hidden = true;
}
function beaconText() {
  const b = $("evBox");
  if (!b || !evt || evt.k !== "beacon") return;
  const d = Math.hypot(evt.x - P.x, evt.y - P.y);
  b.innerHTML = evt.phase === 0 ? "<b>Distress beacon</b><span>About " + Math.round(d / 1e3) + "k away, " + compass8(Math.atan2(evt.y - P.y, evt.x - P.x)) + ".</span><span><kbd>Y</kbd> answer &nbsp; <kbd>N</kbd> turn it down</span>" : evt.phase === 1 ? "<b>Distress beacon</b><span>" + Math.round(d / 1e3) + "k away. The compass ring points to it.</span>" : "<b>Hostiles at the beacon</b><span>" + evt.ships.filter((e) => e.hp > 0).length + " left. Break them.</span>";
}
function beaconAnswer(yes) {
  if (!evt || evt.k !== "beacon" || evt.phase !== 0 || evt.t < 1) return false;
  if (yes) {
    evt.phase = 1;
    evt.t = 0;
    sfx("menuPick");
    ev("event", "beacon answered");
    beaconText();
  } else {
    evEnd(false, 0, "You turn the beacon down.");
  }
  return true;
}
function beaconStep(dt) {
  const d = Math.hypot(P.x - evt.x, P.y - evt.y);
  evt.age += dt;
  if (evt.phase === 0) {
    if (evt.age > 150) {
      evEnd(false, 0, "The beacon goes quiet.");
      return;
    }
    if (S.frame % 30 === 0) beaconText();
    return;
  }
  if (evt.phase === 1) {
    if (evt.age > 600) {
      evEnd(false, 0, "You took too long. The beacon is gone.");
      return;
    }
    if (d < 900) {
      evt.phase = 2;
      const n = 3 + Math.floor(S.wave / 8), types = ["gun", "dart", "mini", "rocket", "brute"];
      for (let k = 0; k < n; k++) {
        const a = rnd(0, TAU), r = rnd(900, 1300), e = mkEnemy(types[k % types.length], evt.x + Math.cos(a) * r, evt.y + Math.sin(a) * r);
        e.awake = true;
        e.raid = true;
        e.lt = 0;
        enemies.push(e);
        evt.ships.push(e);
        ring(e.x, e.y, 20, 160, 3);
      }
      toast("It was a trap: hostile ships close in on the beacon.", 3200);
      sfx("stalarm");
      ev("event", "beacon ambush: " + n + " ships");
      beaconText();
    } else if (S.frame % 30 === 0) beaconText();
    return;
  }
  evt.ships = evt.ships.filter((e) => e.hp > 0 && enemies.indexOf(e) >= 0);
  if (S.frame % 30 === 0) beaconText();
  if (!evt.ships.length) {
    const pay = Math.round(50 + S.wave * 6);
    S.scrap += pay;
    addEther(Math.min(P.cap * 0.5, 200), "Beacon");
    for (let k = 0; k < 2; k++) wrecks.push(mkWreck(evt.x + rnd(-300, 300), evt.y + rnd(-300, 300), true));
    sfx("buy");
    evEnd(true, pay, "The beacon is safe. +" + pay + " scrap.");
  }
}
function evTarget() {
  if (!evt) return null;
  if (evt.k === "beacon" && evt.phase >= 1 && evt.phase < 2) return [evt.x, evt.y, "#7bd3ff"];
  if (evt.k === "derelict") return [evt.x, evt.y, "#7bd3ff"];
  return null;
}
function stSave() {
  return { s: stations.map((s) => [s.id, Math.round(s.rep * 10) / 10, Math.round(s.hp), s.dead ? 1 : 0, s.up, Math.floor(s.sc), Math.floor(s.et), s.saved | 0, s.seen ? 1 : 0, s.miners | 0]), bp: Object.keys(S.bp || {}), pend: (S.pend || []).slice(0, 12), sold: Object.keys(S.sold || {}), ct: (S.ct || []).map((c) => ({ key: c.key, k: c.k, st: c.st, to: c.to, zi: c.zi, ci: c.ci, x: Math.round(c.x), y: Math.round(c.y), left: Math.round(c.left), pay: c.pay, rep: c.rep, name: c.name, from: c.from })), cd: Object.keys(S.ctDone || {}) };
}
function stLoad(a) {
  S.bp = {};
  S.sold = {};
  S.ct = [];
  S.ctDone = {};
  S.pend = [];
  if (!a || typeof a !== "object") return;
  if (Array.isArray(a.pend)) {
    for (const t of a.pend.slice(0, 12)) if (BT[t] && t !== "core") S.pend.push(t);
  }
  if (Array.isArray(a.ct)) {
    for (const c of a.ct.slice(0, 2)) if (c && CT_NAME[c.k] && stations[c.st | 0]) S.ct.push({ key: String(c.key), k: c.k, st: c.st | 0, to: c.to, zi: c.zi, ci: c.ci, x: +c.x || 0, y: +c.y || 0, left: Math.max(1, +c.left || 1), pay: +c.pay || 0, rep: +c.rep || 0, acc: S.t, name: String(c.name || ""), from: String(c.from || "") });
  }
  if (Array.isArray(a.cd)) for (const k of a.cd.slice(0, 200)) S.ctDone[String(k)] = 1;
  if (Array.isArray(a.bp)) {
    for (const t of a.bp) if (HEAVYH[t]) S.bp[t] = 1;
  }
  if (Array.isArray(a.sold)) for (const k of a.sold.slice(0, 200)) S.sold[String(k)] = 1;
  if (Array.isArray(a.s)) for (const q of a.s) {
    const s = stations[q[0] | 0];
    if (!s) continue;
    s.rep = Math.max(0, +q[1] || 0);
    s.up = clamp(q[4] | 0, 0, 3);
    s.hpMax = stHpMax(s);
    s.hp = clamp(+q[2] || s.hpMax, 1, s.hpMax);
    s.dead = !!q[3];
    if (s.dead) s.hp = 0;
    s.sc = Math.max(0, +q[5] || 0);
    s.et = Math.max(0, +q[6] || 0);
    s.saved = q[7] | 0;
    s.seen = !!q[8];
    s.miners = clamp(q[9] | 0, 0, 6);
  }
}
const CT_NAME = { deliver: "Deliver", camp: "Clear a camp", corr: "Clear the Corruption" };
const ctRepK = (s) => [1, 1, 1.15, 1.3][stLvl(s)];
function ctPay(k, d) {
  const w = S.wave;
  return k === "corr" ? 100 + w * 8 : k === "camp" ? 60 + w * 6 : 40 + w * 4 + Math.min(60, d / 1500);
}
function ctOffers(s) {
  if (stLvl(s) < 1) return [];
  const out = [], r = srng(7e3 + s.id * 17 + Math.floor(S.wave / 4)), taken = new Set((S.ct || []).map((c) => c.key)), done = S.ctDone || {};
  const others = stations.filter((o) => o !== s && !o.dead && Math.hypot(o.x - s.x, o.y - s.y) < 9e4).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y));
  if (others.length) {
    const o = others[r() * Math.min(3, others.length) | 0], d = Math.hypot(o.x - s.x, o.y - s.y);
    out.push({ key: "d" + s.id + ">" + o.id, k: "deliver", to: o.id, x: o.x, y: o.y, time: Math.round(300 + d / 18), pay: Math.round(ctPay("deliver", d) * ctRepK(s)), rep: 3, text: "Take a sealed crate to " + o.name + ", " + Math.round(d / 1e3) + "k away." });
  }
  let bz = null, bd = 1e12;
  for (const z of zones) {
    if (z.heart || z.base || z.fallen > -1e8 && S.t - z.fallen < 1200) continue;
    if (!enemies.some((e) => e.type === "station" && e.zone === zones.indexOf(z) && e.hp > 0)) continue;
    const d = Math.hypot(z.x - s.x, z.y - s.y);
    if (d < bd && d < 11e4) {
      bd = d;
      bz = z;
    }
  }
  if (bz) out.push({ key: "c" + s.id + "z" + zones.indexOf(bz), k: "camp", zi: zones.indexOf(bz), x: bz.x, y: bz.y, time: Math.round(600 + bd / 14), pay: Math.round(ctPay("camp", bd) * ctRepK(s)), rep: 5, text: "Break the pirate fortress " + Math.round(bd / 1e3) + "k " + compass8(Math.atan2(bz.y - s.y, bz.x - s.x)) + " of here." });
  let bc = null;
  bd = 1e12;
  for (const c of corrs) {
    if (c.off > 0) continue;
    const z = c.hearts.find((h) => h.main && !h.dead);
    if (!z) continue;
    const d = Math.hypot(z.x - s.x, z.y - s.y);
    if (d < bd) {
      bd = d;
      bc = [c, z];
    }
  }
  if (bc && S.wave >= 12) out.push({ key: "k" + s.id + "c" + corrs.indexOf(bc[0]), k: "corr", ci: corrs.indexOf(bc[0]), x: bc[1].x, y: bc[1].y, time: Math.round(900 + bd / 12), pay: Math.round(ctPay("corr", bd) * ctRepK(s)), rep: 10, text: "Destroy the main heart of the Corruption " + Math.round(bd / 1e3) + "k " + compass8(Math.atan2(bc[1].y - s.y, bc[1].x - s.x)) + " of here. It stops that part from spreading for a long while." });
  return out.filter((c) => !taken.has(c.key) && !done[c.key + "@" + Math.floor(S.wave / 4)]);
}
function ctTake(s, i) {
  const offers = ctOffers(s), c = offers[i];
  if (!c || stLvl(s) < 1) return;
  if ((S.ct || []).length >= 2) {
    toast("Two contracts at a time.", 2e3);
    sfx("soon");
    return;
  }
  (S.ct = S.ct || []).push({ key: c.key, k: c.k, st: s.id, to: c.to, zi: c.zi, ci: c.ci, x: c.x, y: c.y, left: c.time, pay: c.pay, rep: c.rep, acc: S.t, name: CT_NAME[c.k] + (c.k === "deliver" ? " to " + (stations[c.to] || { name: "?" }).name : ""), from: s.name });
  sfx("dock");
  toast("Contract: " + CT_NAME[c.k] + ". " + c.text, 5200);
  if (LOG) LOG.ct.taken++;
  ctBox();
  ev("contract", "taken from " + s.name + ": " + CT_NAME[c.k] + ", " + c.pay + " scrap, " + c.time + " s");
}
function ctDone(c, ok, why) {
  const s = stations[c.st], i = (S.ct || []).indexOf(c);
  if (i >= 0) S.ct.splice(i, 1);
  (S.ctDone = S.ctDone || {})[c.key + "@" + Math.floor(S.wave / 4)] = 1;
  if (ok) {
    S.scrap += c.pay;
    if (s) s.rep += c.rep;
    sfx("clear");
    toast("Contract done: " + c.name + ". +" + c.pay + " scrap" + (s ? ", reputation +" + c.rep + " with " + s.name : "") + ".", 4200);
    if (LOG) {
      LOG.ct.done++;
      LOG.ct.paid += c.pay;
      LOG.st.rep += c.rep;
    }
    ev("contract", "finished " + c.name + ", paid " + c.pay);
  } else {
    const fee = Math.round(10 + S.wave * 2), pay = Math.min(S.scrap, fee);
    S.scrap -= pay;
    if (s) s.rep = Math.max(0, s.rep - 5);
    sfx("stalarm");
    toast("Contract failed: " + c.name + " (" + why + "). " + pay + " scrap fee" + (s ? " and reputation -5 with " + s.name : "") + ".", 4800);
    if (LOG) {
      LOG.ct.failed++;
      LOG.ct.fees += pay;
    }
    ev("contract", "failed " + c.name + ": " + why);
  }
  ctBox();
  if (S.win) stDraw();
}
function ctEvent(kind, idx) {
  for (const c of (S.ct || []).slice()) {
    if (kind === "fortress" && c.k === "camp" && c.zi === idx) ctDone(c, true);
    else if (kind === "mainheart" && c.k === "corr" && c.ci === idx) ctDone(c, true);
  }
}
function ctStep(dt) {
  if (!S.ct || !S.ct.length) return;
  for (const c of S.ct.slice()) {
    c.left -= dt;
    if (c.k === "deliver") {
      const o = stations[c.to];
      if (!o || o.dead) {
        ctDone(c, false, "the station is gone");
        continue;
      }
      if (Math.hypot(P.x - o.x, P.y - o.y) < 450 && !P.form) {
        ctDone(c, true);
        continue;
      }
    }
    if (c.left <= 0) ctDone(c, false, "out of time");
  }
  if (S.frame % 30 === 0) ctBox();
}
function ctBox() {
  const b = $("ctBox");
  if (!b) return;
  const l = S.ct || [];
  b.hidden = !l.length;
  if (!l.length) return;
  b.innerHTML = "<b>Contracts</b>" + l.map((c) => {
    const d = Math.hypot(c.x - P.x, c.y - P.y), m = Math.floor(c.left / 60), s = String(Math.floor(c.left % 60)).padStart(2, "0");
    return "<span>" + c.name + ": " + (d < 1e4 ? (d / 1e3).toFixed(1) : Math.round(d / 1e3)) + "k, " + m + ":" + s + ", " + c.pay + " scrap</span>";
  }).join("");
}
function ctTargets() {
  return (S.ct || []).map((c) => [c.x, c.y, "#ffd27b"]);
}
function stContractsHtml(s) {
  const act = S.ct || [], offers = ctOffers(s);
  let h = "<h3>Contracts</h3>";
  h += act.length ? '<ul class="offers">' + act.map((c, i) => '<li><button type="button" class="alt" data-act="cx' + i + '"><b>' + c.name + "</b><small>From " + c.from + ". " + Math.round(c.left / 60) + " min left.</small><i>drop it</i></button></li>").join("") + "</ul>" : "";
  h += offers.length ? '<ul class="offers">' + offers.map((c, i) => '<li><button type="button" class="alt" data-act="ct' + i + '"' + (act.length >= 2 ? " disabled" : "") + "><b>" + CT_NAME[c.k] + "</b><small>" + c.text + " " + Math.round(c.time / 60) + " min.</small><i>" + c.pay + " scrap</i></button></li>").join("") + "</ul>" : '<p class="hint">Nothing on offer. It changes every few waves.</p>';
  return h;
}
function stContractAct(s, a) {
  if (a.startsWith("cx")) {
    const c = (S.ct || [])[+a.slice(2)];
    if (c) ctDone(c, false, "you dropped it");
    return;
  }
  ctTake(s, +a.slice(2));
}
const mnMax = (s) => 2 + s.up, mnCost = (s) => Math.round(80 * (s.miners + 1) + S.wave * 4);
function mnHire(s) {
  if (stLvl(s) < 2 || (s.miners | 0) >= mnMax(s)) return;
  const c = mnCost(s);
  if (S.scrap < c) {
    toast("A miner costs " + c + " scrap.", 1800);
    sfx("soon");
    return;
  }
  S.scrap -= c;
  s.miners = (s.miners | 0) + 1;
  sfx("buy");
  toast("A miner joins " + s.name + ".", 2600);
  if (LOG) {
    LOG.mn.hired++;
    LOG.mn.spent += c;
  }
  ev("miner", "hired at " + s.name + " for " + c);
}
function mnStep(s, dt) {
  const n = s.miners | 0;
  if (!n) return;
  const want = n * TUNE.minerRate * dt, room = Math.max(0, stCap(s, 1) - s.et);
  if (room <= 0) return;
  const got = drawFieldAt(s.x, s.y, Math.min(want, room));
  s.et += got;
  if (LOG) LOG.mn.ether += got;
}
function mnLose(s) {
  if (!(s.miners > 0)) return;
  s.miners--;
  toast("A miner at " + s.name + " was lost.", 3e3);
  sfx("stalarm");
  if (LOG) LOG.mn.lost++;
  ev("miner", "lost at " + s.name);
}
function drawMiners(vis) {
  for (const s of stations) {
    const n = s.miners | 0;
    if (s.dead || !n || !vis(s.x, s.y, 900)) continue;
    for (let i = 0; i < n; i++) {
      const a = S.t * 0.35 + i * 2.1 + s.ph, r = 520 + 90 * Math.sin(S.t * 0.7 + i), x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = "#e8c35a";
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(16, 18);
      ctx.lineTo(-16, 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}
function drawStations(vis) {
  const t = S.t;
  for (const s of stations) {
    if (!vis(s.x, s.y, 500)) continue;
    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.dead) {
      ctx.strokeStyle = "rgba(138,145,156,.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const a = i * 1.3 + s.ph;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
        ctx.lineTo(Math.cos(a + 0.5) * 210, Math.sin(a + 0.5) * 210);
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }
    const lvl = stLvl(s), col = lvl >= 2 ? "#7bf0b0" : "#7bd3ff", under = s.att.length > 0, pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + s.ph);
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.05 + 0.03 * pulse + (s.hit > 0 ? 0.12 : 0);
    ctx.beginPath();
    ctx.arc(0, 0, 330, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.2 * pulse + (under ? 0.3 : 0);
    ctx.strokeStyle = under ? "#ff7b7b" : col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 330, 0, TAU);
    ctx.stroke();
    ctx.rotate(t * 0.12 + s.ph);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#cfd8e6";
    ctx.fillStyle = "#1a2230";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 210, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
      ctx.lineTo(Math.cos(a) * 205, Math.sin(a) * 205);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.PI / 6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 210, Math.sin(a) * 210, 15, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + 4 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    if (s.hp < s.hpMax - 1) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(s.x - 120, s.y + 360, 240, 10);
      ctx.fillStyle = under ? "#ff7b7b" : col;
      ctx.fillRect(s.x - 120, s.y + 360, 240 * clamp(s.hp / s.hpMax, 0, 1), 10);
    }
    const dp = Math.hypot(P.x - s.x, P.y - s.y);
    if (dp < 4e3) {
      ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.85;
      ctx.textAlign = "center";
      ctx.font = '700 22px "Atkinson Hyperlegible",sans-serif';
      ctx.fillText(s.name, s.x, s.y - 380);
      ctx.font = '400 16px "Atkinson Hyperlegible",sans-serif';
      ctx.fillText(REPNAME[lvl] + (dp < DOCK_R ? " · U to dock" : ""), s.x, s.y - 355);
      ctx.globalAlpha = 1;
    }
  }
  for (const b of stBeams) {
    ctx.strokeStyle = "#bff3ec";
    ctx.globalAlpha = clamp(b.t / 0.14, 0, 1);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (trader && vis(trader.x, trader.y, 200)) {
    ctx.save();
    ctx.translate(trader.x, trader.y);
    ctx.rotate(trader.a);
    ctx.fillStyle = "#2a3447";
    ctx.strokeStyle = "#e8c35a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 0);
    ctx.lineTo(-70, 60);
    ctx.lineTo(-100, 0);
    ctx.lineTo(-70, -60);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8c35a";
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.beginPath();
    ctx.arc(-20, 0, 12, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.fillStyle = C.ink;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = "center";
    ctx.font = '700 20px "Atkinson Hyperlegible",sans-serif';
    ctx.fillText("Drifter trader", trader.x, trader.y - 110);
    if (Math.hypot(P.x - trader.x, P.y - trader.y) < DOCK_R) {
      ctx.font = '400 15px "Atkinson Hyperlegible",sans-serif';
      ctx.fillText("U to dock", trader.x, trader.y - 88);
    }
    ctx.globalAlpha = 1;
  }
  if (evt && evt.x != null && vis(evt.x, evt.y, 600)) {
    ctx.save();
    ctx.translate(evt.x, evt.y);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    if (evt.k === "derelict") {
      ctx.strokeStyle = "#8a919c";
      ctx.lineWidth = 5;
      ctx.rotate(0.3);
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0.4, 5.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-90, -40);
      ctx.lineTo(70, 50);
      ctx.moveTo(30, -110);
      ctx.lineTo(-20, 90);
      ctx.stroke();
      ctx.rotate(-0.3);
      if (evt.prog > 0) {
        ctx.strokeStyle = "#7bd3ff";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 230, -Math.PI / 2, -Math.PI / 2 + TAU * evt.prog / evt.need);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(123,211,255,.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 520, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (evt.k === "beacon") {
      ctx.strokeStyle = "#ffb36b";
      ctx.fillStyle = "#ffb36b";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (1 - (t * 0.7 + i / 3) % 1) * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 40 + (t * 0.7 + i / 3) % 1 * 320, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.7 + 0.3 * pulse;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  drawMiners(vis);
  const d = S.dock;
  if (d && !d.ok) {
    ctx.strokeStyle = "#7bd3ff";
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(P.x, P.y, P.radius + 70, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(d.t / DOCK_T, 0, 1));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (S.storm) {
    const w = W / zoom / 2 + 200, h = H / zoom / 2 + 200;
    ctx.fillStyle = "rgba(123,211,255," + (0.04 + 0.04 * Math.sin(t * 2.4)).toFixed(3) + ")";
    ctx.fillRect(cam.x - w, cam.y - h, w * 2, h * 2);
  }
}
function drawEvArrow(R) {
  const list = [evTarget()].concat(ctTargets()).filter(Boolean);
  for (const q of list) evArrow(R, q);
}
function evArrow(R, q) {
  const a = Math.atan2(q[1] - P.y, q[0] - P.x);
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = q[2];
  ctx.beginPath();
  ctx.moveTo(P.x + Math.cos(a) * (R + 16), P.y + Math.sin(a) * (R + 16));
  ctx.lineTo(P.x + Math.cos(a + 0.13) * (R - 4), P.y + Math.sin(a + 0.13) * (R - 4));
  ctx.lineTo(P.x + Math.cos(a - 0.13) * (R - 4), P.y + Math.sin(a - 0.13) * (R - 4));
  ctx.closePath();
  ctx.fill();
  const d = Math.hypot(q[0] - P.x, q[1] - P.y);
  ctx.font = '700 11px "Atkinson Hyperlegible",sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((d / 1e3).toFixed(1) + "k", P.x + Math.cos(a) * (R + 34), P.y + Math.sin(a) * (R + 34));
  ctx.restore();
}
function drawStationMarks(g, o, X, Y, ok, u) {
  g.save();
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const s of stations) {
    if (!ok(s.x, s.y)) continue;
    if (!s.seen && !SET.all) continue;
    g.fillStyle = s.dead ? "#8a919c" : s.att.length ? "#ff7b7b" : stLvl(s) >= 2 ? "#7bf0b0" : "#7bd3ff";
    g.beginPath();
    g.arc(X(s.x), Y(s.y), (o.mini ? 4 : 6) * u, 0, TAU);
    g.fill();
    if (!o.mini) {
      g.font = "700 " + Math.round(12 * u) + 'px "Atkinson Hyperlegible",sans-serif';
      g.fillText(s.dead ? "ruin" : s.name, X(s.x), Y(s.y) + 16 * u);
    }
  }
  if (trader && ok(trader.x, trader.y)) {
    g.fillStyle = "#e8c35a";
    g.beginPath();
    g.moveTo(X(trader.x), Y(trader.y) - 6 * u);
    g.lineTo(X(trader.x) + 5 * u, Y(trader.y) + 5 * u);
    g.lineTo(X(trader.x) - 5 * u, Y(trader.y) + 5 * u);
    g.closePath();
    g.fill();
  }
  if (evt && evt.x != null && (evt.k !== "beacon" || evt.phase >= 1) && ok(evt.x, evt.y)) {
    g.strokeStyle = "#ffb36b";
    g.lineWidth = 2 * u;
    g.beginPath();
    g.arc(X(evt.x), Y(evt.y), 6 * u, 0, TAU);
    g.stroke();
  }
  for (const c of S.ct || []) {
    if (ok(c.x, c.y)) {
      g.strokeStyle = "#ffd27b";
      g.lineWidth = 2 * u;
      g.beginPath();
      g.arc(X(c.x), Y(c.y), 7 * u, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(X(c.x), Y(c.y), 2 * u, 0, TAU);
      g.stroke();
    }
  }
  g.restore();
}
function stationsCodex() {
  $("echoLHead").textContent = "Stations and contracts";
  const li = (t, b) => '<li style="--ec:#7bd3ff">' + (b ? "<b>" + b + "</b>" : "") + "<span>" + t + "</span></li>";
  $("echoLBody").innerHTML = li("Fixed places in the world, one in about three regions. Fly close, press U and hold still for three seconds with nothing hostile within 1,500. They sell mending, ether, Mk II blocks and blueprints for scrap.", "Stations") + li("Each station keeps its own reputation with you. It rises when you buy, when you save the station from an attack and when you finish its contracts. Known (6): contracts. Yours (20): it makes scrap and ether, and you can hire miners. Partner (45): upgrades.", "Reputation") + li("Ground the Corruption has eaten sends corrupted ships at the stations on it. Beat them to save it. A station with no health left is destroyed for good.", "Attacks") + li("Deliver a crate to another station, break a pirate fortress, or destroy the main heart of a part of the Corruption. Two at a time, with a clock. Failing costs reputation and a scrap fee.", "Contracts") + li("A drifter trader comes by about every ten waves. Events: a derelict to salvage, an ether storm and a distress beacon (Y answers, N turns it down).", "Others");
  show("echoL", true);
}
