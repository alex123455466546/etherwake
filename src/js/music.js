const MSCALE = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], major: [0, 2, 4, 5, 7, 9, 11], pent: [0, 3, 5, 7, 10], phryg: [0, 1, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
function euclidBar(k, n) {
  const p = [];
  let b = 0;
  for (let i = 0; i < n; i++) {
    const nb = Math.floor((i + 1) * k / n);
    p.push(nb > b ? "x" : ".");
    b = nb;
  }
  let s = p.join("");
  while (s.length < 16) s += s;
  return s.slice(0, 16);
}
const MPIECE = {
  drift: [
    { name: "Drift A: slow minor", scale: "minor", prog: [0, 5, 2, 6, 0, 5, 3, 4], motif: [[0, 1], [2, 0.5], [4, 0.5], [3, 1], [2, 1], [0, 0.5], [-1, 0.5], [0, 2]], bass: "long", drums: "none", bpm: 0, busy: 1 },
    { name: "Drift B: slow pendulums", scale: "dorian", prog: [0, 3, 5, 3, 0, 3, 6, 4], motif: [[4, 2], [2, 1], [0, 1], [-1, 2], [0, 2]], bass: "long", drums: "none", bpm: -4, busy: 0.8, arp: "pendulum", arpV: 0.018 },
    { name: "Drift C: a question and an answer", scale: "minor", prog: [0, 6, 0, 6, 3, 4, 0, 0], motif: [[0, 1], [3, 1], [2, 2], [-1, 1], [0, 1], [2, 2]], bass: "long", drums: "none", bpm: -2, busy: 0.9, round: 6 }
  ],
  bloom: [
    { name: "Bloom A: lydian, brushed", scale: "lydian", prog: [0, 1, 4, 0, 3, 1, 4, 0], motif: [[4, 0.5], [6, 0.5], [7, 1], [6, 0.5], [4, 0.5], [2, 1], [4, 2], [0, 2]], bass: "long", drums: "brush", bpm: 6, busy: 1.1 },
    { name: "Bloom B: Pascal harp", scale: "lydian", prog: [0, 4, 1, 4, 0, 3, 4, 0], motif: [[0, 1], [4, 1], [6, 2], [4, 1], [2, 1], [0, 2]], bass: "long", drums: "brush", bpm: 2, busy: 1, arp: "pascal", arpV: 0.028 },
    { name: "Bloom C: a waltz feel, bright", scale: "lydian", prog: [0, 3, 4, 0, 1, 4, 0, 0], motif: [[4, 1.5], [6, 0.5], [7, 1], [6, 1.5], [4, 0.5], [2, 1], [0, 2]], bass: "walk", drums: "brush", bpm: 4, busy: 1, round: 6 }
  ],
  shallows: [
    { name: "Shallows A: pentatonic, sparse", scale: "pent", prog: [0, 3, 0, 4, 0, 3, 1, 0], motif: [[0, 2], [2, 2], [1, 1], [0, 3]], bass: "long", drums: "none", bpm: -8, busy: 0.6 },
    { name: "Shallows B: bells over a held chord, quiet now", scale: "pent", prog: [0, 0, 3, 3, 0, 0, 4, 0], motif: [[4, 1.5], [3, 0.5], [2, 2], [0, 4]], bass: "none", drums: "none", bpm: -10, busy: 0.5, bells: true },
    { dead: true, name: "Shallows C: a slow tide, two chords", scale: "pent", prog: [0, 0, 0, 0, 3, 3, 3, 3], motif: [[0, 2], [1, 2], [2, 3], [1, 1]], bass: "long", drums: "none", bpm: -12, busy: 0.5, round: 6 },
    { dead: true, name: "Shallows D: pentatonic with a brushed pulse", scale: "pent", prog: [0, 3, 0, 3, 0, 4, 3, 0], motif: [[2, 1], [4, 1], [2, 0.5], [1, 0.5], [0, 2], [1, 1], [0, 2]], bass: "long", drums: "brush", bpm: -4, busy: 0.7, round: 6 },
    { name: "Shallows E: a far pad and a single rising line", scale: "pent", prog: [0, 0, 0, 0, 0, 0, 3, 0], motif: [[0, 2], [1, 2], [2, 2], [4, 2]], bass: "none", drums: "none", bpm: -10, busy: 0.4, padV: 0.07, round: 6 }
  ],
  belt: [
    { dead: true, name: "Belt A: rocks and a light walking bass", scale: "dorian", prog: [0, 3, 0, 3, 5, 3, 0, 4], motif: [[0, 0.5], [0, 0.5], [3, 1], [2, 0.5], [0, 0.5], [5, 1], [4, 2], [2, 2]], bass: "walk", drums: "none", bpm: 4, busy: 1, bassV: 0.12, rocks: true, padType: "sine" },
    { dead: true, name: "Belt B: rocks, a tune in thirds", scale: "mixo", prog: [0, 0, 3, 3, 0, 0, 4, 4], motif: [[0, 0.5], [2, 0.5], [4, 1], [2, 0.5], [0, 0.5], [-1, 1], [0, 2]], bass: "eighths", drums: "none", bpm: 6, busy: 1, bassV: 0.12, rocks: true, padType: "sine" },
    { dead: true, name: "Belt C: rocks only, a cold drone and a slow line", scale: "dorian", prog: [0, 0, 0, 0, 5, 5, 0, 0], motif: [[0, 3], [2, 1], [0, 2], [-1, 2]], bass: "long", drums: "none", bpm: -6, busy: 0.6, bassV: 0.1, rocks: true, padType: "sine", round: 6 },
    { name: "Belt D: rocks and a careful walking tune", scale: "minor", prog: [0, 3, 5, 3, 0, 3, 4, 0], motif: [[0, 1], [2, 1], [3, 1], [2, 0.5], [0, 0.5], [-1, 2]], bass: "walk", drums: "far", bpm: 0, busy: 0.8, bassV: 0.1, rocks: true, padType: "sine", round: 6 },
    { name: "Belt E: rocks, far drums, a tune that climbs and falls back", scale: "minor", prog: [0, 0, 3, 3, 5, 5, 4, 0], motif: [[0, 1], [2, 1], [4, 1], [5, 0.5], [4, 0.5], [2, 1], [0, 2]], bass: "long", drums: "far", bpm: -2, busy: 0.8, bassV: 0.1, rocks: true, padType: "sine", round: 7 },
    { name: "Belt F: rocks and a slow walking bass, minor", scale: "minor", prog: [0, 3, 0, 3, 6, 3, 4, 0], motif: [[2, 2], [0, 1], [-1, 1], [0, 2], [3, 2]], bass: "walk", drums: "far", bpm: -4, busy: 0.7, bassV: 0.1, rocks: true, padType: "sine", round: 7 },
    { name: "Belt G: rocks, a low pad and two slow notes", scale: "dorian", prog: [0, 0, 0, 0, 3, 3, 0, 0], motif: [[0, 4], [2, 4]], bass: "long", drums: "far", bpm: -6, busy: 0.6, bassV: 0.08, rocks: true, padType: "sine", padV: 0.07, round: 7 }
  ],
  boneyard: [
    { name: "Boneyard A: slow and hollow", scale: "minor", prog: [0, 0, 5, 5, 2, 2, 6, 4], motif: [[0, 3], [-1, 1], [0, 2], [2, 2]], bass: "long", drums: "none", bpm: -10, busy: 0.8, colour: "hollow" },
    { name: "Boneyard B: far drums, a low choir", scale: "minor", prog: [0, 0, 6, 6, 0, 0, 3, 4], motif: [[2, 2], [0, 2], [-1, 2], [0, 2]], bass: "long", drums: "far", bpm: -12, busy: 0.7, colour: "hollow", choir: true },
    { name: "Boneyard C: a dirge, slow steps down", scale: "minor", prog: [0, 0, 6, 6, 5, 5, 4, 4], motif: [[4, 2], [3, 2], [2, 2], [0, 2]], bass: "long", drums: "none", bpm: -14, busy: 0.6, colour: "hollow", round: 6 },
    { name: "Boneyard D: a creaking hull, the choir alone", scale: "harm", prog: [0, 0, 0, 0, 6, 6, 0, 0], motif: [[0, 4], [1, 2], [0, 2]], bass: "none", drums: "far", bpm: -12, busy: 0.5, colour: "hollow", choir: true, round: 6 }
  ],
  reach: [
    { name: "Pirate Reach A: a long arch", scale: "lydian", prog: [0, 4, 0, 4, 1, 4, 5, 0], motif: [[0, 1], [2, 1], [4, 1], [7, 1], [6, 1], [4, 1], [2, 2]], bass: "long", drums: "brush", bpm: 0, busy: 0.9 },
    { name: "Pirate Reach B: circle of fifths", scale: "major", prog: "fifths", motif: [[0, 1], [4, 1], [2, 1], [4, 1], [7, 2], [4, 2]], bass: "long", drums: "brush", bpm: 2, busy: 0.9 },
    { dead: true, name: "Pirate Reach C: a shanty, swagger in the bass", scale: "dorian", prog: [0, 0, 3, 4, 0, 0, 6, 4], motif: [[0, 0.75], [0, 0.25], [2, 0.5], [4, 0.5], [3, 0.75], [2, 0.25], [0, 1], [-3, 1]], bass: "shanty", drums: "shanty", bpm: 4, busy: 1.1 }
  ],
  hollows: [
    { name: "Hollows A: two notes, far away, quieter", scale: "dorian", prog: [0, 0, 0, 0, 5, 5, 0, 0], motif: [[0, 6], [2, 2]], bass: "none", drums: "none", bpm: -14, busy: 0.5, colour: "muffled", leadV: 0.03, padV: 0.05 },
    { name: "Hollows B: muffled heartbeat", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 6, 0], motif: [[0, 8]], bass: "none", drums: "none", bpm: -14, busy: 0.4, colour: "muffled", heart: 52 },
    { name: "Hollows C: muffled, a slow pendulum of three notes", scale: "dorian", prog: [0, 0, 0, 0, 3, 3, 0, 0], motif: [[0, 2], [2, 2], [4, 4]], bass: "none", drums: "none", bpm: -14, busy: 0.4, colour: "muffled", arp: "pendulum", arpV: 0.012, round: 6 }
  ],
  corrupt: [
    { name: "Corruption A: phrygian, tritone", scale: "phryg", prog: [0, 1, 0, 1, 3, 1, 0, 1], motif: [[1, 0.5], [0, 0.5], [1, 0.5], [0, 0.5], [4, 1], [3, 1], [1, 2], [0, 2]], bass: "eighths", drums: "brush", bpm: 4, busy: 1.2, colour: "wrong" },
    { name: "Corruption B: logistic map", scale: "phryg", prog: [0, 0, 1, 0, 0, 0, 1, 0], motif: [[0, 2], [1, 2], [0, 4]], bass: "eighths", drums: "brush", bpm: 6, busy: 1.2, colour: "wrong", arp: "logistic", arpV: 0.022 }
  ],
  edge: [
    { name: "Edge A: almost nothing", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[0, 4], [4, 4]], bass: "long", drums: "none", bpm: -16, busy: 0.3, colour: "void", bassV: 0.07 },
    { name: "Edge B: a line falling, very quietly", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[7, 2], [6, 2], [4, 2], [2, 2]], bass: "none", drums: "none", bpm: -16, busy: 0.3, colour: "void" },
    { name: "Edge C: two far notes, a fifth apart", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[0, 4], [4, 4]], bass: "none", drums: "none", bpm: -18, busy: 0.3, colour: "void", round: 6 },
    { name: "Edge D: the void with a slow heartbeat", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[0, 8]], bass: "none", drums: "none", bpm: -16, busy: 0.3, colour: "void", heart: 40, round: 6 }
  ],
  /* the duel: the Warden or the challenger. Slow and heavy, two pieces of their own */
  boss: [
    { dead: true, name: "Duel A: a tolling bell, half-time war drums" },
    { name: "Duel B: a tritone drone, a low brass line, reworked (slower, the brass softer, heavier drums)", scale: "harm", prog: [0, 0, 6, 6, 0, 0, 1, 4], motif: [[0, 2], [4, 1], [3, 1], [6, 2], [4, 2]], bass: "half", drums: { k: "x.......x.......", s: "....x.......x...", h: [4, 16], war: true }, bpm: -10, busy: 1.1, boss: true, colour: "wrong", drone: true, brass: true, brassV: 0.06, round: 7 }
  ],
  /* wave 100, the Last Reflection: a dark mirror of your own ship, so a mirror of the open-space tune: Drift A turned upside down,
     harmonic minor, slow, the tritone under it, a pulse like the Corruption's; when it splits (after 16 bars) the hats come in and it speeds up */
  last: [
    { dead: true, name: "Wave 100, the Last Reflection: your own tune, upside down" },
    { name: "Wave 100 B: a quiet mirror of your tune under a riser, the drop at bar 8, the split at 16", scale: "harm", prog: [0, 5, 2, 6, 0, 5, 3, 4], motif: [[0, 1], [-2, 0.5], [-4, 0.5], [-3, 1], [-2, 1], [0, 0.5], [1, 0.5], [0, 2]], bass: "pound", drums: { k: "x...x...x...x...", s: "....x.......x..x", h: [8, 16], war: true }, bpm: -4, busy: 1.3, boss: true, colour: "wrong", drone: true, choir: true, toll: true, last: true, round: 8 },
    { name: "Wave 100 C: the last stand, war drums from the first beat, your tune straight and a second voice", scale: "harm", prog: [0, 5, 2, 6, 0, 5, 3, 4], motif: [[0, 1], [2, 0.5], [4, 0.5], [3, 1], [2, 1], [0, 0.5], [-1, 0.5], [0, 2]], bass: "drive", drums: { k: [5, 8], s: "....x.......x..x", h: [11, 16], war: true }, bpm: 6, busy: 1.4, boss: true, colour: "wrong", choir: true, toll: true, last: true, build: false, round: 9 },
    { name: "Wave 100 D: the machine, a relentless bass, the logistic map going to chaos, a brass line over it", scale: "phryg", prog: [0, 1, 0, 1, 3, 1, 0, 1], motif: [[0, 2], [1, 1], [0, 1], [4, 2], [3, 2]], bass: "pound", drums: { k: "x.x.x.x.x.x.x.x.", s: "....x.......x...", h: [16, 16] }, bpm: 4, busy: 1.4, boss: true, colour: "wrong", drone: true, brass: true, brassV: 0.07, arp: "logistic", arpV: 0.04, last: true, build: false, round: 9 },
    { name: "Wave 100 E: a requiem, huge and slow, bells every bar, a choir, brass, a riser into every section", scale: "minor", prog: [0, 0, 6, 6, 3, 3, 4, 4], motif: [[0, 2], [4, 2], [3, 1], [2, 1], [0, 4]], bass: "half", drums: { k: "x.......x.......", s: "........x.......", h: [4, 16], war: true }, bpm: -12, busy: 1.1, boss: true, drone: true, choir: true, toll: "every", brass: true, brassV: 0.08, riser: "up", riserV: 0.07, last: true, build: false, round: 9 }
  ],
  /* dying: the core is low. Less is the point: everything drops out but a heartbeat, a sub and a far tone */
  dying: [
    { dead: true, name: "Dying A: heartbeat, a quiet falling tone", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[0, 8]], bass: "none", drums: "none", bpm: 0, busy: 0.3, colour: "dying", heart: 84, riser: "down", riserV: 0.025 },
    { name: "Dying B: spring 808s, half speed", scale: "minor", prog: [0, 0, 6, 6, 0, 0, 6, 6], motif: [[0, 4], [-1, 4]], bass: "spring", drums: { k: "x.......x.......", s: "................", h: "................" }, bpm: 44, busy: 0.4, colour: "dying", heart: 66 },
    { name: "Dying C: the warp wiggle, louder", scale: "minor", prog: [0, 0, 0, 0, 0, 0, 0, 0], motif: [[0, 8]], bass: "none", drums: "none", bpm: 0, busy: 0.2, colour: "dying", warp: true, heart: 96 }
  ]
};
const MCOMBAT = [
  { dead: true, name: "Combat 1: a chase in minor, the pads under it", scale: "minor", prog: [0, 0, 6, 6, 3, 3, 4, 4], motif: [[0, 0.5], [2, 0.5], [3, 1], [2, 0.5], [0, 0.5], [-1, 1], [0, 1], [4, 1]], bass: "drive", drums: { k: [4, 16], s: "....x.......x...", h: [8, 16] }, bpm: 4, busy: 1.2 },
  { name: "Combat 2: a tresillo and a rising line", scale: "dorian", prog: [0, 3, 0, 3, 5, 5, 4, 4], motif: [[0, 0.75], [2, 0.75], [4, 0.5], [5, 1], [4, 0.5], [2, 0.5], [0, 1]], bass: "sync", drums: { k: [3, 8], s: "....x.......x...", h: [6, 16] }, bpm: 2, busy: 1.2 },
  { name: "Combat 3: half-time, heavy and slow", scale: "minor", prog: [0, 0, 0, 5, 0, 0, 0, 6], motif: [[0, 2], [2, 1], [0, 1], [-1, 2], [0, 2]], bass: "half", drums: { k: "x.......x.x.....", s: "........x.......", h: [6, 16] }, bpm: 0, busy: 1 },
  { name: "Combat 4: brushed and quick, a lydian lift", scale: "lydian", prog: [0, 4, 1, 4, 0, 3, 4, 4], motif: [[4, 0.5], [6, 0.5], [7, 0.5], [6, 0.5], [4, 1], [2, 0.5], [4, 0.5], [0, 1]], bass: "walk", drums: { k: "x.....x...x.....", s: "....x.......x...", h: [11, 16] }, bpm: 8, busy: 1.1 }
];
const MSTYLE = {
  drift: { bpm: 100, root: 146.83, lead: "triangle", leadVib: 6, pad: "sawtooth", padCut: 900, bass: "sine", bassV: 0.2, drum: "soft", echo: 0.35, verb: 0.25 },
  hull: { bpm: 94, root: 110, lead: "sawtooth", leadVib: 3, pad: "sawtooth", padCut: 700, bass: "triangle", bassV: 0.14, drum: "heavy", echo: 0.22, verb: 0.35 },
  cold: { bpm: 86, root: 98, lead: "triangle", leadVib: 2, pad: "sine", padCut: 2e3, bass: "sine", bassV: 0.08, drum: "soft", echo: 0.4, verb: 0.3 }
};
const MDRUM = { none: null, brush: { k: "x.......x.......", s: "................", h: "..x...x...x...x." }, far: { k: "x.........x.....", s: "................", h: "................" }, shanty: { k: "x..x..x.x..x..x.", s: "......x.......x.", h: "..x...x...x...x." } };
const MLEVELS = ["calm", "tense", "danger", "boss", "dying", "last"];
const MKEPT = {
  drift: [[0, "drift"], [1, "drift"], [0, "cold"], [2, "cold"]],
  bloom: [[0, "drift"], [1, "drift"], [2, "drift"], [1, "cold"]],
  shallows: [[0, "drift"], [4, "drift"], [0, "cold"], [1, "hull"]],
  belt: [[3, "cold"], [5, "drift"]],
  boneyard: [[0, "drift"], [1, "drift"], [2, "drift"], [3, "drift"], [0, "cold"], [2, "cold"]],
  reach: [[0, "drift"], [1, "drift"], [0, "cold"], [1, "cold"]],
  hollows: [[0, "cold"], [1, "cold"], [2, "cold"], [1, "hull"]],
  corrupt: [[0, "drift"], [1, "drift"], [0, "cold"], [1, "cold"]],
  edge: [[0, "cold"], [1, "cold"], [2, "cold"], [3, "cold"]],
  combat: [[1, "cold"], [2, "hull"], [3, "drift"]],
  boss: [[1, "drift"]],
  dying: [[1, "drift"], [2, "drift"], [1, "hull"], [1, "cold"], [2, "cold"]],
  last: [[3, "cold"]]
};
function MusicPlayer(ctx, dest) {
  const st = { style: "drift", region: "drift", level: 0, variant: 0, bar: 0, since: 0, next: 0, want: null, on: true, auto: false, rest: 0, played: 0, piece: "" };
  const keptKey = (lv, region) => lv >= 5 ? "last" : lv === 4 ? "dying" : lv === 3 ? "boss" : lv >= 1 ? "combat" : region;
  function pickKept(lv, region) {
    const list = MKEPT[keptKey(lv, region)] || [[0, st.style]];
    const others = list.filter(([v, sty]) => list.length < 2 || v !== st.variant || sty !== st.style);
    const e = others[Math.floor(Math.random() * others.length)] || list[0];
    return { variant: e[0], style: e[1] };
  }
  let x = 0.37;
  const S = () => MSTYLE[st.style], pieces = () => st.level >= 5 ? MPIECE.last : st.level === 4 ? MPIECE.dying : st.level === 3 ? MPIECE.boss : st.level >= 1 ? MCOMBAT : MPIECE[st.region] || MPIECE.drift, PC = () => {
    const ps = pieces();
    const p = ps[Math.min(st.variant, ps.length - 1)] || ps[0];
    return p && !p.dead ? p : ps.find((q) => !q.dead) || ps[0];
  };
  const out = ctx.createGain();
  out.gain.value = 0.9;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 14e3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 10;
  comp.ratio.value = 5;
  comp.attack.value = 3e-3;
  comp.release.value = 0.16;
  const clip = ctx.createWaveShaper();
  {
    const c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const v = i / 511.5 - 1;
      c[i] = Math.tanh(v * 1.3) / Math.tanh(1.3);
    }
    clip.curve = c;
  }
  const dly = ctx.createDelay(1);
  const dlyG = ctx.createGain(), dlyF = ctx.createBiquadFilter();
  dlyF.type = "lowpass";
  dlyF.frequency.value = 2600;
  dlyG.gain.value = 0.3;
  dly.connect(dlyF);
  dlyF.connect(dlyG);
  dlyG.connect(dly);
  const send = ctx.createGain();
  send.gain.value = 0;
  send.connect(dly);
  dly.connect(filt);
  const verb = ctx.createConvolver(), vlen = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, vlen, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < vlen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / vlen, 2.6);
  }
  verb.buffer = ir;
  const vsend = ctx.createGain();
  vsend.gain.value = 0;
  vsend.connect(verb);
  verb.connect(filt);
  const dry = ctx.createGain();
  dry.connect(filt);
  filt.connect(clip);
  clip.connect(comp);
  comp.connect(out);
  out.connect(dest);
  const duck = ctx.createGain();
  duck.gain.value = 1;
  duck.connect(dry);
  duck.connect(send);
  duck.connect(vsend);
  const nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  {
    const d = nbuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const layers = {};
  for (const k of ["drums", "sub", "bass", "pad", "lead", "counter", "arp", "riser", "drone", "heart"]) layers[k] = lay(["pad", "lead", "counter", "arp", "drone"].includes(k));
  function lay(ducked) {
    const g = ctx.createGain();
    g.gain.value = 0;
    if (ducked) g.connect(duck);
    else {
      g.connect(dry);
      g.connect(send);
      g.connect(vsend);
    }
    return g;
  }
  const freqOf = (deg, oct) => {
    const sc = MSCALE[PC().scale], n = sc.length, o = Math.floor(deg / n), i = (deg % n + n) % n;
    return S().root * Math.pow(2, (sc[i] + 12 * (o + (oct || 0))) / 12);
  };
  const progRoot = (bar2) => {
    const p = PC().prog;
    return p === "fifths" ? 4 * bar2 % 7 : p[bar2 % 8];
  };
  const chordOf = (bar2) => {
    const d = progRoot(bar2);
    return [d, d + 2, d + 4].concat(bar2 % 4 === 3 ? [d + 6] : []);
  };
  function env(g, t, a, d, s, r, v) {
    g.gain.setValueAtTime(1e-4, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.linearRampToValueAtTime(v * s, t + a + d);
    const r2 = Math.max(t + a + d, r);
    g.gain.setValueAtTime(v * s, r2);
    g.gain.exponentialRampToValueAtTime(1e-4, r2 + 0.08);
  }
  function osc(type, f, t, stop, det) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (det) o.detune.value = det;
    o.start(t);
    o.stop(stop);
    return o;
  }
  function kick(t, v, fight) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(S().drum === "heavy" ? 150 : 120, t);
    o.frequency.exponentialRampToValueAtTime(S().drum === "heavy" ? 38 : 45, t + 0.14);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + (S().drum === "heavy" ? 0.42 : 0.28));
    o.connect(g);
    g.connect(layers.drums);
    o.start(t);
    o.stop(t + 0.5);
    if (S().drum !== "soft") {
      const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter();
      n.buffer = nbuf;
      nf.type = "highpass";
      nf.frequency.value = 3e3;
      ng.gain.setValueAtTime(v * 0.25, t);
      ng.gain.exponentialRampToValueAtTime(1e-3, t + 0.03);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(layers.drums);
      n.start(t);
      n.stop(t + 0.05);
    }
    if (fight) {
      duck.gain.cancelScheduledValues(t);
      duck.gain.setValueAtTime(1, t);
      duck.gain.linearRampToValueAtTime(0.75, t + 0.012);
      duck.gain.setTargetAtTime(1, t + 0.05, 0.07);
    }
  }
  function snare(t, v) {
    const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter();
    n.buffer = nbuf;
    nf.type = "bandpass";
    nf.frequency.value = 1800;
    nf.Q.value = 0.8;
    ng.gain.setValueAtTime(v, t);
    ng.gain.exponentialRampToValueAtTime(1e-3, t + (S().drum === "heavy" ? 0.26 : 0.16));
    n.connect(nf);
    nf.connect(ng);
    ng.connect(layers.drums);
    n.start(t);
    n.stop(t + 0.3);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    g.gain.setValueAtTime(v * 0.5, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + 0.1);
    o.connect(g);
    g.connect(layers.drums);
    o.start(t);
    o.stop(t + 0.12);
  }
  function hat(t, v, open) {
    const n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter();
    n.buffer = nbuf;
    nf.type = "highpass";
    nf.frequency.value = 7500;
    ng.gain.setValueAtTime(v, t);
    ng.gain.exponentialRampToValueAtTime(1e-3, t + (open ? 0.18 : 0.05));
    n.connect(nf);
    nf.connect(ng);
    ng.connect(layers.drums);
    n.start(t);
    n.stop(t + 0.2);
  }
  function tom(t, v, f) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.2);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + 0.3);
    o.connect(g);
    g.connect(layers.drums);
    o.start(t);
    o.stop(t + 0.35);
  }
  function rock(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain(), n = ctx.createBufferSource(), ng = ctx.createGain(), nf = ctx.createBiquadFilter();
    o.type = "triangle";
    const f = 70 + Math.random() * 90;
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + 0.22);
    o.connect(g);
    g.connect(layers.drums);
    o.start(t);
    o.stop(t + 0.3);
    n.buffer = nbuf;
    nf.type = "bandpass";
    nf.frequency.value = 600;
    nf.Q.value = 1.5;
    ng.gain.setValueAtTime(v * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(1e-3, t + 0.05);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(layers.drums);
    n.start(t);
    n.stop(t + 0.08);
  }
  function sub808(f, t, dur, v) {
    const o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 2.2, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.16);
    {
      const c = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        const u = i / 255.5 - 1;
        c[i] = Math.tanh(u * 2.2) / Math.tanh(2.2);
      }
      sh.curve = c;
    }
    g.gain.setValueAtTime(v, t);
    for (let k = 1; k <= 4; k++) g.gain.setValueAtTime(v * Math.exp(-2.4 * k * 0.12) * (k % 2 ? 0.55 : 1), t + k * 0.12);
    g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
    o.connect(sh);
    sh.connect(g);
    g.connect(layers.sub);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function bass(f, t, dur, v) {
    const s = S(), o = osc(s.bass, f, t, t + dur + 0.1), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(s.bass === "sawtooth" ? 900 : 500, t);
    fl.frequency.exponentialRampToValueAtTime(s.bass === "sawtooth" ? 220 : 140, t + dur);
    env(g, t, 0.01, 0.08, 0.8, t + dur, v);
    o.connect(fl);
    fl.connect(g);
    g.connect(layers.bass);
    if (s.bass === "sine") {
      const o2 = osc("triangle", f * 2, t, t + dur + 0.1), g2 = ctx.createGain();
      env(g2, t, 0.01, 0.05, 0.4, t + dur, v * 0.3);
      o2.connect(g2);
      g2.connect(layers.bass);
    }
  }
  function pad(fs, t, dur, v, type) {
    const s = S();
    for (const f of fs) {
      for (const det of [-7, 7]) {
        const o = osc(type || s.pad, f, t, t + dur + 0.6, det), g = ctx.createGain(), fl = ctx.createBiquadFilter();
        fl.type = "lowpass";
        fl.frequency.value = s.padCut;
        fl.Q.value = 0.5;
        env(g, t, 0.9, 0.4, 0.85, t + dur, v / fs.length);
        o.connect(fl);
        fl.connect(g);
        g.connect(layers.pad);
      }
    }
  }
  function lead(f, t, dur, v, oct, to) {
    const s = S(), o = osc(s.lead, f * (oct ? 2 : 1), t, t + dur + 0.2), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.5;
    lg.gain.value = s.leadVib;
    lfo.connect(lg);
    lg.connect(o.detune);
    lfo.start(t + 0.1);
    lfo.stop(t + dur + 0.2);
    env(g, t, 0.03, 0.1, 0.7, t + dur * 0.9, v);
    o.connect(g);
    g.connect(to || layers.lead);
    if (s.lead === "sawtooth") {
      const o2 = osc("sawtooth", f * (oct ? 2 : 1), t, t + dur + 0.2, 9), g2 = ctx.createGain();
      env(g2, t, 0.03, 0.1, 0.7, t + dur * 0.9, v * 0.5);
      o2.connect(g2);
      g2.connect(to || layers.lead);
    }
  }
  function brass(f, t, dur, v) {
    const g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.Q.value = 1.2;
    fl.frequency.setValueAtTime(300, t);
    fl.frequency.linearRampToValueAtTime(1400, t + dur * 0.4);
    fl.frequency.linearRampToValueAtTime(400, t + dur);
    for (const [r, det] of [[1, -5], [1, 5], [1.5, 0]]) {
      const o = osc("sawtooth", f * r, t, t + dur + 0.2, det);
      o.connect(fl);
    }
    env(g, t, 0.08, 0.2, 0.8, t + dur * 0.9, v);
    fl.connect(g);
    g.connect(layers.lead);
  }
  function bell(f, t, v) {
    const g = ctx.createGain();
    for (const [r, vv, d] of [[1, 1, 2.2], [2.76, 0.18, 0.9], [5.4, 0.04, 0.3]]) {
      const o = osc("sine", f * r, t, t + d + 0.1), gg = ctx.createGain();
      gg.gain.setValueAtTime(v * vv, t);
      gg.gain.exponentialRampToValueAtTime(5e-4, t + d);
      o.connect(gg);
      gg.connect(g);
    }
    g.connect(layers.lead);
  }
  function toll(f, t, v) {
    const g = ctx.createGain();
    for (const [r, vv, d] of [[0.5, 1, 3.5], [1, 0.6, 2.5], [1.19, 0.35, 1.8], [2.76, 0.2, 1.2]]) {
      const o = osc("sine", f * r, t, t + d + 0.1), gg = ctx.createGain();
      gg.gain.setValueAtTime(v * vv, t);
      gg.gain.exponentialRampToValueAtTime(5e-4, t + d);
      o.connect(gg);
      gg.connect(g);
    }
    g.connect(layers.counter);
  }
  function arpNote(f, t, v, dur) {
    const o = osc("triangle", f, t, t + (dur || 0.2)), g = ctx.createGain();
    env(g, t, 3e-3, 0.06, 0.3, t + (dur || 0.14) * 0.8, v);
    o.connect(g);
    g.connect(layers.arp);
  }
  function drone(f, t, dur, v) {
    const o = osc("sawtooth", f / 2, t, t + dur + 0.5), o2 = osc("sawtooth", f / 2, t, t + dur + 0.5, -12), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = 180;
    env(g, t, 0.6, 0.5, 0.9, t + dur, v);
    o.connect(fl);
    o2.connect(fl);
    fl.connect(g);
    g.connect(layers.drone);
  }
  function shepard(t, dur, v, down) {
    const f0 = S().root / 2;
    for (let i = 0; i < 5; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o.type = down ? "sine" : "sawtooth";
      fl.type = "lowpass";
      fl.frequency.value = 2200;
      const a = f0 * Math.pow(2, down ? i + 1 : i), b = f0 * Math.pow(2, down ? i : i + 1);
      o.frequency.setValueAtTime(a, t);
      o.frequency.exponentialRampToValueAtTime(b, t + dur);
      const n = 48, c = new Float32Array(n);
      for (let j = 0; j < n; j++) {
        const p = (down ? i + 1 - j / (n - 1) : i + j / (n - 1)) - 2.5;
        c[j] = v * Math.exp(-p * p / (2 * 1.1 * 1.1));
      }
      g.gain.setValueCurveAtTime(c, t, dur);
      g.gain.setTargetAtTime(1e-4, t + dur, 0.03);
      o.connect(fl);
      fl.connect(g);
      g.connect(layers.riser);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
  }
  function heartbeat(t, v) {
    for (const [dt, ff, vv] of [[0, 62, 1], [0.16, 50, 0.7]]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
      o.type = "sine";
      fl.type = "lowpass";
      fl.frequency.value = 160;
      o.frequency.setValueAtTime(ff * 1.6, t + dt);
      o.frequency.exponentialRampToValueAtTime(ff, t + dt + 0.05);
      const n = 24, c = new Float32Array(n);
      for (let j = 0; j < n; j++) {
        const u = j / (n - 1) * 2 - 1;
        c[j] = v * vv * Math.exp(-u * u * 5);
      }
      g.gain.setValueCurveAtTime(c, t + dt, 0.11);
      g.gain.setTargetAtTime(1e-4, t + dt + 0.11, 0.02);
      o.connect(fl);
      fl.connect(g);
      g.connect(layers.heart);
      o.start(t + dt);
      o.stop(t + dt + 0.3);
    }
  }
  function warp(t, dur, v) {
    const f = S().root;
    for (const [r, vv, type] of [[1, 1, "triangle"], [1.5, 0.45, "sine"], [0.5, 0.6, "sine"]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      const n = 256, c = new Float32Array(n);
      for (let j = 0; j < n; j++) {
        const u = 1.001 - j / (n - 1);
        c[j] = f * r * (1 + 0.5 * u * Math.sin(1.4 / u));
      }
      o.frequency.setValueCurveAtTime(c, t, dur * 0.98);
      env(g, t, 0.05, 0.1, 0.8, t + dur * 0.9, v * vv);
      o.connect(g);
      g.connect(layers.lead);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }
  let heartNext = 0;
  function fade(t, from, to, bars) {
    const pc = PC(), s = S(), barLen = 4 * 60 / (s.bpm + pc.bpm);
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(Math.max(1e-4, from), t);
    out.gain.linearRampToValueAtTime(Math.max(1e-4, to), t + bars * barLen);
  }
  const alive = (list) => {
    const ok = list.map((p, i) => p.dead ? -1 : i).filter((i) => i >= 0);
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : 0;
  };
  function section() {
    if (st.level < 1 || st.level > 3) return "calm";
    if (st.level === 3 || st.level === 5) return st.since < 8 ? "A" : (st.since - 8) % 24 < 8 ? "A" : (st.since - 8) % 24 < 16 ? "B" : "chorus";
    if (st.since < 2) return "intro";
    const k = Math.floor((st.since - 2) / 8) % 3;
    return k === 0 ? "A" : k === 1 ? "B" : "chorus";
  }
  function bar(t0) {
    const s = S(), pc = PC(), fg = st.level >= 1 && st.level <= 3 || st.level === 5, sec = section(), split = pc.last && st.since >= 16, bpm = s.bpm + pc.bpm + (st.level === 2 || split ? 6 : 0), beat = 60 / bpm, barLen = beat * 4, b = st.bar, ch = chordOf(b), rootDeg = ch[0], phrase = Math.floor(b / 8) % 4;
    const colour = pc.colour, muf = colour === "muffled", voidy = colour === "void", wrong = colour === "wrong" || st.level === 2, dying = colour === "dying", chorus = sec === "chorus", intro = sec === "intro", pre = pc.last && pc.build !== false && st.since < 8;
    if (!intro) pad(dying ? [freqOf(rootDeg, -1)] : ch.map((d) => freqOf(d, 0)), t0, barLen, (pc.padV || (muf ? 0.07 : dying ? 0.05 : 0.1)) * (fg ? chorus ? 1 : 0.8 : 1) * (voidy ? 0.6 : 1), pc.padType);
    if (pc.choir && !pre) pad(ch.slice(0, 3).map((d) => freqOf(d, -1)), t0, barLen, pc.last ? 0.08 : 0.06, "sine");
    if (wrong) pad([freqOf(rootDeg, 0) * Math.pow(2, 6 / 12)], t0, barLen, 0.03);
    const fb = freqOf(rootDeg, -2), fifth = freqOf(rootDeg + 4, -2), oct = freqOf(rootDeg, -1), bv = pc.bassV || s.bassV, pat = pc.bass;
    if (pre) {
    } else if (pat === "spring") {
      sub808(fb, t0, beat * 3, 0.45);
      if (b % 2) sub808(freqOf(rootDeg - 1, -2), t0 + 2 * beat, beat * 2, 0.36);
    } else if (pat === "long" || voidy && pat !== "none" && pat !== "eighths") bass(fb, t0, barLen * 0.95, voidy ? pc.bassV || 0.07 : bv);
    else if (pat === "walk") [fb, fb, fifth, freqOf(ch[1], -2)].forEach((f, i) => bass(f, t0 + i * beat, beat * 0.9, bv * 0.9));
    else if (pat === "eighths") for (let i = 0; i < 8; i++) bass(fb, t0 + i * beat / 2, beat / 2 * 0.9, bv * (i % 2 ? 0.7 : 1));
    else if (pat === "drive") for (let i = 0; i < 8; i++) bass(i % 4 === 3 ? oct : fb, t0 + i * beat / 2, beat / 2 * 0.85, bv * (i % 2 ? 0.8 : 1.1));
    else if (pat === "sync") [[0, 0.75], [0.75, 0.75], [1.5, 0.5], [2, 0.75], [2.75, 0.75], [3.5, 0.5]].forEach(([at, len], i) => bass(i === 2 || i === 5 ? fifth : fb, t0 + at * beat, len * beat * 0.9, bv * 1.05));
    else if (pat === "half") {
      bass(fb, t0, beat * 1.8, bv * 1.1);
      bass(b % 2 ? fifth : fb, t0 + 2.5 * beat, beat * 1.2, bv);
    } else if (pat === "shanty") [[0, 0.75, fb], [0.75, 0.25, fb], [1, 0.5, fifth], [1.5, 0.5, fb], [2, 0.75, oct], [2.75, 0.25, fifth], [3, 1, fb]].forEach(([at, len, f]) => bass(f, t0 + at * beat, len * beat * 0.9, bv * 1.05));
    let dp = null;
    const fd = pc.drums;
    if (typeof fd === "string") dp = MDRUM[fd];
    else if (fd) {
      dp = { k: Array.isArray(fd.k) ? euclidBar(...fd.k) : fd.k, s: fd.s, h: Array.isArray(fd.h) ? euclidBar(...fd.h) : fd.h, war: fd.war };
    }
    const v = muf ? 0.5 : dying ? 0.6 : 1;
    if (pre) {
      for (let i = 0; i < 16; i += 2) tom(t0 + i * beat / 4, 0.18 + 0.22 * (st.since / 8), i % 4 ? 110 : 160);
      if (st.since === 0) shepard(t0, barLen * 8, 0.09, false);
    } else if (dp && !(voidy && !fg)) {
      for (let i = 0; i < 16; i++) {
        const t = t0 + i * beat / 4;
        if (dp.k[i] === "x") kick(t, 0.85 * v, fg);
        if (dp.s && dp.s[i] === "x") snare(t, 0.45 * v);
        if (dp.h && dp.h[i] && dp.h[i] !== ".") hat(t, (i % 4 === 0 ? 0.14 : 0.09) * v, dp.h[i] === "o");
      }
      if (dp.war && b % 2 === 1 && (!fg || chorus || pc.boss)) for (let i = 12; i < 16; i++) tom(t0 + i * beat / 4, 0.35, i % 2 ? 110 : 160);
      if (fg && st.since >= 2 && (st.since - 2) % 8 === 7) for (let i = 8; i < 16; i++) snare(t0 + i * beat / 4, 0.28 * v * (i % 2 ? 1 : 0.6));
    }
    if (st.level === 2 || split) {
      for (let i = 0; i < 16; i++) if (i % 2 === 1) hat(t0 + i * beat / 4, 0.06, false);
    }
    if (pc.rocks) {
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) rock(t0 + Math.random() * barLen, 0.3);
    }
    if (pc.heart) {
      const per = 60 / pc.heart;
      if (heartNext < t0) heartNext = t0;
      while (heartNext < t0 + barLen) {
        heartbeat(heartNext, dying ? 0.45 : 0.3);
        heartNext += per;
      }
    }
    const arpV = pc.arpV || 0.03;
    if (pc.arp === "pendulum") {
      const B0 = b * 4;
      for (let k = 0; k < 6; k++) {
        const N = 6 + k;
        for (let m = 0; ; m++) {
          const tb = 16 * (m + 0.5) / (2 * N);
          if (tb >= B0 + 4 + 16) break;
          const local = ((tb - B0) % 16 + 16) % 16;
          if (local < 4 && tb >= B0 && tb < B0 + 4) arpNote(freqOf(ch[k % ch.length] + Math.floor(k / ch.length) * 7, 1), t0 + local * beat, arpV, 0.4);
        }
      }
    }
    if (pc.arp === "pascal") {
      for (let i = 0; i < 16; i += 2) {
        const n = (b * 8 + i / 2) % 32;
        let played = 0;
        for (let k = 0; k <= n && played < 2; k++) if ((k & ~n) === 0) {
          arpNote(freqOf(rootDeg + k % 7 + (k >= 7 ? 7 : 0), 1), t0 + i * beat / 4, arpV, 0.25);
          played++;
        }
      }
    }
    if (pc.arp === "logistic") {
      const r = 2.9 + b % 8 / 7 * 1;
      for (let i = 0; i < 16; i += 2) {
        x = r * x * (1 - x);
        if (x <= 0 || x >= 1 || !(x === x)) x = 0.37;
        arpNote(freqOf(rootDeg + Math.floor(x * 8), 1), t0 + i * beat / 4, arpV, 0.18);
      }
    }
    const plays = fg ? !intro && (b % 4 !== 3 || pre) : b % 8 < 2 || b % 8 === 4;
    if (plays && !voidy && !dying && pc.motif.length) {
      let tt = t0;
      const inv = fg ? sec === "B" : phrase === 1, shift = fg ? sec === "B" ? 2 : 0 : phrase === 2 ? 2 : phrase === 3 ? -3 : 0, up = chorus ? 1 : 0, lv = pre ? 0.04 : pc.leadV || (muf ? 0.05 : fg ? 0.09 : 0.08);
      for (let i = 0; i < pc.motif.length; i++) {
        const [d, len] = pc.motif[i], deg = rootDeg + (inv ? -d : d) + shift, dur = len * beat;
        if (pc.bells) bell(freqOf(deg, 1), tt, 0.03);
        else if (pc.brass) brass(freqOf(deg, -1), tt, dur * 0.9, pc.brassV || 0.09);
        else lead(freqOf(deg, 1), tt, dur * 0.9, lv, up);
        tt += dur;
        if (tt > t0 + barLen) break;
      }
    }
    if (pc.toll && (pc.toll === "every" || b % 2 === 0) && !pre) toll(freqOf(rootDeg, 0), t0, pc.last ? 0.15 : 0.12);
    if (pc.last && !pre && (chorus || split) && pc.motif.length) {
      let tt = t0;
      for (const [d, len] of pc.motif) {
        lead(freqOf(rootDeg + d, 2), tt, len * beat * 0.85, 0.05, 0, layers.counter);
        tt += len * beat;
        if (tt > t0 + barLen) break;
      }
    }
    if (voidy) lead(freqOf(rootDeg + (b % 8 ? 4 : 0), 1), t0, barLen * 1.2, 0.04, 0);
    if (voidy && !fg && pc.motif.length > 2 && b % 4 === 0) {
      let tt = t0;
      for (const [d, len] of pc.motif) {
        lead(freqOf(rootDeg + d, 1), tt, len * beat * 0.95, 0.03, 0);
        tt += len * beat;
      }
    }
    if (pc.warp) warp(t0, barLen, 0.09);
    if (pc.drone && !pre) drone(fb, t0, barLen, dying ? 0.06 : 0.1);
    if (pc.riser === "down" && b % 4 === 0) shepard(t0, barLen * 4, pc.riserV || 0.025, true);
    if (pc.riser === "up" && !pre && b % 8 === 4) shepard(t0, barLen * 4, pc.riserV || 0.06, false);
    filt.frequency.setTargetAtTime(muf ? 700 : dying ? 900 : 14e3, t0, 0.4);
    send.gain.setTargetAtTime(s.echo * (voidy ? 1.6 : 1) * (fg ? 0.6 : 1) * (dying ? 1.5 : 1), t0, 0.2);
    dly.delayTime.setTargetAtTime(beat * 0.75, t0, 0.1);
    vsend.gain.setTargetAtTime(s.verb * (voidy ? 1.8 : 1) * (fg ? 0.7 : 1) * (dying ? 2 : 1), t0, 0.2);
    for (const k in layers) layers[k].gain.setTargetAtTime(1, t0, 0.05);
    st.bar++;
    st.since++;
    st.played++;
    if (st.level === 0 && st.auto) {
      if (st.played === 22) fade(t0 + barLen, 0.9, 1e-4, 2);
      if (st.played >= 24) {
        st.rest = 8 + Math.floor(Math.random() * 13);
        st.played = 0;
      }
    } else if (st.level === 0 && st.since % 32 === 0 && pieces().length > 1) {
      const ps = pieces();
      for (let k = 1; k <= ps.length; k++) {
        const i = (st.variant + k) % ps.length;
        if (!ps[i].dead) {
          st.variant = i;
          break;
        }
      }
    }
    return barLen;
  }
  return {
    state: st,
    layers,
    out,
    pieces: MPIECE,
    combat: MCOMBAT,
    levels: MLEVELS,
    /* set the style, the region, the level (0 calm, 1 wave, 2 danger, 3 duel, 4 dying) and the variation. A new region starts on a
       random calm variation; a level change with no variation given picks one of that level's pieces at random (a wave: one of the
       region's two combat pieces). Changes land on the next bar line, and the song shape counts from the change */
    set(style, region, level, variant) {
      if (style && MSTYLE[style]) st.want = Object.assign(st.want || {}, { style });
      if (region && MPIECE[region] && region !== st.region) {
        st.want = Object.assign(st.want || {}, { region, since: 0 });
        if (variant == null) {
          if (st.auto) {
            const k = pickKept(st.level, region);
            st.want.variant = k.variant;
            st.want.style = k.style;
          } else st.want.variant = alive(MPIECE[region]);
        }
      }
      if (level != null) {
        const lv = Math.max(0, Math.min(5, level | 0));
        if (lv !== st.level) {
          st.want = Object.assign(st.want || {}, { level: lv, since: 0 });
          if (variant == null) {
            if (st.auto) {
              const k = pickKept(lv, st.want.region || st.region);
              st.want.variant = k.variant;
              st.want.style = k.style;
            } else st.want.variant = alive(lv >= 5 ? MPIECE.last : lv === 4 ? MPIECE.dying : lv === 3 ? MPIECE.boss : lv >= 1 ? MCOMBAT : MPIECE[st.region]);
          }
        }
      }
      if (variant != null) st.want = Object.assign(st.want || {}, { variant: variant | 0 });
    },
    /* a wanted change lands on the bar line, but only when the current piece has played long enough: a rise in level (calm to a
       wave, a wave to danger, anything to dying or wave 100) lands at once; a drop waits MIN bars (combat holds 8 bars after the
       last enemy, dying 4); a new region waits 8 bars of the old one, except in combat, where the region does not matter */
    scheduleUntil(until) {
      const MIN = { 0: 0, 1: 8, 2: 4, 3: 8, 4: 4, 5: 8 };
      while (st.next < until) {
        const t0 = Math.max(st.next, ctx.currentTime);
        let changed = false, up = false;
        if (st.want) {
          const w = st.want, lvUp = w.level != null && w.level > st.level, lvDown = w.level != null && w.level < st.level, regionChange = w.region && w.region !== st.region;
          const ok = (!lvDown || st.since >= (MIN[st.level] || 0)) && (!regionChange || lvUp || st.level > 0 || st.since >= 8);
          if (ok) {
            Object.assign(st, w);
            st.want = null;
            changed = true;
            up = lvUp;
          } else if (lvUp) {
            const { level, variant, style, since } = w;
            Object.assign(st, { level, since: since || 0 });
            if (variant != null) st.variant = variant;
            if (style) st.style = style;
            delete w.level;
            delete w.variant;
            delete w.style;
            delete w.since;
            changed = true;
            up = true;
          }
          if (changed) {
            st.played = 0;
            if (st.level > 0) st.rest = 0;
          }
        }
        if (st.rest > 0 && st.level === 0) {
          st.rest--;
          st.next = t0 + 4 * 60 / (S().bpm + PC().bpm);
          if (st.rest === 0) {
            const k = pickKept(0, st.region);
            st.variant = k.variant;
            st.style = k.style;
            st.since = 0;
            changed = true;
          }
          continue;
        }
        if (changed) fade(t0, up ? 0.3 : 0.08, 0.9, up ? 1 : 2);
        const name = keptKey(st.level, st.region) + "-" + st.variant + "-" + st.style;
        if (name !== st.piece) {
          st.piece = name;
          if (this.onPiece) this.onPiece(name, PC().name);
        }
        st.next = t0 + bar(t0);
      }
    },
    tick() {
      this.scheduleUntil(ctx.currentTime + 0.6);
    },
    reset() {
      st.bar = 0;
      st.since = 0;
      st.played = 0;
      st.rest = 0;
      st.next = ctx.currentTime;
      heartNext = 0;
    },
    /* the game drives it: the keep table picks the variation and its tone */
    drive() {
      st.auto = true;
      const k = pickKept(st.level, st.region);
      st.variant = k.variant;
      st.style = k.style;
    }
  };
}
