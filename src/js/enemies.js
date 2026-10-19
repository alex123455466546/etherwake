const tierOf = (w) => w >= TUNE.tierWaves[2] ? 3 : w >= TUNE.tierWaves[1] ? 2 : w >= TUNE.tierWaves[0] ? 1 : 0;
function partsOf(type, tier) {
  const p = {};
  for (let i = 0; i < tier; i++) Object.assign(p, PARTS[type][i]);
  delete p.cells;
  delete p.name;
  return p;
}
function mkEnemy(type, x, y, zone, tier, n, echo) {
  const T = ET[type];
  tier = tier == null ? tierOf(S.wave) : clamp(tier | 0, 0, 3);
  const e = {
    type,
    tier,
    x,
    y,
    vx: 0,
    vy: 0,
    a: rnd(0, TAU),
    hp: 1,
    max: 1,
    cd: rnd(0.6, 2),
    zone: zone == null ? -1 : zone,
    hx: x,
    hy: y,
    r: T.r,
    flash: 0,
    awake: zone == null,
    side: Math.random() < 0.5 ? 1 : -1,
    ph: 0,
    pt: 7,
    vol: 0,
    dashT: rnd(2, 6),
    woke: zone == null,
    or: rnd(150, 420),
    ow: rnd(0.12, 0.25) * (Math.random() < 0.5 ? 1 : -1),
    op: rnd(0, TAU),
    lt: 0,
    launch: 0,
    look: null,
    hurt: false,
    ret: false
  };
  if (ROLE[type] === "flank") e.side = flankN++ % 2 ? 1 : -1;
  e.p = partsOf(type, tier);
  buildShip(e, n || (type === "warden" ? 44 : type === "station" ? 72 : type === "heart" ? 115 : rollSize("small")), echo);
  return e;
}
const dirK = () => S.dirK || 1;
const dirCap = (base) => Math.min(TUNE.dirTop, base + TUNE.dirLateStep * Math.max(0, S.wave - TUNE.dirLateFrom));
const hSteady = () => TUNE.hStart + (1 - TUNE.hStart) * clamp(S.wave / TUNE.hWaves, 0, 1);
const HK = () => clamp(hSteady() * (1 + (S.hAd || 0)), 0.3, 1.2);
function handicapStep(core, lost, fight) {
  if (S.wave < 5) return;
  const was = S.hAd || 0;
  let ad = was * 0.85;
  if (core < 0.6 || lost >= 3) ad = was + 0.04;
  else if (core >= 1 && lost === 0 && fight < 45) ad = was - 0.03;
  S.hAd = clamp(ad, -TUNE.hAdMax, TUNE.hAdMax);
  if (LOG) (LOG.hand = LOG.hand || []).push([S.wave, HK()]);
  if (LOG) ev("handicap", "wave " + S.wave + ": steady " + hSteady().toFixed(2) + ", adaptive " + (S.hAd >= 0 ? "+" : "") + (S.hAd * 100).toFixed(1) + "% -> h " + HK().toFixed(2));
}
const enemyFq = (e, T) => T.cd >= 0.9 && !T.boss && !T.bomb && !T.missile && !T.snipe && !T.station && !T.heart && !T.railBoss ? TUNE.fireQ : 1;
function directorStep() {
  if (typeof corrWave === "function") corrWave();
  const fight = S.t - (S.wT0 || S.t), core = S.wMinCore == null ? 1 : S.wMinCore, lost = S.wLost || 0;
  handicapStep(core, lost, fight);
  if (S.wave < TUNE.dirStart) return;
  let d = 0;
  if (core < 0.6 || lost >= 3) d = -0.12;
  else if (core >= 1 && lost === 0) d = TUNE.dirUp;
  else if (core >= 0.85 && lost <= 1) d = 0.03;
  const was = dirK(), cap = dirCap(S.st && S.st.lost > 0 ? TUNE.dirMax : TUNE.dirMaxEarly);
  S.dirK = clamp(was + d, 1, cap);
  ev("director", "wave " + S.wave + ": core low " + Math.round(core * 100) + "%, " + lost + " blocks lost, fight " + Math.round(fight) + " s -> next wave x" + S.dirK.toFixed(2));
  if (Math.abs(S.dirK - was) > 1e-6) planWave();
}
const diffK = () => SET.diff * (SET.diff > 1.2 ? 1 + TUNE.harshWave * S.wave : 1);
const clock = () => Math.min(1.8, 1 + TUNE.clockK * (S.st && S.st.time || 0) / 60);
const enemyDmg = (e) => ET[e.type].dmg * (1 + S.wave * TUNE.dmgPerWave) * TUNE.tierDmg[e.tier] * diffK() * (e.capK ? 1.25 : 1) * clock() * (1 + (dirK() - 1) * 0.5);
const atkSet = /* @__PURE__ */ new Set();
function atkToken(e) {
  const T0 = ET[e.type];
  if (T0 && (T0.boss || T0.railBoss || T0.bomb) || e.duel) return true;
  if (e.tok > S.t) return true;
  for (const x of atkSet) if (x.tok <= S.t) atkSet.delete(x);
  if (atkSet.size >= TUNE.atkPool + Math.floor(S.wave / 4)) return false;
  e.tok = S.t + TUNE.atkHold;
  atkSet.add(e);
  return true;
}
function stepWarn(e, T, dd, dt) {
  const sn = !!T.snipe, w = sn ? { w: 26, k: 2.4, cdn: T.cd } : { w: 42, k: 5, cdn: 9 };
  if (e.wFlash > 0) e.wFlash -= dt;
  if (e.wT > 0) {
    e.wT -= dt;
    if (e.wT <= 0) {
      fireLine(e, w);
      e.wCd = w.cdn * rnd(0.9, 1.2);
    }
    return;
  }
  e.wCd = (e.wCd == null ? rnd(1.5, 4) : e.wCd) - dt;
  if (e.wCd <= 0 && dd < (sn ? T.range : 1100) && !e.ret && !e.look && !P.form) {
    e.wT = 2;
    e.wA = Math.atan2(P.y + P.vy * 0.45 - e.y, P.x + P.vx * 0.45 - e.x);
    e.wW = w.w;
    e.fired = true;
    sfx("aimline");
  }
}
function fireLine(e, w) {
  const a = e.wA, ux = Math.cos(a), uy = Math.sin(a), dx = P.x - e.x, dy = P.y - e.y, al = dx * ux + dy * uy, pd = Math.abs(-dx * uy + dy * ux);
  e.wFlash = 0.3;
  const hit = al > 0 && al < 2600 && pd < w.w + P.radius * 0.6 && !P.form;
  if (LOG) {
    const k = e.duel ? "duel ship" : e.type, q = LOG.eline[k] || (LOG.eline[k] = { n: 0, h: 0 });
    q.n++;
    if (hit) q.h++;
    if (e.duel) ev("eline", "duel rail gun " + (hit ? "hit you" : "missed") + " (wave " + S.wave + ")");
  }
  if (hit) hurt(P, P.x - ux * P.radius * 0.7, P.y - uy * P.radius * 0.7, enemyDmg(e) * w.k, true, e.type);
  S.shake = Math.max(S.shake, 0.5);
  sfx("boss", e.x, e.y);
}
function killEnemy(i) {
  const e = enemies[i], T = ET[e.type];
  if (LOG) {
    if (e.zone >= 0 && !e.woke) LOG.asleep++;
    if (e.raid) LOG.raid.killed++;
  }
  if (T.heart) heartFell(e);
  else if (T.station) fortressFell(e);
  if (e.capK) captainDown(e);
  if (LOG) {
    LOG.acted.n++;
    if (e.fired) LOG.acted.f++;
  }
  if (e.duel) {
    storeJSON("ew_duel", 1);
    ev("duel", "the challenger fell after " + Math.round(S.t - (LOG ? LOG.row.t0 : 0)) + " s");
  }
  if (e.acc > 0) floatText(e.x, e.y - e.r - 12, String(Math.max(1, Math.round(e.acc))));
  burst(e.x, e.y, 50 + e.r, 260, 3, 0.9, 3.4);
  burst(e.x, e.y, 30, 200, 0, 0.9, 2.8);
  burst(e.x, e.y, 14, 120, 2, 0.4, 2.6);
  dropMotes(e.x, e.y, Math.round(Math.max(0, e.eth) * (S.mood === 1 ? 1.5 : 1) / 2), 2, 0, "Kills");
  dropMotes(e.x, e.y, Math.round(Math.max(T.scrap, Math.round(T.scrap * Math.pow(e.n0 / Math.max(4, T.cells.length || 4), 0.75))) * TUNE.killScrapK), 1, 1);
  if (e.n0 >= 28) for (let k = 0; k < Math.min(4, Math.floor(e.n0 / 40) + 1); k++) wrecks.push(mkWreck(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), true));
  if (LOG) {
    const k = e.hit0 == null ? 0 : S.t - e.hit0;
    add(LOG.kills, T.name, 1);
    add(LOG.ttk, T.name, k);
    LOG.row.kills++;
    LOG.row.ttk += k;
  }
  S.kills++;
  sfx("kill", e.x, e.y);
  S.shake = Math.max(S.shake, 0.35);
  if (e.p.blast) {
    bombs.push({ x: e.x, y: e.y, t: 0.45, max: 0.45, r: 95, dmg: enemyDmg(e) * 0.25, src: e.type });
    logBomb();
    sfx("bombw");
  }
  if (T.boss) {
    S.st.boss++;
    S.scrap += 6;
    S.shake = 1;
    burst(e.x, e.y, 220, 420, 3, 1.6, 4);
  }
  if (e.wave) {
    waveLive--;
    if (waveLive <= 0 && !rifts.length) {
      const wasDuel = S.duel;
      directorStep();
      if (LOG) {
        LOG.row.clear = S.t;
        logStatus("after");
      }
      ev("wave", "cleared " + S.wave + " in " + Math.round(S.t - (LOG ? LOG.row.t0 : 0)) + " s");
      waveT = (GAP_OF[curKind] || 25) * (S.biome === "bloom" ? 0.75 : 1) * gapK();
      S.scrap += 2;
      S.duel = false;
      planWave();
      noteWaveMix();
      const fresh = Object.keys(ULK).filter((t) => ULK[t] === S.wave && S.best < S.wave && !SET.all).map((t) => BT[t].name);
      toast(T.boss ? "Warden destroyed. Wave " + S.wave + " cleared." : fresh.length ? "Wave " + S.wave + " cleared. Unlocked: " + fresh.join(", ") : "Wave " + S.wave + " cleared. Press B to rebuild.", 3600);
      sfx("clear");
      if (fresh.length) sfx("unlock");
      if (wasDuel && !S.over) echoOffer(e.type);
      save();
    }
  }
  enemies[i] = enemies[enemies.length - 1];
  enemies.pop();
}
function checkStuckWave(dt) {
  if (waveLive <= 0 || rifts.length || enemies.some((e) => e.wave)) {
    S.stuckW = 0;
    return;
  }
  if ((S.stuckW = (S.stuckW || 0) + dt) < 8) return;
  S.stuckW = 0;
  ev("wave", "wave " + S.wave + " had no ships left but was counted live (" + waveLive + "): ended");
  waveLive = 0;
  directorStep();
  if (LOG) {
    LOG.row.clear = S.t;
    logStatus("after");
  }
  waveT = (GAP_OF[curKind] || 25) * (S.biome === "bloom" ? 0.75 : 1) * gapK();
  S.duel = false;
  planWave();
  noteWaveMix();
  save();
}
function callWave() {
  sfx("skip");
  const bonus = S.hold ? 0 : Math.ceil(waveT / 5), pay = waveT * (3 + P.coll * 0.55 * S.dens * S.pw[3]);
  S.hold = false;
  S.scrap += bonus;
  S.skip = { t: 0.7, max: 0.7, left: pay, total: pay, wt: waveT };
  if (LOG) {
    LOG.row.call = pay;
    logStatus("N");
  }
  ev("wave", "N skip, " + Math.round(waveT) + " s left");
  floatText(P.x, P.y - P.radius - 30, "+" + Math.round(pay) + " ether");
  sfx("warp");
  toast(bonus ? "Time skip. +" + bonus + " scrap" : "Time skip", 1800);
}
function stepSkip(dt) {
  const k = S.skip;
  if (!k) return;
  const d = Math.min(k.left, k.total * dt / k.max);
  if (d > 0) {
    addEther(d, "Time skip");
    k.left -= d;
  }
  k.t -= dt;
  waveT = Math.max(0, k.wt * k.t / k.max);
  for (let n = cnt(6); n > 0; n--) {
    const a = rnd(0, TAU), q = P.radius + rnd(160, 320);
    spawn(P.x + Math.cos(a) * q, P.y + Math.sin(a) * q, P.vx - Math.cos(a) * q * 2.2, P.vy - Math.sin(a) * q * 2.2, 0.45, 2.4, Math.random() < 0.5 ? 0 : 6);
  }
  if (k.t <= 0) {
    if (k.left > 0) addEther(k.left, "Time skip");
    S.skip = null;
    waveT = 0;
    sfx("whoosh");
    sfx("chime");
  }
}
function riftIn(type, a, d, t, n, q) {
  let x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
  if (Math.hypot(x, y) > WORLD - 300) {
    a += Math.PI;
    x = P.x + Math.cos(a) * d;
    y = P.y + Math.sin(a) * d;
  }
  rifts.push({ x, y, t, type, n, q });
  return a;
}
function toughenZones() {
  for (const e of enemies) if (e.zone >= 0) {
    e.tier = tierOf(S.wave);
    e.p = partsOf(e.type, e.tier);
    if (e.base && zones[e.zone]) {
      e.baseK = baseK(zones[e.zone]);
      e.hpK = 3 * e.baseK;
    }
    rescaleShip(e);
  }
}
function startWave() {
  if (!nextWave.length) planWave();
  S.wave++;
  curKind = nextKind;
  S.wMinSh = 1;
  S.wMinTk = 1;
  S.wMinCore = 1;
  S.wLost = 0;
  S.wT0 = S.t;
  const base = rnd(0, TAU);
  let an = base;
  toughenZones();
  const list = nextWave.slice();
  for (const q of list) if (q.duel) q.n = Math.max(24, Math.round(allBlocks().filter((b) => !b.ghost).length * q.k));
  if (S.biome === "bloom") {
    const sm = list.filter((q) => !ET[q.type].boss && !q.duel && q.n < 30), n = Math.round(list.length * 0.2);
    for (let i = 0; i < n && sm.length; i++) list.push(Object.assign({}, sm[Math.random() * sm.length | 0]));
  }
  S.duel = curKind === "duel" || curKind === "bossduel";
  if (S.duel) {
    for (const e of enemies) if (!e.wave) {
      if (e.zone >= 0) {
        e.ret = true;
        e.look = null;
      } else if (e.raid) e.lt = 99;
    }
  }
  list.forEach((q, i) => {
    const part = q.part | 0, side = S.wave >= 25 ? part * 2.1 : i % 2 && S.wave > 3 ? 2.2 : 0;
    an = riftIn(q.type, base + side + rnd(-0.22, 0.22), Math.max(900, Math.hypot(W, H) / 2 / zoom) + rnd(150, 350) + (ET[q.type].range >= 500 ? rnd(300, 600) : 0), 1.6 + i * 0.08 + part * TUNE.partGap, q.n, q);
  });
  waveLive = list.length;
  ev("wave", "start " + S.wave + " (" + curKind + "), " + waveLive + " ships, " + list.reduce((s2, q) => s2 + q.n, 0) + " blocks");
  nextWave = [];
  sfx(curKind === "flagship" || S.duel ? "boss" : "wave");
  logStatus("before");
  logRow();
  const N = compass8(an), lead = curKind === "flagship" ? "A Warden leads wave " : curKind === "bossduel" ? "The Warden comes alone. Wave " : curKind === "duel" ? "A challenger. Wave " : "Wave ";
  toast(lead + S.wave + (curKind === "battle" ? " (a battle)" : curKind === "skirmish" ? " (a skirmish)" : curKind === "siege" ? " (a siege: they all come at once)" : "") + ", inbound from the " + N, 3400);
}
function updRifts(dt) {
  for (let i = rifts.length - 1; i >= 0; i--) {
    const q = rifts[i];
    q.t -= dt;
    for (let n = cnt(1); n > 0; n--) {
      const a = rnd(0, TAU), d = rnd(30, 70);
      spawn(q.x + Math.cos(a) * d, q.y + Math.sin(a) * d, -Math.cos(a) * d * 1.5 - Math.sin(a) * 60, -Math.sin(a) * d * 1.5 + Math.cos(a) * 60, 0.6, 2.6, 3);
    }
    if (q.t <= 0) {
      const eq = q.q || {}, e = mkEnemy(q.type, q.x, q.y, null, void 0, q.n, eq.echo ? echoCells(eq.echo.blocks, q.n) : null);
      e.wave = true;
      if (eq.corrupt) {
        e.corrupt = true;
        e.tier = Math.min(3, e.tier + 1);
        e.name = "Corrupted " + ET[e.type].name;
      }
      if (eq.duel) {
        e.duel = true;
        e.name = "The challenger";
        e.p.turn = 0.6;
        e.tier = Math.min(3, e.tier + 1);
        e.hpK = TUNE.duelHp;
        rescaleShip(e);
      }
      if (eq.siege) e.siege = true;
      if (eq.echo) e.name = "Echo of your " + eq.echo.name + ", wave " + eq.echo.wave;
      if (eq.elite) for (let k = 0; k < 2; k++) {
        const c = e.blocks[Math.random() * e.blocks.length | 0], d = [[1, 0], [-1, 0], [0, 1], [0, -1]][k * 2 % 4 + (Math.random() < 0.5 ? 1 : 0)];
        if (c && !e.cell.has(c.x + d[0] + "," + (c.y + d[1]))) {
          e.blocks.push({ x: c.x + d[0], y: c.y + d[1], t: "hull", hp: blockHp("hull"), mh: blockHp("hull"), g: 0 });
          e.max += blockHp("hull");
          e.hp += blockHp("hull");
          reindex(e);
        }
      }
      enemies.push(e);
      sfx("warp");
      ring(q.x, q.y, 30, 200, 3);
      rifts.splice(i, 1);
    }
  }
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.t -= dt;
    for (let n = cnt(1.5); n > 0; n--) {
      const a = rnd(0, TAU);
      spawn(b.x + Math.cos(a) * b.r, b.y + Math.sin(a) * b.r, -Math.cos(a) * 50, -Math.sin(a) * 50, 0.4, 2.4, 3);
    }
    if (b.t <= 0) {
      bombHit(b);
      bombs.splice(i, 1);
    }
  }
}
function updEnemies(dt) {
  const fog = 1 - 0.3 * (S.cloud || 0);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], T = ET[e.type];
    if (e.hp <= 0) {
      killEnemy(i);
      continue;
    }
    e.flash -= dt;
    e.buff = (e.buff || 0) - dt;
    e.blkT = (e.blkT || 0) - dt;
    if (e.acc > 0 && (e.accT -= dt) <= 0) {
      floatText(e.x, e.y - e.r - 12, String(Math.max(1, Math.round(e.acc))));
      e.acc = 0;
    }
    const dx = P.x - e.x, dy = P.y - e.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd, engF = e.eng0 ? Math.max(0.15, e.eng / e.eng0) : 1;
    if (!e.awake && e.zone >= 0 && dd < sightOf(e)) wakeGroup(e.zone, P.x, P.y, false);
    if (!e.awake && dd > 6e3) {
      if (e.hp <= 0) killEnemy(i);
      continue;
    }
    if (e.awake && !S.over) {
      let ax, ay;
      if (T.boss) {
        if (e.shell0 > 0 && e.shell <= 0 && e.ph === 0) {
          e.ph = 1;
          e.pt = 1e9;
          ev("boss", "the shell is gone");
        }
        const near = e.ph === 0 && S.pri[3] > 0 && dd < reach() + e.r;
        e.pt -= dt * (near ? 3 : 1);
        if (near) for (let n = cnt(3); n > 0; n--) {
          const a = rnd(0, TAU);
          spawn(e.x + Math.cos(a) * (e.r + 10), e.y + Math.sin(a) * (e.r + 10), dx / 0.6, dy / 0.6, 0.6, 2.8, 3);
        }
        if (e.ph === 1 && Math.random() < dt * 5) dropMotes(e.x, e.y, 1, 3, 0, "Warden vents");
        if (e.pt <= 0) {
          e.ph = 1 - e.ph;
          e.pt = e.ph ? e.p.spine ? 3.5 : 4.5 : 7;
          ring(e.x, e.y, 70, 320, e.ph ? 0 : 3);
          sfx(e.ph ? "shopen" : "shclose", e.x, e.y);
          if (e.ph) toast("The Warden vents. Hit it now.", 1800);
          else {
            if (e.hangar > 0) {
              for (let k = 0; k < 2; k++) riftIn("dart", rnd(0, TAU), rnd(500, 700), 1.2);
              waveLive += 2;
            }
            if (e.p.crown) {
              riftIn("beacon", rnd(0, TAU), rnd(500, 700), 1.4);
              waveLive++;
            }
          }
        }
      }
      let sx = ux, sy = uy, sd = dd;
      if (e.look) {
        if (dd < sightOf(e) || S.t > e.look.t) e.look = null;
        else {
          sx = e.look.x - e.x;
          sy = e.look.y - e.y;
          sd = Math.hypot(sx, sy) || 1;
          sx /= sd;
          sy /= sd;
          if (sd < 350) e.look = null;
        }
      }
      if (!T.boss && !T.station) {
        if (!e.hurt && e.hp < e.max * TUNE.hurtBelow) e.hurt = true;
        else if (e.hurt && e.hp >= e.max * TUNE.hurtBack) e.hurt = false;
        if (e.hurt && e.flash < -3) healEnemy(e, e.max * 0.015 * dt);
      }
      if (e.zone >= 0) {
        const hd = Math.hypot(e.x - e.hx, e.y - e.hy);
        if (!e.ret) {
          if (dd > TUNE.leashFar && hd > TUNE.leashHome && S.biome !== "reach") {
            if ((e.lt += dt) > TUNE.leashT) {
              e.ret = true;
              ev("leash", "a " + T.name + " gave up and went home");
            }
          } else e.lt = 0;
        } else if (dd < sightOf(e) * 0.8) e.ret = false;
        else if (hd < 400) {
          e.ret = false;
          if (dd > sightOf(e)) e.awake = false;
        }
      } else if (e.raid) {
        if (dd > TUNE.leashFar || Math.hypot(P.x, P.y) > WORLD) {
          if ((e.lt += dt) > TUNE.leashT) {
            enemies.splice(i, 1);
            continue;
          }
        } else e.lt = 0;
      }
      if (e.launch > 0) {
        e.launch -= dt;
        ax = ay = 0;
      } else if (e.ret) {
        const hx = e.hx - e.x, hy = e.hy - e.y, hl = Math.hypot(hx, hy) || 1;
        ax = hx / hl;
        ay = hy / hl;
      } else if (T.station) {
        ax = ay = 0;
      } else {
        const v = steer(e, T, sx, sy, sd, fog);
        ax = v[0];
        ay = v[1];
        if (e.duel && !T.boss && dd < T.range * 1.6 + 300) {
          if (!e.duelInit) {
            e.duelInit = 1;
            e.cd = Math.min(e.cd || 0, 0.8);
            e.sdir = Math.random() < 0.5 ? -1 : 1;
            e.flipT = rnd(1.4, 2.6);
          }
          e.flipT -= dt;
          if (e.hitT > (e.hitSeen || -1) && S.t - e.hitT < 0.3 && S.t - (e.hitAt || -9) > 1.2) {
            e.hitSeen = e.hitT;
            e.hitAt = S.t;
            if (Math.random() < 0.6) e.flipT = 0;
          }
          if (e.flipT <= 0) {
            e.sdir = -e.sdir;
            e.flipT = rnd(1.4, 2.6);
          }
          ax += -sy * e.sdir * 0.8;
          ay += sx * e.sdir * 0.8;
        }
      }
      e.vx += ax * T.sp * engF * 2.4 * dt;
      e.vy += ay * T.sp * engF * 2.4 * dt;
      const gunLead = T.range && !T.missile && !T.bomb && !T.boss && !T.leech && !e.look && !e.ret, travel = e.ret || e.look, faceA = travel ? Math.atan2(ay || sy, ax || sx) : gunLead ? leadAim(e, 430) : Math.atan2(dy, dx);
      const tr = (T.turn || 4) * (e.p.turn || 1);
      let da = faceA - e.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      e.a += clamp(da, -tr * dt, tr * dt);
      e.cd -= dt * (e.buff > 0 ? 1.7 : 1);
      if (T.snipe || T.railBoss || e.duel && S.wave >= 60 && !T.boss) stepWarn(e, T, dd, dt);
      if (e.type === "reflection") {
        e.pulseT = (e.pulseT == null ? 10 : e.pulseT) - dt;
        if (e.pulseT <= 0 && dd < 4e3 && e.core) {
          e.pulseT = 16;
          if (typeof corrPulse === "function") corrPulse(e.x, e.y);
        }
        if (!e.splitDone && e.hp < e.max * 0.55) {
          e.splitDone = true;
          for (let i2 = 0; i2 < 3; i2++) {
            const a3 = i2 * TAU / 3 + rnd(0, 1), s2 = mkEnemy("gun", e.x + Math.cos(a3) * e.r * 1.4, e.y + Math.sin(a3) * e.r * 1.4, null, 3, 56);
            s2.wave = true;
            s2.awake = true;
            s2.name = "A section of the Reflection";
            enemies.push(s2);
            waveLive++;
          }
          toast("It breaks into sections.", 3e3);
          ring(e.x, e.y, 120, 320, 3);
        }
      }
      if (T.range && !T.snipe && dd < T.range * fog && e.cd <= 0 && Math.abs(da) < 0.5 && !travel && !(e.launch > 0) && atkToken(e)) {
        e.cd = T.cd * rnd(0.8, 1.25) / (e.p.rate || 1) / enemyFq(e, T) * (e.crippled ? 1.6 : 1);
        e.fired = true;
        const a = e.a + rnd(-0.06, 0.06) * (T.spray ? 3 : 1) + rnd(-1, 1) * clamp(Math.hypot(P.vx, P.vy) / 6e3, 0, 0.12), mx = e.x + Math.cos(e.a) * e.r, my = e.y + Math.sin(e.a) * e.r, dm = enemyDmg(e) / enemyFq(e, T);
        const src = e.type, p = e.p;
        if (T.boss) {
          if (e.ph === 0) {
            for (let j = -3; j <= 3; j++) {
              const a2 = e.a + j * 0.17;
              bolts.push({ x: mx, y: my, vx: Math.cos(a2) * 380, vy: Math.sin(a2) * 380, life: 2.4, dmg: dm, f: 0, src });
            }
            if (++e.vol % 4 === 0) {
              bombs.push({ x: P.x + P.vx * 0.7, y: P.y + P.vy * 0.7, t: 1.6, max: 1.6, r: 150 * ordK(), dmg: dm * 1.3, src });
              logBomb();
            }
          }
        } else if (T.bomb) {
          const nb = Math.min(6, e.bay * (p.pair ? 2 : 1));
          if (nb > 0) {
            sfx("bombw");
            const t = 1.5 * (p.quick || 1), bx = P.x + P.vx * 0.7 + rnd(-30, 30), by = P.y + P.vy * 0.7 + rnd(-30, 30), sp2 = Math.hypot(P.vx, P.vy), hx = sp2 > 20 ? P.vx / sp2 : Math.cos(P.a), hy = sp2 > 20 ? P.vy / sp2 : Math.sin(P.a);
            for (let k = 0; k < nb; k++) {
              const o = (k - (nb - 1) / 2) * 220;
              bombs.push({ x: bx - hy * o, y: by + hx * o, t, max: t, r: 120 * ordK(), dmg: dm, src });
              logBomb();
            }
          }
        } else if (T.missile) {
          const racks = e.wb.filter((b) => b.t === "miss").length, n = Math.min(12, racks * (p.salvo || 1));
          if (n > 0) sfx("emiss", e.x, e.y);
          for (let j = 0; j < n; j++) {
            const a2 = a + (j - (n - 1) / 2) * (n > 6 ? 0.15 : 0.35);
            bolts.push({ x: mx, y: my, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 3.8, dmg: dm, f: 0, m: 1, nr: p.noReflect || 1, src });
          }
        } else {
          const ws = e.wb.filter((b) => b.t === "emit" || b.t === "mini"), many = ws.length > 3, sprd = many ? 0 : p.spread, n = sprd || (many ? 1 : p.drum) || 1, burst2 = sprd || many ? 1 : p.burst || 1;
          if (ws.length) sfx("e_" + (T.boss ? "warden" : e.type), e.x, e.y);
          for (const wk of ws) {
            const [wx, wy] = blockWorld(e, wk), qx = wx + Math.cos(e.a) * CELL * 0.6, qy = wy + Math.sin(e.a) * CELL * 0.6;
            for (let j = 0; j < n; j++) for (let k = 0; k < burst2; k++) {
              const a2 = a + (sprd ? (j - (n - 1) / 2) * 0.15 : many ? rnd(-0.05, 0.05) : j ? rnd(-0.18, 0.18) : 0), back = k * 0.1 * 430;
              bolts.push({ x: qx - Math.cos(a2) * back, y: qy - Math.sin(a2) * back, vx: Math.cos(a2) * 430, vy: Math.sin(a2) * 430, life: (T.spray ? 0.9 : 1.7) + k * 0.1, dmg: dm, f: 0, k: T.spray ? 1 : 0, src, tr: e.tier });
              if (LOG) LOG.aim[e.tier].s++;
            }
          }
        }
      }
      if (e.type === "brute" && dd < e.r + P.radius * 0.85 && e.cd <= 0 && !P.form) {
        e.cd = T.cd;
        hurt(P, P.x - ux * P.radius * 0.7, P.y - uy * P.radius * 0.7, T.dmg * diffK() * (e.p.ram || 1), true, "brute");
        P.vx += ux * 260;
        P.vy += uy * 260;
        if (!e.p.steady) {
          e.vx -= ux * 200;
          e.vy -= uy * 200;
        }
      }
      if (e.p.dash && (e.dashT -= dt) <= 0 && dd < 800) {
        e.dashT = e.p.dash;
        e.vx += ux * 700;
        e.vy += uy * 700;
        burst(e.x, e.y, 10, 160, 3, 0.3, 2.4);
      }
      if (T.leech) {
        if (dd < P.radius + 130 && !P.form) {
          if (!e.latched) {
            e.latched = 1;
            sfx("latch", e.x, e.y);
          }
        } else e.latched = 0;
      }
      if (T.support && Math.random() < dt * 0.6) sfx("bhum", e.x, e.y);
      if (T.jam) jam(e, dt);
      if (T.leech && e.drain > 0 && dd < P.radius + 130 && !P.form && pool() > 0) {
        const amt = 15 * diffK() * dt * (e.p.drain || 1);
        spend(amt, "Leech");
        logHit("leech", amt, 0);
        healEnemy(e, amt * 0.4);
        for (let n = cnt(2); n > 0; n--) spawn(P.x + rnd(-12, 12), P.y + rnd(-12, 12), -dx / 0.4 + rnd(-30, 30), -dy / 0.4 + rnd(-30, 30), 0.4, 2.6, Math.random() < 0.5 ? 0 : 6);
      }
      if (T.support && e.dish > 0) {
        const R2 = (420 * (e.p.aura || 1)) ** 2;
        for (const o of enemies) {
          if (o === e || ET[o.type].support) continue;
          const qx = o.x - e.x, qy = o.y - e.y;
          if (qx * qx + qy * qy < R2) {
            o.buff = 0.3;
            healEnemy(o, 4 * (e.p.heal || 1) * dt);
            if (Math.random() < 0.05) spawn(e.x, e.y, qx / 0.5, qy / 0.5, 0.5, 2.4, 3);
          }
        }
      }
      if (e.corrupt) trailAdd(e, dt);
      if (Math.random() < 0.12) spawn(e.x - Math.cos(e.a) * e.r * 0.6, e.y - Math.sin(e.a) * e.r * 0.6, -e.vx * 0.3 + rnd(-30, 30), -e.vy * 0.3 + rnd(-30, 30), 0.35, 2.4, 3);
    } else idleSteer(e, T, dt);
    for (let j = 0; j < i; j++) {
      const o = enemies[j];
      const qx = e.x - o.x;
      if (qx > 400 || qx < -400) continue;
      if (o.zone !== e.zone && !(o.awake && e.awake)) continue;
      const qy = e.y - o.y, q2 = qx * qx + qy * qy, m = e.r + o.r;
      if (q2 < m * m && q2 > 0.01) {
        const q = Math.sqrt(q2), f = (m - q) / q * 0.5;
        e.x += qx * f;
        e.y += qy * f;
        o.x -= qx * f;
        o.y -= qy * f;
      }
    }
    const sp = Math.hypot(e.vx, e.vy), lim = e.awake ? T.sp * engF * (e.p.grip || 1) * (e.p.dash && e.dashT > e.p.dash - 0.5 ? 3 : 1) * (e.wave && dd > 2700 ? 3 : 1) : T.sp * TUNE.patrolSpeed;
    if (sp > lim) {
      e.vx *= lim / sp;
      e.vy *= lim / sp;
    }
    e.vx *= 1 - 0.6 * dt;
    e.vy *= 1 - 0.6 * dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (P.form && dd < e.r + P.radius && !(T.boss && e.ph === 0)) {
      {
        const hb = e.core && blockHit(e, P.x, P.y) || e.core;
        hurtEnemy(e, hb, 260 * dt);
      }
      hitNum(e, 260 * dt, "Ether form");
      S.st.dmg[0] += 260 * dt;
      wakeEnemy(e);
      e.flash = 0.05;
      addEther(5 * dt, "Ether form contact");
      for (let n = cnt(3); n > 0; n--) spawn(e.x + rnd(-e.r, e.r), e.y + rnd(-e.r, e.r), rnd(-160, 160), rnd(-160, 160), 0.4, 3, 2);
    }
    if (e.hp <= 0) killEnemy(i);
  }
}
