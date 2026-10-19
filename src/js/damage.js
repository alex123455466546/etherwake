function damageBlock(o, b, x, y, dmg) {
  if (o.copy) {
    damageCopyBlock(o, b, x, y, dmg);
    return;
  }
  b.hp -= dmg;
  S.lastHit = S.t;
  S.shake = Math.max(S.shake, 0.5);
  sfx("hurt");
  burst(x, y, 10, 170, 5, 0.5, 2.6);
  if (b.hp > 0) return;
  if (b.t === "core") {
    gameOver();
    return;
  }
  const idx = o.blocks.indexOf(b);
  if (idx < 0) return;
  const p0 = pool();
  o.blocks.splice(idx, 1);
  burst(x, y, 40, 230, 5, 0.9, 3.4);
  burst(x, y, 20, 160, 2, 0.5, 2.6);
  sfx("lost");
  if (o === P && !b.ghost) S.wLost = (S.wLost || 0) + 1;
  toast(b.ghost ? "A stand-in breaks" : "Lost: " + BT[b.t].name.toLowerCase());
  if (!b.ghost) {
    S.st.lost++;
    if (LOG) {
      LOG.row.lost++;
      add(LOG.lostT, BT[b.t].name, 1);
      ev("lost", BT[b.t].name + " at " + b.x + "," + b.y);
    }
  }
  if (b.t === "dtank" && !b.ghost && !EKC.steady) {
    sfx("pop", x, y);
    const e0 = S.ether;
    S.ether = Math.max(0, S.ether - BT.dtank.cap * S.fill);
    logEther("Dense tank burst", S.ether - e0, 0);
    burst(x, y, 80, 340, 1, 1, 3.2);
  }
  if (b.ghost) {
    b.slot.on = false;
    b.slot.cd = 5;
  } else {
    P.slots.push({ x: b.x, y: b.y, t: b.t, rot: b.rot | 0, fc: b.fc | 0, on: false, cd: 2.5 });
    if ((b.upg | 0) >= 2) {
      const rf = Math.floor(b.upg / 2);
      S.scrap += rf;
      giveScrapText(rf, "upgrade refund");
    }
  }
  if (!b.ghost) noteLoss();
  const p1 = pool();
  recalc();
  const over = p1 - pool();
  if (over > 0) logEther("Tank overflow", -over, 0);
  if (p0 - pool() > 0.5) spill(x, y, p0 - pool());
}
function secSync() {
  const per = S.smax / 3;
  if (!S.sec) {
    const f = S.smax > 0 ? S.shield / S.smax : 0;
    S.sec = [f, f, f];
  }
  const tot = (S.sec[0] + S.sec[1] + S.sec[2]) * per;
  if (S.shield > tot + 1e-6) {
    let gap = (S.shield - tot) / per;
    for (const i of [0, 1, 2].sort((a, b) => S.sec[a] - S.sec[b])) {
      const add2 = Math.min(1 - S.sec[i], gap);
      S.sec[i] += add2;
      gap -= add2;
    }
  } else if (S.shield < tot - 1e-6 && tot > 1e-6) {
    const k = S.shield / tot;
    for (let i = 0; i < 3; i++) S.sec[i] *= k;
  }
}
function shieldTake(src, dmg) {
  const d = DTYPE[src], en = d === 1 ? TUNE.shieldEnergy : 1;
  if (!SET.shieldSec || !(S.smax > 0)) {
    S.shield = Math.max(0, S.shield - dmg * en);
    return;
  }
  secSync();
  const per = S.smax / 3;
  let want = dmg * en * (d === 0 ? TUNE.secReinf : 1);
  const i = d == null ? 2 : d;
  let a = Math.min(S.sec[i] * per, want);
  S.sec[i] -= a / per;
  want -= a;
  for (let j = 0; j < 3 && want > 1e-6; j++) {
    if (j === i) continue;
    a = Math.min(S.sec[j] * per, want * TUNE.secCross);
    S.sec[j] -= a / per;
    want -= a / TUNE.secCross;
  }
  S.shield = Math.max(0, (S.sec[0] + S.sec[1] + S.sec[2]) * per);
}
function hurt(o, x, y, dmg, force, src) {
  if (o.copy) return hurtCopy(o, x, y, dmg, force, src);
  if (S.god) return true;
  if (o === P) {
    dmg *= S.cookMul;
    if (o === P && P.form) {
      logHit(src, dmg, 0);
      spend(dmg * 1.6, "Hits in ether form");
      S.lastHit = S.t;
      S.shake = 0.4;
      burst(x, y, 12, 170, 0, 0.4, 2.6);
      return true;
    }
    if (S.halo > 0) {
      sfx("shield");
      const a = Math.min(S.halo, dmg * TUNE.haloShare);
      S.halo -= a;
      if (S.halo <= 0) sfx("hbreak");
      logEther("Halo took hits", -a, 0);
      logHit(src, a, 0);
      dmg -= a;
      S.lastHit = S.t;
      burst(x, y, 10, 200, 0, 0.5, 2.6);
      if (dmg <= 0.01) return true;
    }
    if (S.shield > 0) {
      logHit(src, dmg, 0);
      sfx("shield");
      shieldTake(src, dmg);
      if (S.shield <= 0) sfx("sbreak");
      S.lastHit = S.t;
      burst(x, y, 8, 150, 6, 0.35, 2.4);
      return true;
    }
  }
  const c = Math.cos(-o.a), sn = Math.sin(-o.a), lx = (x - o.x) * c - (y - o.y) * sn, ly = (x - o.x) * sn + (y - o.y) * c, gx = Math.round(lx / CELL), gy = Math.round(ly / CELL);
  if (o === P && !P.form) {
    const left = shellHit(lx, ly, dmg, force);
    if (left < dmg) {
      logHit(src, dmg - left, 0);
      sfx("shield");
      burst(x, y, 6, 160, 2, 0.3, 2.4);
      S.lastHit = S.t;
      if (left <= 0.01) return true;
      dmg = left;
    }
  }
  let b = blockAt(gx, gy, o);
  if (!b && force) {
    let bd = 1e9;
    for (const q of o.blocks) {
      const d = (q.x - gx) ** 2 + (q.y - gy) ** 2;
      if (d < bd) {
        bd = d;
        b = q;
      }
    }
  }
  if (!b) return false;
  const dtp = DTYPE[src];
  if (dtp != null) {
    dmg *= armMul(b.t, dtp);
    if (LOG) add(LOG.dtk, DTNAME[dtp] + (ARM[b.t] ? " on " + BT[b.t].name : ""), dmg);
  }
  if (o === P && PK("hp") !== 1) dmg /= PK("hp");
  logHit(src, dmg, dmg);
  damageBlock(o, b, x, y, dmg);
  return true;
}
function hitNum(e, d, w) {
  if (d <= 0) return;
  if (e.hit0 == null) e.hit0 = S.t;
  if (LOG) {
    add(LOG.dealt, w, d);
    if (LOG.row) {
      LOG.row.dl += d;
      if (w === "Missiles") LOG.row.dm += d;
    }
  }
  if (SET.dmgNum === "off") return;
  if (SET.dmgNum === "each") {
    floatText(e.x, e.y - e.r - 12, String(Math.max(1, Math.round(d))));
    return;
  }
  if (!e.acc) e.accT = 0.22;
  e.acc = (e.acc || 0) + d;
}
function floatText(x, y, txt, dim, big) {
  if (floats.length < (SET.dmgNum === "each" ? 120 : 60)) floats.push({ x: x + rnd(-8, 8), y, t: big ? 1.3 : 0.9, txt, dim, big });
}
function explode(b) {
  burst(b.x, b.y, 46, 300, b.f ? 0 : 3, 0.7, 3.4);
  burst(b.x, b.y, 20, 180, 2, 0.4, 2.8);
  sfx(b.f ? "mhit" : "boom", b.x, b.y, b.ch || 1);
  S.shake = Math.max(S.shake, 0.3);
  let n = 0;
  if (b.f) for (const e of enemies) {
    const q = Math.hypot(e.x - b.x, e.y - b.y), T = ET[e.type];
    if (q < 80 + e.r) {
      let qa = Math.atan2(b.y - e.y, b.x - e.x) - e.a;
      qa = Math.atan2(Math.sin(qa), Math.cos(qa));
      const mul = T.boss && e.ph === 0 ? 0 : b.dmg * (T.front ? 0.6 : 1) * hitMul(e, qa) * (T.boss ? TUNE.ventMiss : 1);
      let d = 0;
      if (mul > 0) {
        const near = e.blocks.map((k) => {
          const w = blockWorld(e, k);
          return [k, Math.hypot(w[0] - b.x, w[1] - b.y)];
        }).filter((h) => h[1] < 85 * (b.bl || 1)).sort((u, v) => u[1] - v[1]).slice(0, 3);
        near.forEach((h, i) => {
          d += hurtEnemy(e, h[0], mul * (i ? 0.6 : 1), 0);
        });
      }
      if (d > 0) n++;
      hitNum(e, d, "Missiles");
      S.st.dmg[2] += d;
      e.flash = 0.1;
      wakeEnemy(e);
    }
  }
  return n;
}
function bombHit(bm) {
  burst(bm.x, bm.y, 90, 340, 3, 0.9, 3.6);
  burst(bm.x, bm.y, 40, 220, 2, 0.7, 3);
  sfx("boom");
  if (S.over) return;
  const hit = [];
  bombCopies(bm);
  for (const o of [P]) for (const b of o.blocks) {
    const [wx, wy] = wpos(o, b);
    if ((wx - bm.x) ** 2 + (wy - bm.y) ** 2 < bm.r * bm.r) hit.push([o, b, wx, wy]);
  }
  if (!hit.length || S.god) return;
  if (P.form) {
    logHit(bm.src, bm.dmg * 3, 0);
    spend(bm.dmg * 3, "Hits in ether form");
    return;
  }
  let total = bm.dmg * S.cookMul * hit.length * EK("bomb");
  S.lastHit = S.t;
  S.shake = 0.9;
  const all = total;
  let a = Math.min(S.halo, total * TUNE.haloShare);
  S.halo -= a;
  logEther("Halo took hits", -a, 0);
  total -= a;
  a = Math.min(S.shield, total);
  S.shield -= a;
  total -= a;
  logHit(bm.src, all, total);
  if (LOG) {
    LOG.bombsLand++;
    LOG.row.bl++;
    LOG.bombBlocks += hit.length;
    LOG.bombDmg += all;
    LOG.bombSoak += all - total;
  }
  if (total > 0) {
    const each = total / hit.length;
    for (const h of hit) {
      if (S.over) break;
      damageBlock(h[0], h[1], h[2], h[3], each);
    }
  }
}
function gameOver() {
  S.over = true;
  sfx("lost");
  storeJSON("ew_save", null);
  burst(P.x, P.y, 260, 420, 0, 1.6, 4);
  burst(P.x, P.y, 160, 300, 2, 1.2, 3);
  burst(P.x, P.y, 120, 240, 5, 1.8, 4);
  const best = Math.max(S.best, S.wave), st = S.st, tm = lgT, dm = st.dmg[0] + st.dmg[1] + st.dmg[2];
  if (S.wave > S.best && !S.dev) storeJSON("ew_best", S.wave);
  if (!S.dev) {
    const eh = loadJSON("ew_echo") || [];
    eh.unshift({ name: hullName(), wave: S.wave, blocks: P.blocks.filter((b) => !b.ghost).map((b) => ({ x: b.x, y: b.y, t: b.t, r: b.rot || void 0, c: b.fc || void 0 })) });
    storeJSON("ew_echo", eh.slice(0, 3));
  }
  if (LOG) {
    LOG.end = "Core destroyed on wave " + S.wave + (LOG.lastBy ? ", last hit by " + LOG.lastBy : "");
    ev("death", LOG.end);
    logSnap();
    persistLog();
    autoFile("death");
    runFile("death");
  }
  $("oStat").textContent = "You reached wave " + S.wave + "." + (S.dev ? " A dev run, so no records were kept." : S.wave > S.best && S.best ? " A new best." : "");
  const rows = [
    ["Ships broken", S.kills],
    ["Wardens destroyed", st.boss],
    ["Time survived", tm(st.time)],
    ["Ether gathered", Math.round(st.harv)],
    ["Damage dealt", Math.round(dm)],
    ["Most used weapon", dm > 0 ? ["Laser", "Minigun", "Missiles"][st.dmg.indexOf(Math.max(st.dmg[0], st.dmg[1], st.dmg[2]))] : "None"],
    ["Blocks lost", st.lost],
    ["Time in the Hollows", tm(st.hol)],
    ["Best wave", best],
    ["Difficulty", heatName()],
    ["Ship line", LINES[S.pick] ? LINES[S.pick].name : "-"],
    ["World seed", S.seed]
  ];
  if (st.far > 0) {
    const fb = Math.max(+loadJSON("ew_far") || 0, S.dev ? 0 : Math.round(st.far));
    if (!S.dev) storeJSON("ew_far", fb);
    rows.push(["Farthest out", Math.round(st.far).toLocaleString("en") + " past the edge (best " + fb.toLocaleString("en") + ")"]);
  }
  for (const id of S.newAch || []) rows.push(["Found", ACH[id]]);
  {
    const hr = heatRecord(), n = heatOf();
    $("oHeat").hidden = false;
    $("oHeat").textContent = heatName() + (n ? ": " + pactList().join(", ") : "") + ". " + (S.dev ? "" : S.wave > hr.prev ? "A new best at this Heat (before: " + (hr.prev || "none") + ")." : "Best at this Heat: wave " + hr.prev + ".");
    if (LOG) ev("heat", heatName() + (n ? " (" + pactList().join(", ") + ")" : "") + ", wave " + S.wave);
  }
  runCatalogue(rows);
  $("oList").innerHTML = rows.map((q) => "<dt>" + q[0] + "</dt><dd>" + q[1] + "</dd>").join("");
  show("boss", false);
  show("tip", false);
  setTimeout(() => {
    $("over").hidden = false;
  }, 900);
}
