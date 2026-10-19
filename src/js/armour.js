const DTYPE = { sniper: 2, carrier: 1, reflection: 1, dart: 2, mini: 2, brute: 2, ram: 2, gun: 1, bulwark: 1, warden: 1, station: 1, heart: 1, leech: 1, jammer: 1, beacon: 1, rocket: 0, bomber: 0 };
const ARM = { hard: { stops: 2, weak: 1 }, blast: { stops: 0, weak: 2 }, mirror: { stops: 1, weak: 0 } };
const armMul = (t, dt) => {
  const a = ARM[t];
  return !a || dt == null ? 1 : dt === a.stops ? TUNE.armourStop : dt === a.weak ? TUNE.armourWeak : 1;
};
const DTNAME = ["explosive", "energy", "kinetic"];
const COUNTER = ["blast", "mirror", "hard"], COUNTER_NAME = { blast: "blast armour", mirror: "mirror armour", hard: "hardened plate" };
function noteWaveMix() {
  S.mixHist.push(S.dealt.slice());
  if (S.mixHist.length > 5) S.mixHist.shift();
  S.dealt = [0, 0, 0];
  const tot = [0, 0, 0];
  for (const h of S.mixHist) for (let i = 0; i < 3; i++) tot[i] += h[i];
  const sum = tot[0] + tot[1] + tot[2];
  if (sum <= 0) return;
  let best = 0;
  for (let i = 1; i < 3; i++) if (tot[i] > tot[best]) best = i;
  const share = tot[best] / sum, target = clamp(TUNE.counterSlope * (share - 1 / 3), 0, TUNE.counterMax + (pactOn("armour") ? 0.1 : 0));
  const srt = tot.slice().sort((a, b) => b - a), mixedArms = EKC.mixed && (srt[0] - srt[1]) / sum < EKC.mixed;
  const stp = TUNE.counterStep * (pactOn("armour") ? 2 : 1) * EK("poker");
  S.armT = COUNTER[best];
  S.armShare = S.armShare + clamp((mixedArms ? 0 : target) - S.armShare, -stp, stp);
  S.pdWant = tot[0] / sum > 0.5;
  if (LOG) {
    LOG.adapt.push([S.wave, S.armT, Math.round(S.armShare * 100), Math.round(share * 100)]);
  }
}
function armourize(cells, n) {
  if (n < 10) return;
  const hull = cells.filter((c) => c.t === "hull").sort((a, b) => b.x * b.x + b.y * b.y - (a.x * a.x + a.y * a.y));
  if (S.armT && S.armShare > 0.02) {
    const k = Math.round(hull.length * 0.6 * Math.min(1, S.armShare / TUNE.counterMax) * 1);
    for (let i = 0; i < Math.min(k, hull.length); i++) hull[i].t = S.armT;
  }
  if (S.pdWant && n >= 60) {
    const inner = cells.filter((c) => c.t === "hull").slice(0, 6);
    for (let i = 0; i < Math.min(1 + Math.floor(n / 60), inner.length); i++) inner[i].t = "pd";
  }
}
function stepPD(dt) {
  if (!P.pds.length || P.form || S.over) return;
  const rate = Math.min(P.pds.length * (1 / 0.4) * Math.min(1, S.pw[2] + 0.2), TUNE.pdMax);
  S.pdAcc = Math.min(2, (S.pdAcc || 0) + rate * dt);
  while (S.pdAcc >= 1) {
    let tg = null, bd = TUNE.pdRange * TUNE.pdRange, isBomb = false;
    for (const b of bombs) {
      const d = (b.x - P.x) ** 2 + (b.y - P.y) ** 2;
      if (d < bd) {
        bd = d;
        tg = b;
        isBomb = true;
      }
    }
    if (!tg) {
      for (const b of bolts) if (b.m && !b.f) {
        const d = (b.x - P.x) ** 2 + (b.y - P.y) ** 2;
        if (d < bd) {
          bd = d;
          tg = b;
          isBomb = false;
        }
      }
    }
    if (!tg || pool() < TUNE.pdCost) {
      S.pdAcc = Math.min(S.pdAcc, 1);
      break;
    }
    S.pdAcc--;
    spend(TUNE.pdCost, "Point defence");
    sfx("shield");
    if (isBomb) {
      tg.pd = (tg.pd || 0) + 1;
      burst(tg.x, tg.y, 3, 120, 0, 0.2, 2);
      if (tg.pd >= 6) {
        burst(tg.x, tg.y, 16, 180, 0, 0.4, 2.6);
        bombs.splice(bombs.indexOf(tg), 1);
        if (LOG) {
          LOG.pd.mine++;
          LOG.pd.bombs++;
          LOG.row.pdb++;
        }
      }
    } else {
      burst(tg.x, tg.y, 10, 200, 0, 0.4, 2.6);
      bolts.splice(bolts.indexOf(tg), 1);
      if (LOG) {
        LOG.pd.mine++;
        LOG.pd.mis++;
        LOG.row.pdm++;
      }
    }
  }
}
function stepEnemyPD(dt) {
  if (!bolts.length) return;
  for (const e of enemies) {
    if (!e.pd || !e.awake) continue;
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      if (!(b.f && b.m)) continue;
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < TUNE.pdRange * TUNE.pdRange && Math.random() < e.pd * dt * 2.2 * TUNE.pdEnemy) {
        burst(b.x, b.y, 10, 200, 3, 0.4, 2.6);
        bolts.splice(i, 1);
        if (LOG) LOG.pd.theirs++;
      }
    }
  }
}
function jam(e, dt) {
  if ((e.jt = (e.jt || 0) - dt) > 0) return;
  e.jt = 5;
  let n = 0;
  for (const b of bolts) if (b.f && b.m && (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < 9e4) {
    b.tg = e;
    n++;
  }
  if (n) {
    ring(e.x, e.y, 24, 160, 3);
    sfx("clang", e.x, e.y);
  }
}
function assignSections() {
  for (const b of P.blocks) {
    b.sec = 0;
    b.dark = false;
  }
  const live = P.blocks.filter((b) => b.t === "score" && !b.ghost), dead = P.slots.filter((q2) => q2.t === "score" && !q2.on);
  if (!live.length && !dead.length) return;
  const cm = cellMap(P.blocks);
  const nb = (b) => {
    const out = [];
    for (const [cx, cy] of footOf(b)) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = cm.get(cx + d[0] + "," + (cy + d[1]));
      if (n && n !== b) out.push(n);
    }
    return out;
  };
  const seen = /* @__PURE__ */ new Map(), q = [];
  const seed = (b, s) => {
    if (!b || b.ghost || seen.has(b)) return;
    seen.set(b, s);
    b.sec = s;
    q.push(b);
  };
  const core = P.blocks.find((b) => b.t === "core");
  seed(core, 0);
  live.forEach((b, i) => seed(b, i + 1));
  dead.forEach((s, i) => {
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seed(cm.get(s.x + d[0] + "," + (s.y + d[1])), 100 + i);
  });
  for (let k = 0; k < q.length; k++) {
    const b = q[k];
    for (const n of nb(b)) if (!seen.has(n) && !n.ghost) {
      seen.set(n, seen.get(b));
      n.sec = seen.get(b);
      q.push(n);
    }
  }
  for (const b of P.blocks) if (b.sec >= 100) b.dark = true;
}
const scoreCount = () => P.blocks.filter((b) => b.t === "score").length + P.slots.filter((q) => q.t === "score").length;
const canUp = (b) => !!b && !b.ghost && !b.frame && b.t !== "core" && !!BT[b.t].cost && (b.mk || 1) < 3;
const upCost = (b) => BT[b.t].cost * ((b.mk || 1) === 1 ? 2 : 4);
const upPrio = (b) => b.t === "sensor" || b.t === "pd" ? 3 : b.t === "coll" || b.t === "hcoll" || b.t === "carray" || JOBOF[b.t] === "gun" || JOBOF[b.t] === "coll" ? 0 : JOBOF[b.t] === "drive" || BT[b.t].k === "hull" ? 1 : 2;
function applyUp(b) {
  const mk = b.mk || 1, cost = BT[b.t].cost * (mk === 1 ? 2 : 4), old = maxHp(b);
  S.scrap -= cost;
  b.paid = (b.paid || 0) + cost;
  b.upg = (b.upg || 0) + cost;
  b.mk = mk + 1;
  b.hp += maxHp(b) - old;
  if (LOG) {
    LOG.upg.n++;
    LOG.upg.scrap += cost;
  }
  ev("build", "upgraded a " + BT[b.t].name + " to Mk " + (mk === 1 ? "II" : "III"));
  return cost;
}
function areaUpgrade(list) {
  if (!guard()) return;
  const c = list.filter(canUp);
  if (!c.length) {
    deny("Nothing there can be upgraded.");
    return;
  }
  const total = c.reduce((s, b) => s + upCost(b), 0), order = c.slice().sort((a, b) => upPrio(a) - upPrio(b) || upCost(a) - upCost(b));
  let n = 0, spent = 0;
  for (const b of order) {
    if (S.scrap < upCost(b)) continue;
    spent += applyUp(b);
    n++;
  }
  if (!n) {
    deny("Upgrading " + c.length + " blocks costs " + total + " scrap. You have " + S.scrap + ".");
    return;
  }
  sfx("place");
  recalc();
  buildInfo("Upgraded " + n + " of " + c.length + " blocks for " + spent + " scrap" + (n < c.length ? "; the other " + (c.length - n) + " need " + (total - spent) + " more (collectors and weapons first, then thrusters and armour, then the rest)." : "."));
}
function upgradeBlock(b) {
  if (!b || b.ghost || b.frame || b.t === "core" || !BT[b.t].cost) {
    deny("That cannot be upgraded.");
    return;
  }
  if (!guard()) return;
  const mk = b.mk || 1;
  if (mk >= 3) {
    deny("Already Mk III.");
    return;
  }
  const cost = BT[b.t].cost * (mk === 1 ? 2 : 4);
  if (S.scrap < cost) {
    deny("Mk " + (mk === 1 ? "II" : "III") + " costs " + cost + " scrap.");
    return;
  }
  applyUp(b);
  sfx("place");
  recalc();
  buildInfo(BT[b.t].name + " is now Mk " + (mk === 1 ? "II" : "III") + ". It costs " + cost + " scrap, and if it breaks the rebuild brings it back at Mk I, with about half of its " + b.upg + " upgrade scrap returned.");
}
function selectRail() {
  if (!P.rails.length) {
    toast("No rail gun fitted. It is a heavy block, from the Frigate.", 2e3);
    return;
  }
  S.railSel = !S.railSel;
  if (!S.railSel) railCancel(true);
  toast(S.railSel ? "Rail gun selected. Hold fire to charge, let go to shoot." : "Rail gun stowed", 2e3);
  sfx("hold");
}
function railCancel(refund) {
  const R = S.rail;
  if (R.on && refund && R.spent > 0) {
    addEther(R.spent * 0.5, "Rail refund");
    if (LOG) LOG.rail.spent += R.spent * 0.5;
  }
  R.on = false;
  R.c = 0;
  R.spent = 0;
  R.hold = 0;
}
function stepRail(dt) {
  const R = S.rail;
  if (S.railBeam) S.railBeam.t -= dt;
  if (!S.railSel || !P.rails.length || P.form) {
    if (R.on) railCancel(true);
    return false;
  }
  const trig = mouse.down || keys.Space;
  if (trig && !R.on) {
    if (pool() < TUNE.railMin * P.realCap) {
      if (!(R.warnT > S.t)) {
        R.warnT = S.t + 1.5;
        toast("Not enough ether to charge the rail gun.", 1400);
      }
      return false;
    }
    R.on = true;
    R.c = 0;
    R.spent = 0;
    R.hold = 0;
    R.p0 = pool();
    R.top = false;
  }
  if (!R.on) return false;
  if (trig) {
    R.c += dt;
    const target = 0.8 * R.p0;
    if (R.spent < target - 0.01) {
      const amt = Math.min(target * dt / TUNE.railTime, target - R.spent, Math.max(0, pool() - 0.5));
      if (amt > 0) {
        spend(amt, "Rail gun");
        R.spent += amt;
      }
    } else {
      R.hold += dt;
      R.top = (S.patch == null ? 1 : S.patch) > 0.1;
      if (R.hold >= TUNE.railHold) railFire();
    }
  } else railFire();
  return true;
}
function railFire() {
  const R = S.rail;
  R.on = false;
  if (R.spent < 0.2 * R.p0 - 0.01) {
    addEther(R.spent * 0.5, "Rail refund");
    if (LOG) LOG.rail.spent += R.spent * 0.5;
    R.c = 0;
    R.spent = 0;
    R.hold = 0;
    toast("Too weak to fire. Hold longer.", 1400);
    return;
  }
  const eff = R.spent + (R.hold > 0 && R.top ? 0.05 * R.p0 : 0), dmg = TUNE.railK * Math.pow(eff, TUNE.railPow) * (S.mood === 1 ? 1.15 : 1) * TUNE.railBuff * DK() * EK("rail"), b0 = P.rails[0], [bx, by] = wpos(P, b0);
  const mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom;
  let rel = Math.atan2(my - P.y, mx - P.x) - P.a;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  rel = clamp(rel, -TUNE.railArc, TUNE.railArc);
  const a = P.a + rel, ax = Math.cos(a), ay = Math.sin(a), L = 4200;
  const hits = [], cf = clamp(R.spent / (0.8 * R.p0), 0, 1), half = TUNE.railHalf0 + TUNE.railHalf1 * cf;
  for (const e of enemies) {
    const bl = [];
    for (const k of e.blocks) {
      const [wx, wy] = blockWorld(e, k), al = (wx - bx) * ax + (wy - by) * ay, pd = Math.abs((wx - bx) * -ay + (wy - by) * ax);
      if (al > 0 && al < L && pd < half) bl.push([k, al]);
    }
    if (bl.length) {
      bl.sort((u, v) => u[1] - v[1]);
      hits.push([e, bl]);
    }
  }
  hits.sort((u, v) => u[1][0][1] - v[1][0][1]);
  let rem = dmg, dealt = 0, ships = 0;
  for (const [e, bl] of hits) {
    if (rem <= 1) break;
    const T = ET[e.type];
    if (T.boss && e.ph === 0 && !TUNE.railThroughShell) continue;
    let sd = 0, sr = e.resistRail ? Math.min(rem, e.max * 0.1) : rem;
    for (const [k] of bl) {
      if (sr <= 1) break;
      const d = hurtEnemy(e, k, sr, 2, true);
      sr -= d;
      sd += d;
    }
    dealt += sd;
    hitNum(e, sd, "Rail gun");
    if (SET.dmgNum !== "off") floatText(e.x, e.y - 26, String(Math.round(sd)), false, true);
    e.flash = 0.15;
    wakeEnemy(e);
    rem *= 1 - TUNE.railPass;
    ships++;
  }
  S.st.dmg[1] += dealt;
  S.railBeam = { x1: bx, y1: by, x2: bx + ax * L, y2: by + ay * L, t: 0.7, d: 0.7 };
  S.shake = Math.max(S.shake, 0.8);
  sfx("rail");
  if (ships > 0) S.hitStop = 0.07;
  else {
    floatText(bx + ax * 260, by + ay * 260, "MISS", true, true);
    toast("Rail shot missed. Aim it at a ship.", 1600, false);
  }
  burst(bx, by, 60, 500, 2, 0.5, 3.4);
  ring(bx, by, 30, 300, 0);
  if (LOG) {
    LOG.rail.n++;
    LOG.rail.spent += R.spent;
    LOG.rail.dmg += dealt;
    LOG.rail.ships += ships;
  }
  ev("rail", Math.round(dmg) + " damage, " + Math.round(dealt) + " dealt, " + ships + " ships");
  P.vx -= ax * 120;
  P.vy -= ay * 120;
  R.c = 0;
  R.spent = 0;
  R.hold = 0;
}
