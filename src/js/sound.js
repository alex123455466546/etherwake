let fxBus = null, musBus = null, duckG = null, sfxOut = null, voices = 0, mus = null, rbHum = null, heartT = 0, zAmb = null;
const MUSIC_K = 0.37;
const FX_K = 3.2;
let musForce = null;
const dB = (v) => v <= 0 ? 0 : Math.pow(10, (v * 40 - 40) / 20);
function audio() {
  if (AC) {
    if (AC.state === "suspended") AC.resume();
    return;
  }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = 1;
    const lim = AC.createDynamicsCompressor();
    lim.threshold.value = -6;
    lim.knee.value = 2;
    lim.ratio.value = 20;
    lim.attack.value = 2e-3;
    lim.release.value = 0.12;
    master.connect(lim);
    lim.connect(AC.destination);
    duckG = AC.createGain();
    duckG.connect(master);
    fxBus = AC.createGain();
    fxBus.gain.value = dB(SET.vol) * FX_K;
    fxBus.connect(duckG);
    sfxOut = fxBus;
    const verb = AC.createConvolver(), len = Math.floor(AC.sampleRate * 0.9), ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d2 = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d2[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    verb.buffer = ir;
    const wet = AC.createGain();
    wet.gain.value = 0.14;
    fxBus.connect(verb);
    verb.connect(wet);
    wet.connect(duckG);
    noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.5), AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    humO = AC.createOscillator();
    humO.type = "triangle";
    humO.frequency.value = 46;
    humF = AC.createBiquadFilter();
    humF.type = "lowpass";
    humF.frequency.value = 110;
    humG = AC.createGain();
    humG.gain.value = 0;
    humO.connect(humF);
    humF.connect(humG);
    humG.connect(fxBus);
    humO.start();
    const wind = AC.createBufferSource(), wf = AC.createBiquadFilter();
    wind.buffer = noiseBuf;
    wind.loop = true;
    wf.type = "bandpass";
    wf.frequency.value = 240;
    wf.Q.value = 0.6;
    ambG = AC.createGain();
    ambG.gain.value = 0;
    wind.connect(wf);
    wf.connect(ambG);
    ambG.connect(fxBus);
    wind.start();
    const mkNoise = (type, freq, Q) => {
      const n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      n.buffer = noiseBuf;
      n.loop = true;
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = Q || 0.7;
      g.gain.value = 0;
      n.connect(f);
      f.connect(g);
      g.connect(fxBus);
      n.start();
      return { f, g };
    };
    const bo = AC.createOscillator(), bg = AC.createGain();
    bo.type = "sine";
    bo.frequency.value = 61;
    bg.gain.value = 0;
    bo.connect(bg);
    bg.connect(fxBus);
    bo.start();
    const dO = AC.createOscillator(), dG = AC.createGain();
    dO.type = "sine";
    dO.frequency.value = 180;
    dG.gain.value = 0;
    dO.connect(dG);
    dG.connect(fxBus);
    dO.start();
    zAmb = { rum: mkNoise("lowpass", 110), whisp: mkNoise("bandpass", 1700, 4), bloom: bg, drain: { o: dO, g: dG } };
    startMusic();
  } catch (e) {
    AC = null;
  }
}
function setVolumes() {
  if (!AC) return;
  const t = AC.currentTime;
  fxBus.gain.setTargetAtTime(dB(SET.vol) * FX_K, t, 0.05);
  musBus.gain.setTargetAtTime(dB(SET.music) * MUSIC_K, t, 0.05);
  if (trk && trk.direct) trk.els[trk.cur].volume = clamp(dB(SET.music), 0, 1);
}
function voice(o, g, t, dur) {
  voices++;
  o.onended = () => {
    voices--;
  };
  o.start(t);
  o.stop(t + dur + 0.03);
}
function tone(type, f0, f1, dur, vol) {
  const v = rnd(0.96, 1.04);
  f0 *= v;
  f1 *= v;
  vol *= rnd(0.85, 1);
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(1e-4, t);
  g.gain.linearRampToValueAtTime(vol, t + 6e-3);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  o.connect(g);
  g.connect(sfxOut);
  voice(o, g, t, dur);
}
function noise(dur, vol, freq) {
  const t = AC.currentTime, n = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  n.buffer = noiseBuf;
  f.type = "lowpass";
  f.frequency.value = freq;
  g.gain.setValueAtTime(1e-4, t);
  g.gain.linearRampToValueAtTime(vol, t + 4e-3);
  g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  n.connect(f);
  f.connect(g);
  g.connect(sfxOut);
  voice(n, g, t, dur);
}
function later(ms, fn) {
  const out = sfxOut;
  setTimeout(() => {
    if (!AC) return;
    const prev = sfxOut;
    sfxOut = out;
    try {
      fn();
    } catch (_) {
    }
    sfxOut = prev;
  }, ms);
}
function duck() {
  if (!AC) return;
  const t = AC.currentTime;
  duckG.gain.cancelScheduledValues(t);
  duckG.gain.setTargetAtTime(0.5, t, 0.03);
  duckG.gain.setTargetAtTime(1, t + 0.7, 0.25);
}
function sfx(n, x, y, arg) {
  if (!AC || SET.vol <= 0) return;
  const e = SFX[n], t = AC.currentTime;
  if (!e || t - (lastS[n] || -9) < e[0]) return;
  const warn = e[2] === "warn";
  if (voices >= 24 && !warn) return;
  let dest = fxBus;
  if (x != null) {
    const d = Math.hypot(x - P.x, y - P.y);
    if (d > 1800) return;
    const g = AC.createGain();
    g.gain.value = 1 - 0.85 * d / 1800;
    dest = g;
    if (AC.createStereoPanner) {
      const p = AC.createStereoPanner();
      p.pan.value = clamp((x - cam.x) * zoom / (W / 2), -1, 1) * 0.8;
      g.connect(p);
      p.connect(fxBus);
    } else g.connect(fxBus);
  }
  if (warn) {
    dest = AC.createGain();
    dest.gain.value = dB(SET.vol) * FX_K;
    dest.connect(master);
    duck();
  }
  lastS[n] = t;
  sfxOut = dest;
  try {
    e[1](arg);
  } catch (_) {
  }
  sfxOut = fxBus;
}
function rebuildHum(dur) {
  if (!AC || SET.vol <= 0) return;
  stopHum();
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(90, t);
  o.frequency.linearRampToValueAtTime(380, t + dur);
  g.gain.setValueAtTime(1e-4, t);
  g.gain.linearRampToValueAtTime(0.035, t + 0.2);
  g.gain.setValueAtTime(0.035, t + Math.max(0.2, dur - 0.05));
  g.gain.linearRampToValueAtTime(1e-4, t + dur);
  o.connect(g);
  g.connect(fxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
  rbHum = { o, g };
}
function stopHum() {
  if (rbHum) {
    try {
      const t = AC.currentTime;
      rbHum.g.gain.cancelScheduledValues(t);
      rbHum.g.gain.setTargetAtTime(1e-4, t, 0.03);
      rbHum.o.stop(t + 0.15);
    } catch (_) {
    }
    rbHum = null;
  }
}
const CHORDS = { corrupt: [[0, 6, 12, 18], [1, 7, 13, 19], [-1, 5, 11, 17]], edge: [[0, 6], [1, 7], [0, 13]], base: [[0, 7, 12, 16], [5, 12, 17, 21], [-3, 4, 9, 12], [2, 9, 14, 17]], bloom: [[0, 7, 16, 19], [5, 12, 16, 21], [7, 14, 19, 23], [0, 9, 16, 19]], shallows: [[0, 12], [5, 17], [-3, 9], [2, 14]] };
function layer() {
  const g = AC.createGain();
  g.gain.value = 0;
  g.connect(musBus);
  return g;
}
let mp = null, mpBus = null;
const COMPOSED_K = 0.7;
function startMusic() {
  musBus = AC.createGain();
  musBus.gain.value = dB(SET.music) * MUSIC_K;
  try {
    mpBus = AC.createGain();
    mpBus.gain.value = 0;
    mpBus.connect(musBus);
    mp = MusicPlayer(AC, mpBus);
    mp.drive();
    mp.onPiece = (id, name) => ev("music", id + " " + name);
  } catch (e) {
    mp = null;
  }
  mus = { filter: AC.createBiquadFilter(), next: 0, chord: 0, beatT: 0, arpT: 0, arpI: 0, notes: [0, 7, 12, 16] };
  mus.filter.type = "lowpass";
  mus.filter.frequency.value = 12e3;
  musBus.connect(mus.filter);
  mus.filter.connect(duckG);
  const padF = AC.createBiquadFilter();
  padF.type = "lowpass";
  padF.frequency.value = 900;
  mus.pad = layer();
  padF.connect(mus.pad);
  mus.voices = [0, 1, 2, 3].map(() => {
    const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain();
    o.type = "triangle";
    o2.type = "sine";
    o2.detune.value = 8;
    g.gain.value = 0;
    o.connect(g);
    o2.connect(g);
    g.connect(padF);
    o.start();
    o2.start();
    return { o, o2, g };
  });
  mus.pulse = layer();
  mus.shim = layer();
  mus.dark = layer();
  mus.track = AC.createGain();
  mus.track.connect(musBus);
  mus.rise = layer();
  mus.shep = [0, 1, 2, 3, 4, 5].map(() => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "sine";
    g.gain.value = 0;
    o.connect(g);
    g.connect(mus.rise);
    o.start();
    return { o, g };
  });
  mus.shepP = 0;
  mus.heartT = 0;
  mus.stepI = 0;
  {
    const to = AC.createOscillator(), tf = AC.createBiquadFilter();
    to.type = "sawtooth";
    to.frequency.value = 58;
    tf.type = "lowpass";
    tf.frequency.value = 220;
    mus.trit = layer();
    to.connect(tf);
    tf.connect(mus.trit);
    to.start();
  }
  const dk = AC.createOscillator(), df = AC.createBiquadFilter();
  dk.type = "sawtooth";
  dk.frequency.value = 41;
  df.type = "lowpass";
  df.frequency.value = 130;
  dk.connect(df);
  df.connect(mus.dark);
  dk.start();
}
function note(dest, type, f, t0, dur, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(1e-4, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function beat(dest, t0) {
  const n = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
  n.buffer = noiseBuf;
  f.type = "lowpass";
  f.frequency.value = 180;
  g.gain.setValueAtTime(0.12, t0);
  g.gain.exponentialRampToValueAtTime(1e-4, t0 + 0.18);
  n.connect(f);
  f.connect(g);
  g.connect(dest);
  n.start(t0);
  n.stop(t0 + 0.2);
}
let trk = null;
function startTrack() {
  if (trk || SET.track !== "spaceify" || !AC) return;
  const direct = location.protocol === "file:";
  trk = { els: [], gains: [], cur: 0, next: 0, failed: false, on: false, direct };
  for (let i = 0; i < 2; i++) {
    const a = new Audio();
    a.preload = "auto";
    a.src = TRACK.src;
    a.addEventListener("error", () => {
      if (trk) trk.failed = true;
    });
    a.addEventListener("playing", () => {
      if (trk) trk.on = true;
    });
    if (!direct) {
      const g = AC.createGain();
      g.gain.value = 0;
      AC.createMediaElementSource(a).connect(g);
      g.connect(mus.track);
      trk.gains.push(g);
    } else a.volume = 0;
    trk.els.push(a);
  }
  playTurn(0, 1.5);
}
function stopTrack() {
  if (!trk) return;
  for (const a of trk.els) {
    a.pause();
    a.removeAttribute("src");
    a.load();
  }
  trk = null;
}
function playTurn(i, f) {
  const t = AC.currentTime, a = trk.els[i], b = trk.els[1 - i];
  trk.cur = i;
  try {
    a.currentTime = 0;
  } catch (_) {
  }
  const p = a.play();
  if (p && p.catch) p.catch(() => {
  });
  if (trk.direct) {
    fadeEl(a, 1, f);
    fadeEl(b, 0, f);
    setTimeout(() => {
      if (trk && trk.cur === i) b.pause();
    }, f * 1e3 + 200);
    return;
  }
  trk.gains[i].gain.cancelScheduledValues(t);
  trk.gains[i].gain.setValueAtTime(trk.gains[i].gain.value, t);
  trk.gains[i].gain.linearRampToValueAtTime(TRACK.gain, t + f);
  const g = trk.gains[1 - i].gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0, t + f);
  setTimeout(() => {
    if (trk && trk.cur === i) b.pause();
  }, f * 1e3 + 200);
}
function fadeEl(a, to, f) {
  const from = a.volume, t0 = performance.now(), step = () => {
    if (!trk) return;
    const k = Math.min(1, (performance.now() - t0) / (f * 1e3));
    a.volume = clamp((from + (to - from) * k) * dB(SET.music), 0, 1);
    if (k < 1) requestAnimationFrame(step);
  };
  step();
}
const trackLive = () => !!trk && !trk.failed;
const euclid = (k, n, i) => Math.floor((i + 1) * k / n) !== Math.floor(i * k / n);
function dangerNow() {
  if (!(S.started && !S.over)) return 0;
  let d = 0;
  const co = P.blocks.find((b) => b.t === "core"), cf = co ? co.hp / BT.core.hp : 1;
  let near = 1e9;
  for (const e of enemies) if (e.awake) {
    const q = Math.hypot(e.x - P.x, e.y - P.y);
    if (q < near) near = q;
  }
  if (near < 3500) d = Math.max(d, 1 - near / 3500);
  if (waveLive > 0) d = Math.max(d, 0.35);
  if (waveLive > 0 && S.smax > 0 && S.shield <= 0) d = Math.max(d, 0.7);
  if (pool() < P.cap * 0.15 && waveLive > 0) d = Math.max(d, 0.75);
  if (cf < 0.4) d = Math.max(d, 0.9);
  if (enemies.some((e) => ET[e.type] && ET[e.type].boss || e.type === "reflection")) d = Math.max(d, 0.8);
  return clamp(d, 0, 1);
}
function musicStep() {
  if (!mus) return;
  const live0 = S.started && !S.over, wantTrack = SET.track === "spaceify" && SET.music > 0 && !live0;
  if (wantTrack && !trk) startTrack();
  else if (!wantTrack && trk && !trk.fading) {
    trk.fading = 1;
    const t0 = AC.currentTime;
    if (trk.gains.length) for (const g of trk.gains) {
      g.gain.cancelScheduledValues(t0);
      g.gain.setValueAtTime(g.gain.value, t0);
      g.gain.linearRampToValueAtTime(0, t0 + 1.8);
    }
    else for (const a of trk.els) fadeEl(a, 0, 1.8);
    setTimeout(() => {
      if (trk && trk.fading) stopTrack();
    }, 2e3);
  }
  if (trk && !trk.failed && !trk.fading) {
    const a = trk.els[trk.cur];
    if (a.currentTime >= TRACK.loop && trk.next !== a) {
      trk.next = a;
      playTurn(1 - trk.cur, TRACK.fade);
    } else if (a.currentTime < TRACK.loop) trk.next = 0;
  }
  if (SET.music <= 0) return;
  const t = AC.currentTime, live = live0, M = S.mood, hol = live && M === 3, mine = !!trk && !trk.failed && !trk.fading && !live, root = (mine ? TRACK.key : 110) * (hol ? 0.97 : 1), F = musForce && t < musForce.until ? musForce : null, solo = F && F.solo, dgRaw = F && F.dg != null ? F.dg : dangerNow(), corr = solo ? solo === "tritone" : live && (S.biome === "corrupt" || corrDen(P.x, P.y) > 0.5), edge = !solo && live && S.depth > 0;
  mus.dgS = (mus.dgS || 0) + (dgRaw - (mus.dgS || 0)) * Math.min(1, DT * (dgRaw > (mus.dgS || 0) ? 1.5 : 0.25));
  const dg = mus.dgS;
  if (mp && !solo) {
    composedStep(live, dg, corr, edge, hol, t);
    for (const gg of [mus.pad, mus.pulse, mus.shim, mus.dark, mus.trit, mus.rise]) gg.gain.setTargetAtTime(0, t, 0.5);
    mus.track.gain.setTargetAtTime(1, t, 0.5);
    mus.filter.frequency.setTargetAtTime(12e3, t, 0.6);
    musBus.gain.setTargetAtTime(dB(SET.music) * MUSIC_K, t, 0.8);
    return;
  }
  if (t >= mus.next) {
    mus.next = t + rnd(8, 16);
    mus.chord++;
    const set = CHORDS[corr ? "corrupt" : edge ? "edge" : S.biome === "bloom" ? "bloom" : S.biome === "shallows" ? "shallows" : "base"], ch = set[mus.chord % set.length];
    mus.notes = ch;
    if (mine) mus.notes = [0, 4, 7, 10, 12];
    mus.voices.forEach((v, i) => {
      const on = i < ch.length, f = root * Math.pow(2, (ch[i % ch.length] - 12) / 12);
      v.o.frequency.setTargetAtTime(f, t, 1.2);
      v.o2.frequency.setTargetAtTime(f * (hol ? 1.01 : 1), t, 1.2);
      v.g.gain.setTargetAtTime(on ? 0.05 : 0, t, 1);
    });
  }
  const boss = solo ? solo === "drone" : live && enemies.some((e) => ET[e.type] && ET[e.type].boss || e.type === "reflection"), tense = solo ? solo === "pulse" : live && (M === 1 || dg > 0.45), arp = solo ? solo === "arpeggio" : live && M === 2, shimOn = solo ? solo === "arpeggio" : live && (M === 2 || dg < 0.3 && M !== 1 && S.biome === "bloom");
  mus.pad.gain.setTargetAtTime(solo ? solo === "pad" ? 1 : 0 : mine ? 0 : live ? edge ? 0.5 : 1 : 0.6, t, 1);
  mus.pulse.gain.setTargetAtTime(tense ? 1 : 0, t, 0.8);
  mus.shim.gain.setTargetAtTime(shimOn ? 1 : 0, t, 0.8);
  mus.dark.gain.setTargetAtTime(boss ? 0.5 : 0, t, 1.5);
  mus.track.gain.setTargetAtTime(solo ? solo === "track" ? 1 : 0 : 1, t, 0.5);
  mus.trit.gain.setTargetAtTime(corr ? 0.5 : 0, t, 2);
  mus.filter.frequency.setTargetAtTime(hol ? 480 : 12e3, t, 0.6);
  musBus.gain.setTargetAtTime(dB(SET.music) * MUSIC_K * (live && M === 1 ? 0.67 : 1), t, 0.8);
  const sp = 0.05 + 0.12 * dg;
  mus.shepP = (mus.shepP + sp * DT) % 6;
  mus.shep.forEach((q, i) => {
    const pos = (i + mus.shepP) % 6, f = root * 0.5 * Math.pow(2, pos), gv = Math.exp(-((pos - 3) ** 2) / (2 * 1.1 * 1.1)) * 0.07;
    q.o.frequency.setTargetAtTime(f, t, 0.1);
    q.g.gain.setTargetAtTime(gv, t, 0.1);
  });
  mus.rise.gain.setTargetAtTime(solo ? solo === "riser" ? 1 : 0 : live && dg > 0.55 ? clamp((dg - 0.55) * 2.2, 0, 1) : 0, t, 1.2);
  if (tense) {
    const k = Math.round(3 + 4 * dg);
    while (mus.beatT < t + 0.25) {
      const bt = Math.max(mus.beatT, t + 0.02);
      if (euclid(k, 8, mus.stepI % 8)) {
        beat(mus.pulse, bt);
        note(mus.pulse, "sine", root / 2 * Math.pow(2, mus.notes[0] / 12), bt, 0.35, 0.09);
      }
      mus.stepI++;
      mus.beatT = bt + 0.25;
    }
  } else mus.beatT = t;
  if (arp) {
    while (mus.arpT < t + 0.25) {
      const at = Math.max(mus.arpT, t + 0.02), n = mus.notes[mus.arpI++ % mus.notes.length];
      note(mus.shim, "sine", root * 4 * Math.pow(2, n / 12), at, 0.35, 0.025);
      mus.arpT = at + 0.22;
    }
  } else mus.arpT = t;
  const co = live ? P.blocks.find((b) => b.t === "core") : null, lowD = solo ? solo === "heart" : live && (co && co.hp / BT.core.hp < 0.4 || pool() < P.cap * 0.15 && waveLive > 0 || waveLive > 0 && S.smax > 0 && S.shield <= 0);
  if (lowD) mus.hbLast = S.t;
  if (solo === "heart") mus.hbOn = 0;
  if (S.t - (mus.hbLast == null ? -99 : mus.hbLast) < 4) {
    if (!mus.hbOn) {
      mus.hbOn = S.t;
    }
    const hv = S.t - mus.hbOn < 6 ? 1 : 0.35;
    if (t >= mus.heartT) {
      mus.heartT = t + 0.85;
      note(musBus, "sine", 58, t, 0.2, 0.2 * hv);
      note(musBus, "sine", 46, t + 0.17, 0.22, 0.14 * hv);
    }
  } else mus.hbOn = 0;
  const key = [mine ? "track" : "synth", tense ? "pulse" : "", dg > 0.55 ? "riser" : "", corr ? "tritone" : "", boss ? "drone" : "", mus.hbOn ? "heart" : "", edge ? "edge" : ""].filter(Boolean).join("+");
  if (key !== mus.key && S.t - (mus.keyT || -99) > 10) {
    mus.key = key;
    mus.keyT = S.t;
    ev("music", key + " danger " + dg.toFixed(2));
  }
}
function composedStep(live, dg, corr, edge, hol, t) {
  if (!live) {
    mpBus.gain.setTargetAtTime(0, t, 0.8);
    return;
  }
  mpBus.gain.setTargetAtTime(COMPOSED_K, t, 0.8);
  const co = P.blocks.find((b) => b.t === "core"), cf = co ? co.hp / BT.core.hp : 1;
  const last = enemies.some((e) => e.type === "reflection"), bossE = enemies.some((e) => ET[e.type] && ET[e.type].boss);
  let lv = 0;
  if (last) lv = 5;
  else if (cf < 0.35 && dg > 0.3) lv = 4;
  else if (bossE) lv = 3;
  else if (waveLive > 0 && (S.smax > 0 && S.shield <= 0 || cf < 0.6 || pool() < P.cap * 0.15)) lv = 2;
  else if (waveLive > 0 || dg > 0.5) lv = 1;
  const region = edge ? "edge" : hol ? "hollows" : corr ? "corrupt" : RT[S.biome] ? S.biome : "drift";
  mp.set(null, region, lv);
  mp.tick();
}
function devSound(n, arg) {
  if (!AC) audio();
  if (!AC || !SFX[n]) return false;
  lastS[n] = -9;
  sfx(n, null, null, arg);
  return true;
}
function devSolo(solo, secs) {
  if (!AC) audio();
  if (!AC) return;
  musForce = solo === "off" ? null : { solo, dg: solo === "riser" ? 1 : null, until: AC.currentTime + (secs || 6) };
  if (mus) {
    mus.next = 0;
    if (musForce && musForce.dg != null) mus.dgS = musForce.dg;
  }
}
function devDanger(v) {
  if (!AC) audio();
  if (!AC) return;
  musForce = { solo: null, dg: clamp(v, 0, 1), until: AC.currentTime + 30 };
}
function soundscape() {
  if (!AC) return;
  const t = AC.currentTime, live = S.started && !S.paused && !S.over, sp = Math.hypot(P.vx, P.vy);
  humG.gain.setTargetAtTime(live && S.thr ? (S.boost ? 0.03 : 0.022) * (P.form ? 1.5 : 1) * (0.4 + 0.6 * clamp(P.tu, 0, 1)) : 0, t, S.boost ? 0.22 : 0.08);
  humO.frequency.setTargetAtTime(46 + Math.min(70, sp * 0.06) + (S.boost ? 22 : 0), t, 0.1);
  humF.frequency.setTargetAtTime(160 + Math.min(900, sp * 0.5), t, 0.1);
  ambG.gain.setTargetAtTime(live ? (P.form ? 0.06 : S.mood === 3 ? 0.015 : 0) + (S.depth > 0 ? 0.03 + Math.min(0.12, S.depth / 3e4) : 0) : 0, t, 0.3);
  if (live && S.depth > 0 && Math.random() < Math.min(0.25, S.depth / 16e3)) sfx("crackle");
  if (live && S.depth >= TUNE.edgeStrange && Math.random() < (S.depth >= TUNE.edgeBreak ? 0.012 : 4e-3)) sfx("creak");
  if (zAmb) {
    const hq = live ? clamp((S.hd || 0) / TUNE.holCold, 0, 1) : 0;
    fxBus.gain.setTargetAtTime(dB(SET.vol) * FX_K * (1 - 0.7 * hq), t, 0.5);
    let near = 0;
    if (live) for (const e of enemies) {
      if (!e.awake) continue;
      const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
      if (d2 > 1500 * 1500 && d2 < 5500 * 5500) near++;
    }
    zAmb.rum.g.gain.setTargetAtTime(live ? Math.min(0.05, near * 4e-3) : 0, t, 0.5);
    zAmb.whisp.g.gain.setTargetAtTime(live ? 0.03 * (S.corr || 0) * (0.6 + 0.4 * Math.sin(t * 0.7)) : 0, t, 0.4);
    zAmb.whisp.f.frequency.setTargetAtTime(1500 + 700 * Math.sin(t * 0.9), t, 0.3);
    zAmb.bloom.gain.setTargetAtTime(live && S.biome === "bloom" ? 0.03 : 0, t, 1);
    const dr = live && S.t - (S.drawT || -9) < 0.4;
    zAmb.drain.g.gain.setTargetAtTime(dr ? 6e-3 + 0.016 * (S.drawK || 0) : 0, t, 0.25);
    zAmb.drain.o.frequency.setTargetAtTime(160 + 110 * (S.drawK || 0), t, 0.3);
  }
  const co = S.started && !S.over ? P.blocks.find((b) => b.t === "core") : null;
  musicStep();
}
