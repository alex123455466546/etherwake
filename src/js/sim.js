function stepPower(dt) {
  const f = poolF(), th = clamp((f - 0.1) / 0.3, 0.25, 1);
  S.limp = pool() < 1 && !P.form;
  const fight = S.limp && S.hostile > 0 && S.mood !== 3 && !(S.depth > 0);
  if (fight) {
    const was = S.cook;
    S.cook += dt;
    if (was <= 0) toast("Out of ether. " + TUNE.cookT + " seconds to get away or refill", 2600);
  } else S.cook = 0;
  S.cookMul = S.cook <= TUNE.cookT ? 1 : 1 + (TUNE.cookDmg - 1) * Math.min(1, (S.cook - TUNE.cookT) / TUNE.cookRamp);
  if (!S.low && f < 0.3) {
    S.low = true;
    if (S.t - S.lowT > 15 && S.mood !== 3) {
      S.lowT = S.t;
      sfx("low");
      toast("Ether low. Systems are throttling. Prioritise with 1 to 4.", 3e3);
    }
  } else if (S.low && f > 0.45) S.low = false;
  for (let i = 0; i < 4; i++) {
    const p = S.pri[i];
    S.pw[i] = p === 2 ? f > 0.04 ? i === 3 ? 1.8 : 1.5 : 1 : p === 1 ? f > 0.04 ? 1 : 0.6 : i === 3 ? Math.max(0.5, th) : th;
  }
}
function stepMood(dt, M) {
  let hostile = 0;
  for (const e of enemies) if (e.awake && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 64e4) hostile++;
  S.hostile = hostile;
  const want = S.hol && S.hd >= TUNE.holRim ? 3 : hostile || S.t - S.lastHit < 3 ? 1 : S.t - S.lastHarv < 2.5 ? 2 : 0;
  if (want === M) {
    S.wantT = 0;
    return;
  }
  S.wantT += dt;
  if (S.wantT > (want === 1 || want === 3 || M === 3 ? 0.25 : 1.6)) {
    S.wantT = 0;
    setMood(want);
  }
}
function stepPool(dt, M) {
  S.st.time += dt;
  if (M === 3) S.st.hol += dt;
  const pn = pool();
  S.net += (clamp((pn - S.prev) / dt, -400, 400) - S.net) * Math.min(1, dt * 1.5);
  S.prev = pn;
  if (S.frame % 12 === 0) {
    const b = biomeAt(P.x, P.y), ho = hollowAt(P.x, P.y);
    S.hol = !!ho;
    S.hd = ho ? ho.d : 0;
    S.hsi = ho ? ho.i : -1;
    S.dens = S.hol ? 0 : density(P.x, P.y);
    S.patch = patchFill();
    if (LOG) {
      const F = LOG.field;
      F.n++;
      F.sum += S.patch;
      if (S.patch < 0.25) F.thin++;
    }
    if (b !== S.biome) {
      S.biome = b;
      S.bioT0 = S.t;
      if (S.t > 1) {
        if (S.felt[b] || b === "edge") {
          toast(RT[b].card, 3200);
        } else toast("Unknown space. Something is different here.", 3200);
        sfx("biome");
      }
    } else if (!S.felt[b] && S.t - (S.bioT0 || 0) > 6) {
      S.felt[b] = 1;
      toast(RT[b].card, 3600);
      ev("zone", "learned what " + RT[b].name + " does");
    }
    if (b !== "edge" && sites.length) {
      const i = regionAt(P.x, P.y).i;
      if (!S.seenR.includes(i)) S.seenR.push(i);
    }
  }
  if (M === 3 && derelict()) {
    const g = (P.cap + S.haloMax) * TUNE.derelictRate;
    S.income = g;
    addEther(g * dt, "Derelict field");
    if (LOG) LOG.hol.der = (LOG.hol.der || 0) + g * dt;
  } else if (M === 3) {
    S.income = -(pool() * hollowDrain(S.hd) / 100);
    spend(-S.income * dt, "Hollow drain");
    const h0 = S.halo;
    S.halo = Math.max(0, S.halo - S.haloMax * hollowLeak(S.hd) * dt);
    logEther("Hollow drain", S.halo - h0, 0);
    if (LOG) LOG.hol.lost += Math.max(0, -S.income * dt) + (h0 - S.halo);
  } else {
    const core = M === 0 ? 3 : M === 1 ? 1.5 : 2.5, want = P.coll * 0.55 * S.dens * (M === 2 ? 1.6 : 1) * S.pw[3] * corrK(), coll = want > 0 ? drawField(want * dt) / dt : 0;
    S.income = core + coll;
    addEther(core * dt, "Core trickle");
    addEther(coll * dt, "Collectors");
    if (S.hol && S.hd > 0 && !derelict()) {
      const h0 = S.halo;
      S.halo = Math.max(0, S.halo - S.haloMax * hollowLeak(S.hd) * dt);
      logEther("Hollow drain", S.halo - h0, 0);
    }
  }
  if (S.pocketNeg && pool() > 0) spend(pool() * 0.03 * dt, "Negative pocket");
  if (S.pri[3] === 2 && S.shield > 0) {
    const g = Math.min(S.shield, 6 * dt);
    S.shield -= g;
    addEther(g, "Shield strip");
  }
  const q = S.halo / S.haloMax, qeq = S.hol ? 0 : clamp(S.dens * TUNE.pressEq, 0, TUNE.pressMax);
  S.qeq = qeq;
  if (q > qeq && S.halo > 0 && !(M === 3 && derelict())) {
    const h0 = S.halo;
    S.halo = Math.max(0, S.halo - (S.haloMax * TUNE.pressA * (q - qeq) ** 2 + 0.25) * P.leakK * (S.depth > 0 ? 3 : 1) * (1 - S.corr) * dt);
    logEther("Halo leak", S.halo - h0, 0);
  } else if (q < qeq && M !== 3) {
    const h0 = S.halo;
    S.halo = Math.min(S.haloMax, S.halo + S.haloMax * TUNE.pressFill * (qeq - q) * (1 - S.corr) * dt);
    logEther("Halo from space", S.halo - h0, 0);
  }
  {
    const full = S.halo >= S.haloMax - 0.5;
    if (full && !S.haloFull && S.t > 2) sfx("hfull");
    S.haloFull = full;
  }
  if (S.halo > 0) {
    const hq = S.halo / S.haloMax, fray = clamp((hq - qeq) * 3, 0, 1), band = 3 + 22 * fray, hs = P.form ? null : shapes().shapeH;
    for (let n = cnt(1 + hq * 7); n > 0; n--) {
      const hp = hs ? outlinePoint(hs, rnd(-band, band) * 0.6 + band * 0.3) : (() => {
        const a = rnd(0, TAU);
        return [P.x + Math.cos(a) * (P.radius + 24), P.y + Math.sin(a) * (P.radius + 24)];
      })();
      spawn(hp[0], hp[1], P.vx, P.vy, rnd(0.8, 1.6), rnd(1.6, 2.8), Math.random() < 0.6 ? 8 : 9);
    }
    if (fray > 0.15) for (let n = cnt(fray * 1.2); n > 0; n--) {
      const a = rnd(0, TAU);
      spawn(P.x + Math.cos(a) * (P.radius + 30), P.y + Math.sin(a) * (P.radius + 30), P.vx * 0.5 + Math.cos(a) * rnd(60, 160), P.vy * 0.5 + Math.sin(a) * rnd(60, 160), rnd(0.6, 1.2), 2, 1);
    }
  }
  if (P.form) {
    spend((5 + 0.25 * P.mass) * dt, "Ether form");
    if (pool() <= 0) {
      S.ether = 0;
      P.form = false;
      S.shield = 0;
      S.lastHit = S.t;
      toast("Ether spent. Hull re-forms.");
    }
  }
  S.ether = clamp(S.ether, 0, P.cap);
  S.fill = S.ether / P.cap;
  S.stream = M === 3 ? (1 - S.fill) * (1 - S.fill) * 1.4 : (S.fill * S.fill * 0.95 + 0.5 * S.halo / S.haloMax) * (M === 0 ? 1.25 : 1);
}
function crack() {
  const core = P.blocks.find((b) => b.t === "core");
  if (!core) return;
  let far = null, bd = -1;
  const gh = P.blocks.some((b) => b.ghost);
  for (const b of P.blocks) {
    if (b === core || gh && !b.ghost) continue;
    const d = (b.x - core.x) ** 2 + (b.y - core.y) ** 2;
    if (d > bd) {
      bd = d;
      far = b;
    }
  }
  if (!far) {
    if (S.god) return;
    far = core;
  }
  const [wx, wy] = wpos(P, far);
  S.st.frayLost++;
  if (S.trip) S.trip.lost = 1;
  if (LOG) LOG.frayLost = (LOG.frayLost || 0) + 1;
  damageBlock(P, far, wx, wy, 9999);
}
const ACH = { edge: "Edge walker", thin: "Into the thin", frayed: "Frayed", flotsam: "Flotsam", fardark: "The far dark" };
function earn(id) {
  if (S.dev || S.found.includes(id)) return;
  const a = loadJSON("ew_ach") || {};
  if (a[id]) {
    if (!S.found.includes(id)) S.found.push(id);
    return;
  }
  a[id] = Date.now();
  storeJSON("ew_ach", a);
  S.found.push(id);
  S.newAch = (S.newAch || []).concat(id);
}
const noseEff = (c) => c >= 0 ? TUNE.noseSide + (1 - TUNE.noseSide) * c : TUNE.noseSide + (TUNE.noseSide - TUNE.noseBack) * c;
const FLAB = [
  null,
  { name: "Light is quick, heavy is slow to start but unstoppable", acc: (h) => 1.5 - 0.85 * h, vmax: (h) => 1, turn: (h) => 1, settle: (h) => 1 + 1.5 * h },
  { name: "Everyone starts quick, heavy turns and stops slowly", acc: (h) => 1.3, vmax: (h) => 1, turn: (h) => 1 - 0.5 * h, settle: (h) => 1 + 1.2 * h },
  { name: "Like 1, and light ships top out higher", acc: (h) => 1.5 - 0.85 * h, vmax: (h) => 1 + 0.3 * (1 - h), turn: (h) => 1, settle: (h) => 1 + 1.5 * h }
];
const heavyOf = () => clamp(Math.log(Math.max(15, P.wt) / 15) / Math.log(200 / 15), 0, 1);
function saveFlight() {
  storeJSON("ew_set", SET);
  const a = $("sAssist"), b = $("sDraft"), c = $("sSettle");
  if (a) a.value = String(SET.assist);
  if (b) b.value = String(SET.draft);
  if (c) c.value = String(SET.settle);
}
function cycleAssist() {
  if (SET.flight === 1) {
    toast("Drift and brake: hold Ctrl to brake. Flight assist is off (Settings).", 2200);
    return;
  }
  if (SET.flightModel !== "new") {
    SET.assist = (SET.assist + 1) % 3;
    saveFlight();
    ev("assist", ["Full", "Light", "Off"][SET.assist]);
    sfx("hold");
    toast("Flight assist: " + ["Full. It brakes and cancels drift", "Light. It brakes when you let go of the keys", "Off. You drift"][SET.assist], 2200);
    return;
  }
  SET.assist = SET.assist === 2 ? 1 : 2;
  saveFlight();
  ev("assist", SET.assist === 2 ? "Off" : "On");
  sfx("hold");
  toast(SET.assist === 2 ? "Flight assist: Off. You drift" : "Flight assist: On. Letting go settles the ship in " + SET.settle + " s", 2200);
}
function cycleDraft() {
  if (SET.flightModel !== "new") {
    toast("The flight drafts are in the New flight (Settings, Flight model).", 2400);
    return;
  }
  SET.draft = (SET.draft | 0) % 3 + 1;
  saveFlight();
  ev("draft", String(SET.draft));
  sfx("hold");
  toast("Flight " + SET.draft + ": " + FLAB[SET.draft].name, 3e3);
}
function nudgeSettle(d) {
  if (SET.flightModel !== "new") return;
  SET.settle = clamp(Math.round((SET.settle + d) * 2) / 2, 0.5, 8);
  saveFlight();
  ev("settle", String(SET.settle));
  toast("Settle time " + SET.settle + " s (heavier ships take longer)", 1600);
}
function stepFlight(dt, d) {
  return SET.flightModel === "new" ? stepFlightNew(dt, d) : stepFlightClassic(dt, d);
}
const NOCUR0 = { s: 0, fx: 0, fy: 0 };
function curEff() {
  const c = S.cur;
  if (S.t < (S.curFree || 0) && (!c || c.s <= 0.02) && S.curFree > S.t + 1) S.curFree = S.t + 1;
  if (!c || c.s <= 0 || S.limp) return NOCUR0;
  if (S.t < (S.curFree || 0)) return NOCUR0;
  return c.s >= TUNE.curFull ? c.k1 || (c.k1 = { s: 1, fx: c.fx, fy: c.fy, ox: c.ox, oy: c.oy }) : { s: c.s / TUNE.curFull, fx: c.fx, fy: c.fy, ox: c.ox, oy: c.oy };
}
function curRide(dt, ix, iy, il) {
  const cu = curEff();
  if (cu.s > 0.05 && il) {
    const along = ix * cu.fx + iy * cu.fy, out = ix * (cu.ox || 0) + iy * (cu.oy || 0);
    if (along < -0.5 || out > 0.5) {
      S.curAg = (S.curAg || 0) + dt;
      if (S.curAg >= TUNE.curLet) {
        S.curAg = 0;
        S.curFree = S.t + TUNE.curFreeT;
        ev("current", "let go: steered away");
        if (LOG) LOG.cur.let = (LOG.cur.let | 0) + 1;
        return;
      }
      return;
    }
  }
  S.curAg = Math.max(0, (S.curAg || 0) - dt * 2);
}
function curForce(dt, cu, vmax, a0) {
  if (cu.s <= 0) return;
  const al = P.vx * cu.fx + P.vy * cu.fy, cx = P.vx - al * cu.fx, cy = P.vy - al * cu.fy, vfl = vmax * TUNE.curWith * cu.s, s0 = Math.hypot(P.vx, P.vy);
  if (al < vfl) {
    const g = Math.min(vfl - al, cu.s * (TUNE.curAcc + TUNE.curPushA * a0) * dt);
    P.vx += cu.fx * g;
    P.vy += cu.fy * g;
  }
  const cl = Math.hypot(cx, cy);
  if (cl > 0) {
    const g = Math.min(cl, cl * TUNE.riverGrip * cu.s * dt, cu.s * (TUNE.curAcc + TUNE.curPushX * a0) * dt);
    P.vx -= cx / cl * g;
    P.vy -= cy / cl * g;
  }
  const s2 = Math.hypot(P.vx, P.vy), lim = Math.max(s0, vfl);
  if (s2 > lim) {
    P.vx *= lim / s2;
    P.vy *= lim / s2;
  }
}
function cruiseOn() {
  return !!S.cruise && !P.form && !S.limp;
}
function toggleCruise() {
  if (S.cruise) {
    S.cruise = false;
    sfx("hold");
    toast("Cruise off", 1400);
    ev("cruise", "off");
    return;
  }
  const sp = Math.hypot(P.vx, P.vy);
  S.cruise = true;
  S.cruiseV = sp > 60 ? sp : Math.max(120, (P.vtop || 300) * 0.6);
  sfx("hold");
  toast("Cruise on. It holds your speed. W faster, S slower, C stops it.", 2600);
  ev("cruise", "on " + Math.round(S.cruiseV));
  if (LOG) LOG.cruise = (LOG.cruise | 0) + 1;
}
function cruiseStep(dt, vmax, vmB, a0, boost) {
  let sp = Math.hypot(P.vx, P.vy);
  const nx = Math.cos(P.a), ny = Math.sin(P.a);
  const st = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), sg = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  if (st && sp > 20) {
    const r = clamp(a0 * 1.5 / Math.max(sp, 1), 0.15, 1.2) * st * dt, c = Math.cos(r), s = Math.sin(r), vx = P.vx * c - P.vy * s, vy = P.vx * s + P.vy * c;
    P.vx = vx;
    P.vy = vy;
  }
  if (sg) S.cruiseV = clamp(S.cruiseV + sg * vmax * 0.4 * dt, Math.max(40, vmax * 0.1), Math.max(vmB, S.cruiseV));
  if (boost) S.cruiseV = Math.max(S.cruiseV, Math.min(sp, vmax * 1.75));
  sp = Math.hypot(P.vx, P.vy);
  return sp > 20 ? [P.vx / sp, P.vy / sp] : [nx, ny];
}
function stepFlightClassic(dt, d) {
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  const il0 = Math.hypot(ix, iy);
  let il = il0 > 0;
  if (il) {
    ix /= il0;
    iy /= il0;
    if (lineOf() && lineOf().omni) {
      const fa = -iy, sa = ix, cn = Math.cos(P.a), sn = Math.sin(P.a);
      ix = cn * fa - sn * sa;
      iy = sn * fa + cn * sa;
    }
  }
  if (S.frame % 3 === 0 || !S.cur) S.cur = currentAt(P.x, P.y);
  riverFx(dt);
  curRide(dt, ix, iy, il);
  const hs = hollowSpeed(S.hd || 0);
  const lm = S.limp, cu = curEff();
  let cf = 1, free = false;
  if (lm) d = TUNE.limpD;
  const thr = lm ? 0 : P.thr, aft = lm ? 0 : P.aft;
  if (cu.s > 0) {
    const sp0 = Math.hypot(P.vx, P.vy), ux0 = il ? ix : sp0 > 20 ? P.vx / sp0 : 0, uy0 = il ? iy : sp0 > 20 ? P.vy / sp0 : 0, c = ux0 * cu.fx + uy0 * cu.fy;
    cf = c >= 0 ? 1 + (TUNE.curWith - 1) * cu.s * c : 1 + (1 - TUNE.curAgainst) * cu.s * c;
    free = c > 0.3 && cu.s > 0.25;
    if (LOG) {
      LOG.cur.t += dt;
      if (free) LOG.cur.free += dt;
    }
  }
  const formK = P.form ? 3 : 1, em = Math.max(0, P.wt - P.carry), burnP = aft && S.aburn && pool() > 1 && !P.form ? Math.min(1, S.pw[0]) : 0, tb = Math.min(1, 0.11 * thr), eb = tb + Math.min(1.2, 0.22 * aft) * burnP, vmax = 250 * (0.45 + 1.4 * d + eb) * (1 + S.stream) * formK / (1 + em * 0.012) * PK("speed");
  const crOn = cruiseOn(), hands = il, boost = (mouse.rdown || keys.ShiftLeft || keys.ShiftRight) && (hands || crOn) && !P.form && pool() > 2, travel = !boost && crOn, vmB = vmax * cf * hs * (boost ? 1.75 : 1) * (travel ? TUNE.travelTop : 1) * (S.rail && S.rail.on ? 0.5 : 1), vm = crOn ? Math.max(vmB, S.cruiseV) : vmB;
  const U = 0.4 + 1.6 * d + 0.11 * thr + 0.22 * aft * burnP, a0 = TUNE.thrustK * PK("thrust") * U * formK / Math.max(1, P.wt) * cf * hs * (boost ? 2.2 : 1) * (S.rail && S.rail.on ? 0.6 : 1), nx = Math.cos(P.a), ny = Math.sin(P.a), eOf = (dx, dy) => P.form || lineOf() && lineOf().omni ? 1 : noseEff(dx * nx + dy * ny), fm = SET.flight | 0, as = fm === 0 ? SET.assist | 0 : 2, ctl = fm === 1 && !!(keys.ControlLeft || keys.ControlRight);
  curForce(dt, cu, vmax, a0);
  let hd0 = null;
  if (crOn) {
    hd0 = cruiseStep(dt, vmax, vmB, a0, boost);
    ix = iy = 0;
    il = false;
  }
  let tx = 0, ty = 0, throttle = 0;
  const toward = (wx, wy) => {
    const dx = wx - P.vx, dy = wy - P.vy, dl = Math.hypot(dx, dy);
    if (dl <= 1) return;
    const ux = dx / dl, uy = dy / dl, cap = a0 * eOf(ux, uy), th = Math.min(1, dl / TUNE.assistTau / cap, dl / (cap * dt));
    tx += ux * cap * th;
    ty += uy * cap * th;
    throttle = Math.max(throttle, th);
  };
  if (ctl) toward(0, 0);
  else if (crOn) {
    const tg = boost ? vm : S.cruiseV;
    toward(hd0[0] * tg, hd0[1] * tg);
  } else if (!il && as < 2 && cu.s > 0.25) {
    const vfl = vmax * TUNE.curWith * cu.s;
    toward(cu.fx * vfl, cu.fy * vfl);
  } else if (!il && as < 2) toward(0, 0);
  else if (il) {
    const e = eOf(ix, iy);
    throttle = 1;
    tx = ix * a0 * e;
    ty = iy * a0 * e;
    if (as === 0) {
      const al = P.vx * ix + P.vy * iy, sx = P.vx - al * ix, sy = P.vy - al * iy, sl = Math.hypot(sx, sy);
      if (sl > 1) {
        const c = Math.min(a0 * eOf(-sx / sl, -sy / sl), sl / TUNE.assistTau, sl / dt);
        tx -= sx / sl * c;
        ty -= sy / sl * c;
        const m = Math.hypot(tx, ty);
        if (m > a0) {
          tx *= a0 / m;
          ty *= a0 / m;
        }
      }
    }
  }
  const tl = Math.hypot(tx, ty), tux = tl ? tx / tl : 0, tuy = tl ? ty / tl : 0, live = throttle > 0.04 && tl > 0;
  if (live && !P.form && !free) {
    spend((0.6 + 0.012 * P.mass) * S.pw[0] * (S.pri[0] === 2 ? 2 : 1) * throttle * dt, "Drive");
    if (burnP) spend(0.6 * P.aft * burnP * throttle * dt, "Afterburners");
  }
  S.aburn = live;
  const look = SET.look !== "classic";
  if (boost && !S.boost) {
    sfx("whoosh");
    if (look) ring(P.x, P.y, 30, 340, 2);
  }
  S.boost = boost;
  S.thr = live;
  S.brake = live && tux * P.vx + tuy * P.vy < -0.4 * Math.hypot(P.vx, P.vy) && Math.hypot(P.vx, P.vy) > 80;
  if (travel) {
    S.tTravel = true;
    spend((5 + 0.1 * P.mass) * TUNE.travelCost * dt, "Travel");
  }
  if (crOn && !boost && S.cruiseV > vmax * cf * hs * TUNE.travelTop * 1.02) {
    S.tBoost = true;
    spend((5 + 0.1 * P.mass) * dt, "Boost");
  }
  if (boost) {
    S.tBoost = true;
    spend((5 + 0.1 * P.mass) * dt, "Boost");
    const bx = il ? ix : hd0 ? hd0[0] : 0, by = il ? iy : hd0 ? hd0[1] : 0;
    for (let n = cnt(3); n > 0; n--) {
      const o = rnd(-0.8, 0.8) * P.radius;
      spawn(P.x - bx * (P.radius + 3) - by * o, P.y - by * (P.radius + 3) + bx * o, -bx * rnd(200, 420) + rnd(-60, 60), -by * rnd(200, 420) + rnd(-60, 60), rnd(0.3, 0.6), rnd(2.4, 4), Math.random() < 0.5 ? 2 : 0);
    }
  }
  const f = Math.exp(-Math.LN2 / TUNE.dragHalf * dt);
  P.vx *= f;
  P.vy *= f;
  {
    let nvx = P.vx + tx * dt, nvy = P.vy + ty * dt;
    const nl = Math.hypot(nvx, nvy), lim = Math.max(vm, Math.hypot(P.vx, P.vy));
    if (nl > lim) {
      nvx *= lim / nl;
      nvy *= lim / nl;
    }
    if (hs < 1 || cf < 1) {
      const vL = Math.max(vmax * hs * Math.min(cf, 1) * (boost ? 1.75 : 1) * (travel ? TUNE.travelTop : 1), crOn ? S.cruiseV : 0), s2 = Math.hypot(nvx, nvy);
      if (s2 > vL) {
        const s3 = vL + (s2 - vL) * Math.exp(-TUNE.envDrag * dt);
        nvx *= s3 / s2;
        nvy *= s3 / s2;
      }
    }
    P.vx = nvx;
    P.vy = nvy;
  }
  P.x += P.vx * dt;
  P.y += P.vy * dt;
  const sp = Math.hypot(P.vx, P.vy);
  P.vtop = vm / (boost ? 1.75 : 1);
  if (boost) S.ram = 1;
  else if (sp > TUNE.ramFast * P.vtop && !P.form) S.ram = Math.min(1, (S.ram || 0) + dt / TUNE.ramBuild);
  else S.ram = Math.max(0, (S.ram || 0) - dt * 1.2);
  const od = Math.hypot(P.x, P.y);
  if (od > WORLD) {
    const vin = -(P.vx * P.x + P.vy * P.y) / od, cap = clamp((od - WORLD) * 0.5 + 300, 300, TUNE.pullBack);
    if (vin > 0 && vin < cap) {
      const g = Math.min(cap - vin, TUNE.pullAcc * dt);
      P.vx -= P.x / od * g;
      P.vy -= P.y / od * g;
    }
  }
  const gk = Math.min(1, dt * 10), gx = live ? tux * nx + tuy * ny : 1, gy = live ? -tux * ny + tuy * nx : 0;
  P.tdx += (gx - P.tdx) * gk;
  P.tdy += (gy - P.tdy) * gk;
  {
    const l = Math.hypot(P.tdx, P.tdy) || 1;
    P.tdx /= l;
    P.tdy /= l;
  }
  P.tu += (throttle - P.tu) * gk;
  const mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom;
  let da = Math.atan2(my - P.y, mx - P.x) - P.a;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const wmax = clamp(TUNE.turnK * (TUNE.turnG0 + TUNE.turnG * P.gyro) / Math.sqrt(Math.max(1, P.spin)) * PK("turn"), TUNE.turnMin, TUNE.turnMax), want = clamp(da * TUNE.turnP, -wmax, wmax), acc = wmax * TUNE.turnAcc * dt;
  P.av += clamp(want - P.av, -acc, acc);
  P.a += P.av * dt;
  P.gyA = (P.gyA || 0) + (0.6 + Math.abs(P.av) * 1.6) * dt;
  if (LOG) logFlight(dt, boost, da);
  rib.push({ x: P.x, y: P.y, t: S.t, b: boost });
  while (rib.length && S.t - rib[0].t > 1.5) rib.shift();
  if (look && !P.form) {
    const c = nx, s = ny, E = P.engList, ex = -P.tdx, ey = -P.tdy, wx = ex * c - ey * s, wy = ex * s + ey * c;
    if (live && E && E.length) for (let n = cnt((0.8 + d * 1.5 + Math.min(3, P.eng * 0.35)) * (0.35 + 0.65 * throttle)); n > 0; n--) {
      const b = E[Math.random() * E.length | 0], hot = b.t === "aft" && burnP > 0, lx = b.x * CELL + ex * (CELL / 2 + 2) - ey * rnd(-4, 4), ly = b.y * CELL + ey * (CELL / 2 + 2) + ex * rnd(-4, 4), v = rnd(140, 300) * (hot ? 1.6 : 1);
      spawn(P.x + lx * c - ly * s, P.y + lx * s + ly * c, P.vx * 0.3 + wx * v + rnd(-25, 25), P.vy * 0.3 + wy * v + rnd(-25, 25), hot ? rnd(0.18, 0.4) : rnd(0.35, 0.7), hot ? rnd(2.6, 3.8) : rnd(1.8, 2.8), hot ? Math.random() < 0.45 ? 2 : 6 : Math.random() < 0.6 ? 0 : 6);
    }
    if (S.brake) for (let n = cnt(1.5 * throttle); n > 0; n--) {
      const vx = P.vx / sp, vy = P.vy / sp;
      spawn(P.x + vx * (P.radius + 4), P.y + vy * (P.radius + 4), P.vx * 0.5 + vx * rnd(60, 140) + rnd(-40, 40), P.vy * 0.5 + vy * rnd(60, 140) + rnd(-40, 40), rnd(0.25, 0.5), rnd(2, 3), 6);
    }
    if (rib.length > 6) {
      if (S.mood === 1) for (let n = cnt(1.2); n > 0; n--) {
        const q = rib[Math.random() * rib.length * 0.7 | 0];
        spawn(q.x, q.y, rnd(-120, 120), rnd(-120, 120), rnd(0.15, 0.35), 2, Math.random() < 0.5 ? 2 : 0);
      }
      else if (S.mood === 3) for (let n = cnt(0.8); n > 0; n--) {
        const q = rib[Math.random() * rib.length | 0];
        spawn(q.x, q.y, rnd(-30, 30), rnd(-30, 30), rnd(0.4, 0.9), 2.2, 5);
      }
    }
    if (P.gyro && Math.abs(da) > 0.5) for (let n = cnt(1); n > 0; n--) {
      const sd = da > 0 ? 1 : -1;
      spawn(P.x - s * sd * P.radius * 0.8, P.y + c * sd * P.radius * 0.8, P.vx - s * sd * rnd(80, 160), P.vy + c * sd * rnd(80, 160), rnd(0.2, 0.4), 2, 6);
    }
  } else if (live) for (let n = cnt((0.6 + d * 1.5 + Math.min(2, P.eng * 0.3)) * (0.35 + 0.65 * throttle)); n > 0; n--) {
    const o = rnd(-0.7, 0.7) * P.radius, v = rnd(120, 280), f2 = o / P.radius * v * 0.55;
    spawn(P.x - tux * (P.radius + 3) - tuy * o, P.y - tuy * (P.radius + 3) + tux * o, P.vx * 0.3 - tux * v - tuy * f2, P.vy * 0.3 - tuy * v + tux * f2, rnd(0.35, 0.8), rnd(2, 3.4), Math.random() < 0.7 ? 1 : 0);
  }
  if (sp > 120 && (boost || sp > 0.7 * (P.vtop || 1e9))) {
    const nx2 = P.vx / sp, ny2 = P.vy / sp, tipx = P.x + nx2 * (P.radius + 16), tipy = P.y + ny2 * (P.radius + 16);
    for (let n = cnt(0.5 + Math.min(3, S.stream) * 2 + (boost ? 3 : 0)); n > 0; n--) {
      const sd = Math.random() < 0.5 ? 1 : -1, k2 = rnd(1.05, 1.45) * sp;
      spawn(tipx + rnd(-3, 3), tipy + rnd(-3, 3), P.vx * 0.04 - ny2 * sd * k2, P.vy * 0.04 + nx2 * sd * k2, rnd(0.45, 0.95), rnd(1.5, 2.8), Math.random() < 0.7 ? 0 : 6);
    }
  }
  for (let n = cnt(Math.min(2, P.coll * S.dens * 0.12) * (S.patch == null ? 1 : S.patch)); n > 0; n--) {
    const a = rnd(0, TAU), q = reach() * rnd(0.6, 1);
    spawn(P.x + Math.cos(a) * q, P.y + Math.sin(a) * q, P.vx - Math.cos(a) * q * 1.6, P.vy - Math.sin(a) * q * 1.6, 0.6, 2, 0);
  }
  ambient((0.35 + 2.2 * S.dens * (0.3 + 0.7 * (S.patch == null ? 1 : S.patch))) * clamp(1 / (zoom * zoom), 1, 5), 1.5);
  if (P.form) for (const b of P.blocks) {
    const [bx, by] = wpos(P, b);
    for (let n = cnt(Math.min(1.6, 45 / P.blocks.length)); n > 0; n--) spawn(bx + rnd(-9, 9), by + rnd(-9, 9), P.vx * 0.15 + rnd(-70, 70), P.vy * 0.15 + rnd(-70, 70), rnd(0.25, 0.6), rnd(2.2, 4), b.t === "core" ? 2 : Math.random() < 0.6 ? 0 : 1);
  }
}
function stepFlightNew(dt, d) {
  const sDown = !!(keys.KeyS || keys.ArrowDown), wDown = !!(keys.KeyW || keys.ArrowUp), sBrake = sDown && !wDown && SET.sKey !== "reverse";
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), iy = (sDown && !sBrake ? 1 : 0) - (wDown ? 1 : 0);
  const il0 = Math.hypot(ix, iy);
  let il = il0 > 0;
  if (il) {
    ix /= il0;
    iy /= il0;
    const fa = -iy, sa = ix, cn = Math.cos(P.a), sn = Math.sin(P.a);
    ix = cn * fa - sn * sa;
    iy = sn * fa + cn * sa;
  }
  const FD = FLAB[SET.draft | 0] || FLAB[1], HV = heavyOf();
  if (S.frame % 3 === 0 || !S.cur) S.cur = currentAt(P.x, P.y);
  riverFx(dt);
  curRide(dt, ix, iy, il);
  const hs = hollowSpeed(S.hd || 0);
  const lm = S.limp, cu = curEff();
  let cf = 1, free = false;
  if (lm) d = TUNE.limpD;
  const thr = lm ? 0 : P.thr, aft = lm ? 0 : P.aft;
  if (cu.s > 0) {
    const sp0 = Math.hypot(P.vx, P.vy), ux0 = il ? ix : sp0 > 20 ? P.vx / sp0 : 0, uy0 = il ? iy : sp0 > 20 ? P.vy / sp0 : 0, c = ux0 * cu.fx + uy0 * cu.fy;
    cf = c >= 0 ? 1 + (TUNE.curWith - 1) * cu.s * c : 1 + (1 - TUNE.curAgainst) * cu.s * c;
    free = c > 0.3 && cu.s > 0.25;
    if (LOG) {
      LOG.cur.t += dt;
      if (free) LOG.cur.free += dt;
    }
  }
  const formK = P.form ? 3 : 1, em = Math.max(0, P.wt - P.carry), burnP = aft && S.aburn && pool() > 1 && !P.form ? Math.min(1, S.pw[0]) : 0, tb = Math.min(1, 0.11 * thr), eb = tb + Math.min(1.2, 0.22 * aft) * burnP, vmax = 250 * (0.45 + 1.4 * d + eb) * (1 + S.stream) * formK / (1 + em * 0.012) * PK("speed") * FD.vmax(HV);
  const crOn = cruiseOn(), hands = il, boost = (mouse.rdown || keys.ShiftLeft || keys.ShiftRight) && (hands || crOn) && !P.form && pool() > 2, travel = !boost && crOn, vmB = vmax * cf * hs * (boost ? 1.75 : 1) * (travel ? TUNE.travelTop : 1), vm = crOn ? Math.max(vmB, S.cruiseV) : vmB;
  const U = 0.4 + 1.6 * d + 0.11 * thr + 0.22 * aft * burnP, a0 = TUNE.thrustK * PK("thrust") * U * formK / Math.max(1, P.wt) * cf * hs * (boost ? 2.2 : 1) * FD.acc(HV), nx = Math.cos(P.a), ny = Math.sin(P.a), eOf = (dx, dy) => P.form || lineOf() && lineOf().omni ? 1 : noseEff(dx * nx + dy * ny), fm = SET.flight | 0, as = fm === 0 ? SET.assist === 2 ? 2 : 1 : 2, ctl = !!(keys.ControlLeft || keys.ControlRight);
  curForce(dt, cu, vmax, a0);
  let hd0 = null;
  if (crOn) {
    hd0 = cruiseStep(dt, vmax, vmB, a0, boost);
    ix = iy = 0;
    il = false;
  }
  let tx = 0, ty = 0, throttle = 0;
  const tauA = Math.max(0.2, clamp(+SET.settle || 3, 0.5, 8) / 3 * FD.settle(HV)), vcr = vmax * hs;
  const toward = (wx, wy, tau) => {
    const dx = wx - P.vx, dy = wy - P.vy, dl = Math.hypot(dx, dy);
    if (dl <= 1) return;
    const ux = dx / dl, uy = dy / dl, cap = a0 * eOf(ux, uy), th = Math.min(1, dl / tau / cap, dl / (cap * dt));
    tx += ux * cap * th;
    ty += uy * cap * th;
    throttle = Math.max(throttle, th);
  };
  if (ctl) toward(0, 0, TUNE.assistTau);
  else if (crOn) {
    const tg = boost ? vm : S.cruiseV;
    toward(hd0[0] * tg, hd0[1] * tg, TUNE.assistTau);
  } else if (sBrake) toward(0, 0, TUNE.sBrakeTau);
  else if (!il && as < 2 && cu.s > 0.25) {
    const vfl = vmax * TUNE.curWith * cu.s;
    toward(cu.fx * vfl, cu.fy * vfl, tauA);
  } else if (!il && as < 2) {
    const sp1 = Math.hypot(P.vx, P.vy);
    if (sp1 > vcr * 1.03) toward(P.vx / sp1 * vcr, P.vy / sp1 * vcr, Math.max(2, tauA));
    else toward(0, 0, tauA);
  } else if (il) {
    const e = eOf(ix, iy);
    throttle = 1;
    tx = ix * a0 * e;
    ty = iy * a0 * e;
    if (as < 2) {
      const al = P.vx * ix + P.vy * iy, sx = P.vx - al * ix, sy = P.vy - al * iy, sl = Math.hypot(sx, sy), tg = Math.max(0.2, tauA * 0.4);
      if (sl > 1) {
        const c = Math.min(a0 * eOf(-sx / sl, -sy / sl), sl / tg, sl / dt);
        tx -= sx / sl * c;
        ty -= sy / sl * c;
        const m = Math.hypot(tx, ty);
        if (m > a0) {
          tx *= a0 / m;
          ty *= a0 / m;
        }
      }
    }
  }
  const tl = Math.hypot(tx, ty), tux = tl ? tx / tl : 0, tuy = tl ? ty / tl : 0, live = throttle > 0.04 && tl > 0;
  if (live && !P.form && !free) {
    spend((0.6 + 0.012 * P.mass) * S.pw[0] * (S.pri[0] === 2 ? 2 : 1) * throttle * dt, "Drive");
    if (burnP) spend(0.6 * P.aft * burnP * throttle * dt, "Afterburners");
  }
  S.aburn = live;
  const look = SET.look !== "classic";
  if (boost && !S.boost) {
    sfx("whoosh");
    if (look) ring(P.x, P.y, 30, 340, 2);
  }
  S.boost = boost;
  S.thr = live;
  S.brake = live && tux * P.vx + tuy * P.vy < -0.4 * Math.hypot(P.vx, P.vy) && Math.hypot(P.vx, P.vy) > 80;
  if (travel) {
    S.tTravel = true;
    spend((5 + 0.1 * P.mass) * TUNE.travelCost * dt, "Travel");
  }
  if (crOn && !boost && S.cruiseV > vmax * cf * hs * TUNE.travelTop * 1.02) {
    S.tBoost = true;
    spend((5 + 0.1 * P.mass) * dt, "Boost");
  }
  if (boost) {
    S.tBoost = true;
    spend((5 + 0.1 * P.mass) * dt, "Boost");
    const bx = il ? ix : hd0 ? hd0[0] : 0, by = il ? iy : hd0 ? hd0[1] : 0;
    for (let n = cnt(3); n > 0; n--) {
      const o = rnd(-0.8, 0.8) * P.radius;
      spawn(P.x - bx * (P.radius + 3) - by * o, P.y - by * (P.radius + 3) + bx * o, -bx * rnd(200, 420) + rnd(-60, 60), -by * rnd(200, 420) + rnd(-60, 60), rnd(0.3, 0.6), rnd(2.4, 4), Math.random() < 0.5 ? 2 : 0);
    }
  }
  const f = Math.exp(-Math.LN2 / TUNE.dragHalf * dt);
  P.vx *= f;
  P.vy *= f;
  {
    let nvx = P.vx + tx * dt, nvy = P.vy + ty * dt;
    const nl = Math.hypot(nvx, nvy), lim = Math.max(vm, Math.hypot(P.vx, P.vy));
    if (nl > lim) {
      nvx *= lim / nl;
      nvy *= lim / nl;
    }
    if (hs < 1 || cf < 1) {
      const vL = Math.max(vmax * hs * Math.min(cf, 1) * (boost ? 1.75 : 1) * (travel ? TUNE.travelTop : 1), crOn ? S.cruiseV : 0), s2 = Math.hypot(nvx, nvy);
      if (s2 > vL) {
        const s3 = vL + (s2 - vL) * Math.exp(-TUNE.envDrag * dt);
        nvx *= s3 / s2;
        nvy *= s3 / s2;
      }
    }
    P.vx = nvx;
    P.vy = nvy;
  }
  P.x += P.vx * dt;
  P.y += P.vy * dt;
  const sp = Math.hypot(P.vx, P.vy);
  P.vtop = vm / (boost ? 1.75 : 1);
  if (boost) S.ram = 1;
  else if (sp > TUNE.ramFast * P.vtop && !P.form) S.ram = Math.min(1, (S.ram || 0) + dt / TUNE.ramBuild);
  else S.ram = Math.max(0, (S.ram || 0) - dt * 1.2);
  const od = Math.hypot(P.x, P.y);
  if (od > WORLD) {
    const vin = -(P.vx * P.x + P.vy * P.y) / od, cap = clamp((od - WORLD) * 0.5 + 300, 300, TUNE.pullBack);
    if (vin > 0 && vin < cap) {
      const g = Math.min(cap - vin, TUNE.pullAcc * dt);
      P.vx -= P.x / od * g;
      P.vy -= P.y / od * g;
    }
  }
  const gk = Math.min(1, dt * 10), gx = live ? tux * nx + tuy * ny : 1, gy = live ? -tux * ny + tuy * nx : 0;
  P.tdx += (gx - P.tdx) * gk;
  P.tdy += (gy - P.tdy) * gk;
  {
    const l = Math.hypot(P.tdx, P.tdy) || 1;
    P.tdx /= l;
    P.tdy /= l;
  }
  P.tu += (throttle - P.tu) * gk;
  const mx = cam.x + (mouse.x - W / 2) / zoom, my = cam.y + (mouse.y - H / 2) / zoom;
  let da = Math.atan2(my - P.y, mx - P.x) - P.a;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const wmax = clamp(TUNE.turnK * (TUNE.turnG0 + TUNE.turnG * P.gyro) / Math.sqrt(Math.max(1, P.spin)) * FD.turn(HV) * PK("turn"), TUNE.turnMin, TUNE.turnMax), want = clamp(da * TUNE.turnP, -wmax, wmax), acc = wmax * TUNE.turnAcc * dt;
  P.av += clamp(want - P.av, -acc, acc);
  P.a += P.av * dt;
  P.gyA = (P.gyA || 0) + (0.6 + Math.abs(P.av) * 1.6) * dt;
  if (LOG) logFlight(dt, boost, da);
  rib.push({ x: P.x, y: P.y, t: S.t, b: boost });
  while (rib.length && S.t - rib[0].t > 1.5) rib.shift();
  if (look && !P.form) {
    const c = nx, s = ny, E = P.engList, ex = -P.tdx, ey = -P.tdy, wx = ex * c - ey * s, wy = ex * s + ey * c;
    if (live && E && E.length) for (let n = cnt((0.8 + d * 1.5 + Math.min(3, P.eng * 0.35)) * (0.35 + 0.65 * throttle)); n > 0; n--) {
      const b = E[Math.random() * E.length | 0], hot = b.t === "aft" && burnP > 0, lx = b.x * CELL + ex * (CELL / 2 + 2) - ey * rnd(-4, 4), ly = b.y * CELL + ey * (CELL / 2 + 2) + ex * rnd(-4, 4), v = rnd(140, 300) * (hot ? 1.6 : 1);
      spawn(P.x + lx * c - ly * s, P.y + lx * s + ly * c, P.vx * 0.3 + wx * v + rnd(-25, 25), P.vy * 0.3 + wy * v + rnd(-25, 25), hot ? rnd(0.18, 0.4) : rnd(0.35, 0.7), hot ? rnd(2.6, 3.8) : rnd(1.8, 2.8), hot ? Math.random() < 0.45 ? 2 : 6 : Math.random() < 0.6 ? 0 : 6);
    }
    if (S.brake) for (let n = cnt(1.5 * throttle); n > 0; n--) {
      const vx = P.vx / sp, vy = P.vy / sp;
      spawn(P.x + vx * (P.radius + 4), P.y + vy * (P.radius + 4), P.vx * 0.5 + vx * rnd(60, 140) + rnd(-40, 40), P.vy * 0.5 + vy * rnd(60, 140) + rnd(-40, 40), rnd(0.25, 0.5), rnd(2, 3), 6);
    }
    if (rib.length > 6) {
      if (S.mood === 1) for (let n = cnt(1.2); n > 0; n--) {
        const q = rib[Math.random() * rib.length * 0.7 | 0];
        spawn(q.x, q.y, rnd(-120, 120), rnd(-120, 120), rnd(0.15, 0.35), 2, Math.random() < 0.5 ? 2 : 0);
      }
      else if (S.mood === 3) for (let n = cnt(0.8); n > 0; n--) {
        const q = rib[Math.random() * rib.length | 0];
        spawn(q.x, q.y, rnd(-30, 30), rnd(-30, 30), rnd(0.4, 0.9), 2.2, 5);
      }
    }
    if (P.gyro && Math.abs(da) > 0.5) for (let n = cnt(1); n > 0; n--) {
      const sd = da > 0 ? 1 : -1;
      spawn(P.x - s * sd * P.radius * 0.8, P.y + c * sd * P.radius * 0.8, P.vx - s * sd * rnd(80, 160), P.vy + c * sd * rnd(80, 160), rnd(0.2, 0.4), 2, 6);
    }
  } else if (live) for (let n = cnt((0.6 + d * 1.5 + Math.min(2, P.eng * 0.3)) * (0.35 + 0.65 * throttle)); n > 0; n--) {
    const o = rnd(-0.7, 0.7) * P.radius, v = rnd(120, 280), f2 = o / P.radius * v * 0.55;
    spawn(P.x - tux * (P.radius + 3) - tuy * o, P.y - tuy * (P.radius + 3) + tux * o, P.vx * 0.3 - tux * v - tuy * f2, P.vy * 0.3 - tuy * v + tux * f2, rnd(0.35, 0.8), rnd(2, 3.4), Math.random() < 0.7 ? 1 : 0);
  }
  if (sp > 120 && (boost || sp > 0.7 * (P.vtop || 1e9))) {
    const nx2 = P.vx / sp, ny2 = P.vy / sp, tipx = P.x + nx2 * (P.radius + 16), tipy = P.y + ny2 * (P.radius + 16);
    for (let n = cnt(0.5 + Math.min(3, S.stream) * 2 + (boost ? 3 : 0)); n > 0; n--) {
      const sd = Math.random() < 0.5 ? 1 : -1, k2 = rnd(1.05, 1.45) * sp;
      spawn(tipx + rnd(-3, 3), tipy + rnd(-3, 3), P.vx * 0.04 - ny2 * sd * k2, P.vy * 0.04 + nx2 * sd * k2, rnd(0.45, 0.95), rnd(1.5, 2.8), Math.random() < 0.7 ? 0 : 6);
    }
  }
  for (let n = cnt(Math.min(2, P.coll * S.dens * 0.12) * (S.patch == null ? 1 : S.patch)); n > 0; n--) {
    const a = rnd(0, TAU), q = reach() * rnd(0.6, 1);
    spawn(P.x + Math.cos(a) * q, P.y + Math.sin(a) * q, P.vx - Math.cos(a) * q * 1.6, P.vy - Math.sin(a) * q * 1.6, 0.6, 2, 0);
  }
  ambient((0.35 + 2.2 * S.dens * (0.3 + 0.7 * (S.patch == null ? 1 : S.patch))) * clamp(1 / (zoom * zoom), 1, 5), 1.5);
  if (P.form) for (const b of P.blocks) {
    const [bx, by] = wpos(P, b);
    for (let n = cnt(Math.min(1.6, 45 / P.blocks.length)); n > 0; n--) spawn(bx + rnd(-9, 9), by + rnd(-9, 9), P.vx * 0.15 + rnd(-70, 70), P.vy * 0.15 + rnd(-70, 70), rnd(0.25, 0.6), rnd(2.2, 4), b.t === "core" ? 2 : Math.random() < 0.6 ? 0 : 1);
  }
}
function stepShield(dt, M, s) {
  S.smax = (30 + 10 * P.hull + TUNE.sgenVal * (P.sgen + TUNE.shcoreK * P.shcore)) * 1.15 * HK() * PK("shield") * PK("hp");
  if (P.form) {
    S.shield = 0;
    return;
  }
  if (SET.shieldSec) secSync();
  if (S.shield > S.smax) S.shield = Math.max(S.smax, S.shield - 60 * dt);
  if (S.t - S.lastHit > TUNE.shieldDelay * EK("sdelay") * (P.shcore ? TUNE.shcoreDelay : 1) && S.shield < S.smax && pool() > 1 && S.pri[3] !== 2) {
    const g = Math.min(S.smax - S.shield, 26 * (0.2 + 2 * s) * (M === 0 ? 1.7 : M === 1 ? 0.5 : 1) * HK() * dt);
    S.shield += g;
    spend(g * 0.18 * (S.pri[1] === 2 ? 1.6 : 1), "Shield regen");
  }
  if (S.shield < S.smax * 0.9) S.sOk = false;
  else if (S.shield >= S.smax && !S.sOk) {
    S.sOk = true;
    if (S.t > 3) sfx("sfull");
  }
  {
    const co = P.blocks.find((b) => b.t === "core");
    if (co && co.hp < BT.core.hp * 0.35 && S.t - S.alarmT > 2.2) {
      S.alarmT = S.t;
      sfx("alarm");
    }
  }
  for (const b of P.blocks) {
    if (b.ghost) continue;
    if (b.t === "ehull") {
      if (b.hp < BT.ehull.hp && pool() > 5) {
        b.hp = Math.min(BT.ehull.hp, b.hp + 8 * dt);
        spend(0.8 * dt, "Ether hull");
      }
    } else if (b.hp < maxHp(b) && S.shield >= S.smax * 0.98 && !S.frosting) b.hp = Math.min(maxHp(b), b.hp + 3 * dt);
  }
}
function stepWeapons(dt, w) {
  S.fireCd -= dt;
  S.miniCd -= dt;
  S.missCd -= dt;
  S.artCd = (S.artCd || 0) - dt;
  S.artFoe = null;
  if (P.form) return;
  if (P.arts.length) {
    const reach2 = 0.95 * TUNE.rangeLaser * TUNE.artRange * 900 * rngK() * 0.9, r2 = reach2 * reach2;
    let bd = 1e18;
    for (const e of enemies) {
      if (!e.awake || shelled(e)) continue;
      const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
      if (d2 < r2 && d2 < bd) {
        bd = d2;
        S.artFoe = e;
      }
    }
  }
  if (stepRail(dt)) return;
  const trig = mouse.down || keys.Space, rate = (0.5 + 1.5 * w) * EK("rate"), f = poolF(), racks = allRacks();
  if (S.limp) {
    S.fast = false;
    S.cdMax = [0.34 / rate / TUNE.limpLaser, 0.085 / rate, 1.5 / rate];
    const core = P.emit.filter((b) => b.t === "core");
    if (trig && S.fireCd <= 0 && core.length) {
      S.fireCd = 0.34 / rate / TUNE.limpLaser;
      fireFrom(P, core, w, 0, true);
    }
    return;
  }
  S.fast = f >= TUNE.chargeFull && racks.length > 0;
  S.cdMax = [0.34 / rate, 0.085 / rate, 1.5 / rate / (S.fast ? TUNE.chargeSpeed : 1)];
  if (S.fast && S.hostile > 0 && LOG) LOG.row.fast += dt;
  if (trig && S.fireCd <= 0) {
    S.fireCd = 0.34 / rate;
    fireFrom(P, P.emit, w, 0);
  }
  if (trig && S.miniCd <= 0 && P.minis.length) {
    S.miniCd = 0.085 / rate;
    fireFrom(P, P.minis, w, 1);
  }
  if ((trig || S.artFoe) && S.artCd <= 0 && P.arts.length) {
    S.artCd = TUNE.artCd / rate;
    fireFrom(P, P.arts, w, 3);
    if (!trig && LOG) LOG.artAuto = (LOG.artAuto | 0) + 1;
  }
  const full = mouse.mdown || keys.KeyF;
  if ((full || trig && S.hostile > 0) && S.missCd <= 0 && racks.length) {
    S.missCd = S.cdMax[2];
    volley(racks, w, full, f);
  }
}
function update(dt) {
  if (S.resume > 0) {
    S.resume -= dt;
    return;
  }
  if (S.t - (S.autoT || 0) > 30 && S.started && !S.over && waveLive <= 0) {
    S.autoT = S.t;
    save();
  }
  S.t += dt;
  const M = S.mood, G = safely;
  if (S.spawn > 0) S.spawn -= dt;
  if (S.frame % 6 === 0) S.cloud = cloudAt(P.x, P.y) * (1 - clamp(0.3 * (P.sensor || 0), 0, 0.9));
  G("bob", stepBob, dt);
  {
    const R = S.rail, rc = R && R.on ? clamp(R.spent / (0.8 * (R.p0 || 1)), 0, 1) : 0;
    S.ts += (1 - TUNE.railSlow * rc - (S.ts || 1)) * Math.min(1, dt * 8);
    if (!(S.ts > 0)) S.ts = 1;
  }
  const dw = dt * S.ts;
  G("power", stepPower, dt);
  const d = 0.45 * S.pw[0], s = 0.45 * S.pw[1], w = 0.45 * S.pw[2];
  if (tip >= 0 && tip < TIPS.length - 1 && S.wave === 0 && waveT > 0) waveT = Math.max(waveT, 6);
  G("mood", stepMood, dt, M);
  G("pool", stepPool, dt, M);
  G("flight", stepFlight, dt, d);
  G("shield", stepShield, dt, M, s);
  G("shell", stepShell, dt);
  if (waveLive > 0) {
    const sf = S.smax > 0 ? S.shield / S.smax : 1, tf = S.ether / Math.max(1, P.realCap), co = P.blocks.find((b) => b.t === "core"), cf = co ? co.hp / BT.core.hp : 1;
    if (sf < S.wMinSh) S.wMinSh = sf;
    if (tf < S.wMinTk) S.wMinTk = tf;
    if (cf < S.wMinCore) S.wMinCore = cf;
  }
  G("weapons", stepWeapons, dt, w);
  G("skip", stepSkip, dt);
  G("rebuild", stepRebuild, dt);
  G("fray", stepFray, dt);
  G("hollow", stepHollow, dt);
  G("corr", updCorr, dt);
  G("ghosts", updGhosts, dw);
  G("rifts", updRifts, dw);
  G("enemies", updEnemies, dw);
  if (S.over) return;
  if (S.frame % 6 === 0) G("chunks", ensureChunks);
  if (S.frame % 30 === 0) G("fog", markFog);
  G("wrecks", updWrecks, dw);
  G("zones", updZones, dw);
  G("copies", updCopies, dw);
  echoStep(dw);
  G("stations", updStations, dw);
  G("groups", updGroups, dw);
  G("stuckWave", checkStuckWave, dt);
  if (waveLive <= 0 && !rifts.length) {
    S.wt += dt;
    G("drift", driftSites);
    if (!S.hold) {
      if (!S.skip && !(S.dock && S.dock.ok)) waveT -= dt;
      if (waveT <= 0 && !S.skip) G("startWave", startWave);
    }
  }
  if (S.frame % 90 === 0) {
    const q = S.path[S.path.length - 1];
    if (!q || Math.hypot(q[0] - P.x, q[1] - P.y) > 500) {
      S.path.push([Math.round(P.x), Math.round(P.y)]);
      if (S.path.length > 1200) S.path = S.path.filter((_, i) => i % 2 === 0);
    }
  }
  G("pd", stepPD, dw);
  G("epd", stepEnemyPD, dw);
  G("bolts", updBolts, dw);
  G("rocks", updRocks, dw);
  G("motes", updMotes, dt);
  if (S.scrapAcc > 0 && (S.scrapAccT -= dt) <= 0) {
    floatText(P.x, P.y - P.radius - 26, "+" + Math.round(S.scrapAcc) + " scrap" + (S.scrapWhy ? " (" + S.scrapWhy + ")" : ""), false);
    S.scrapAcc = 0;
    S.scrapWhy = "";
  }
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.t -= dt;
    f.y -= 34 * dt;
    if (f.t <= 0) floats.splice(i, 1);
  }
  S.shake = Math.max(0, S.shake - dt * 3);
  G("log", logStep, dt);
}
