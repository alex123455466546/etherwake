const VERSION = "50";
const TAU = Math.PI * 2, CELL = 16, WORLD = 25e4;
let RND = Math.random;
const rnd = (a, b) => a + RND() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const els = {}, $ = (id) => els[id] || (els[id] = document.getElementById(id));
const cv = $("game"), ctx = cv.getContext("2d"), root = document.documentElement;
const calmMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const show = (id, on) => {
  $(id).hidden = !on;
};
const host = window.chrome && window.chrome.webview || null;
const TUNE = {
  miniCost: 0.07,
  /* ether per minigun shot (was .12: the same damage per ether as the laser, at less range) */
  laserCost: 0.6,
  /* ether per laser shot */
  missCost: 6,
  /* ether per missile (7.4B2: back to 6 from 7, with missile damage x0.75 and laser and minigun damage x1.2 so a mixed ship is the normal one) */
  wmaxCost: 1.3,
  /* weapon ether cost with Weapons on max (was 1.6 for 1.5x the damage) */
  bulwarkTurn: 0.5,
  /* how fast a Bulwark's shielded front turns, radians a second (was 1.3; .8 until 6.7B) */
  bulwarkBack: 1.5,
  /* hits on a Bulwark's back do this much more (6.7B) */
  ventMiss: 1.5,
  /* missiles do this much more to a venting Warden (6.7B) */
  pdEnemy: 0.5,
  /* enemy point defence rate against your missiles (6.7B: halved) */
  artCost: 6,
  artCd: 2.4,
  artDmg: 8,
  artRange: 1.35,
  artHome: 0.5,
  hminiN: 4,
  hminiCostK: 3,
  shcoreK: 6,
  shcoreDelay: 0.5,
  /* 7.4D: the heavy artillery, heavy minigun and shield core (first guesses) */
  laserBuff: 1.56,
  miniBuff: 1.56,
  railBuff: 1.3,
  /* 6.7B first guesses, to be set by the damage-race script */
  /* 6.7B: no ether, no thrusters. limpD is the drag-free coast with an empty pool, limpLaser the core laser's share of its rate. At 0 ether
     in a fight a cookT second countdown runs; after it damage taken climbs from 1x to cookDmg x over cookRamp seconds */
  cookT: 15,
  cookRamp: 15,
  cookDmg: 3,
  limpD: 0.15,
  limpLaser: 0.25,
  /* edge: no pull going out; heading back a pull of up to pullBack a second home at pullAcc a second squared */
  pullBack: 3e3,
  pullAcc: 2500,
  /* missiles launch toward their target up to missArc off the nose in a cone of missCone, and look for a new target within missSeek */
  missArc: 1.5708,
  missCone: 0.25,
  missSeek: 2200,
  /* a stand-in costs standCost x the block's scrap price in ether once, and only forms if the pool stays above standKeep; an armour plate holds armEth ether */
  standCost: 2,
  standKeep: 0.5,
  armEth: 10,
  patrols: 12,
  dmgPerWave: 0.03,
  /* enemy damage grows this much a wave (was .04; the tiers add the rest) */
  /* the endless edge (6B): past the ring there is no pull going out (see pullBack). Stages by depth: thinning, then
     cracks from edgeCracks (cosmetic), strange from edgeStrange (pockets of negative ether and of corruption, rare wrecks), breaking
     from edgeBreak (an outer block goes every edgeBreakT[0] seconds, falling to edgeBreakT[1] by edgeBreakFast deep; no stand-ins).
     frayCrack is how deep the stars have all but gone */
  frayCrack: 5e3,
  edgeCracks: 5e3,
  edgeStrange: 15e3,
  edgeBreak: 3e4,
  edgeBreakFast: 6e4,
  edgeBreakT: [20, 5],
  edgePocket: [1500, 3e3],
  edgeRare: 4,
  /* the Hollows (6B), by depth from the rim (0) to the heart (1): the rim to holRim, the quiet to holCold, the cold to holHeart. A full
     halo lasts holHaloS seconds in the quiet and is gone in the cold; the tanks drain holDrain[0] % of the pool a second where the cold
     starts, holDrain[1] at the heart's edge and holDrain[2] at the centre; the speed falls to holSpeed at the centre and the pull is
     up to holPull a second squared; with empty tanks at the heart every block but the core frosts for holFrost health a second */
  holRim: 0.2,
  holCold: 0.5,
  holHeart: 0.8,
  holGrow: 3,
  holHaloS: 60,
  holDrain: [1, 3, 8],
  holSpeed: 0.6,
  holPull: 300,
  holFrost: 1,
  holRichSize: 4e4,
  holFade: 6e3,
  derelictAt: 0.95,
  derelictRate: 0.05,
  /* A-d: the dead station at a Hollow's heart: from depth derelictAt the drain, the leak and the frost stop and the tanks refill derelictRate of the pool a second */
  looseWrecks: 60,
  /* the Corruption (6B): corrFull the radius it can grow to, it starts at corrStart of that, and each wave adds corrWaveGrow to it (A-d).
     A heart killed takes a third off, never below corrMin of corrFull. After corrBud seconds with fewer hearts than it
     began with, a new one buds. Collectors fade over corrFade seconds inside */
  corrFull: 3e4,
  corrStart: 0.55,
  corrGrowT: 300,
  corrMin: 0.34,
  corrBud: 600,
  corrFade: 6,
  corrRate: 0.3,
  corrPulseOff: 10,
  corrLocalT: [40, 70],
  corrWaveGrow: 260,
  corrOffT: 600,
  corrFast: 6,
  corrHuge: 9e4,
  /* A-d: sealed in, collectors still give corrRate; a pulse takes them offline corrPulseOff s; a disc pulses every corrLocalT s; a cleared wave grows it corrWaveGrow, corrFast times that from wave 100; a main heart killed puts the disc out of action for corrOffT s */
  /* flight (Drop 5A, reworked in 6.7A). thrust is a force: acceleration is thrustK x thrust units / the ship's weight. Drag is light and
     linear: coasting halves the speed in dragHalf seconds. The top speed only limits the push. Thrust is full along the nose, noseSide
     beside it and noseBack behind it. Flight assist aims for the wanted velocity over assistTau seconds. envDrag is how fast a ship above
     a Hollow's or a current's lower top speed is pulled down to it. The turn rate is turnK x (turnG0 + turnG x gyros) / sqrt(spin weight),
     kept between turnMin and turnMax, and the ship speeds up its turn at turnAcc x that a second */
  thrustK: 29e3,
  dragHalf: 30,
  noseSide: 0.9,
  noseBack: 0.8,
  envDrag: 0.8,
  assistTau: 0.18,
  turnK: 54,
  turnG0: 1,
  turnG: 1,
  turnMin: 1.2,
  turnMax: 12,
  turnAcc: 6,
  turnP: 7,
  /* Drop 5B: groups and enemy sight. Pirates see further (the Reach is theirs); a ship gives up when it is leashFar from you and
     leashHome from its post for leashT seconds; below hurtBelow of its health it pulls back until it is back to hurtBack; lead is
     how much of the way to where you will be each tier aims; a fortress launches every docked ship within launchT seconds of the
     first hit; raids come at most every raidEvery seconds (raidAfterHit after you hit a fortress) with raidWarn seconds' warning;
     a fallen fortress is retaken after fortRefill seconds; a captain has capHp times the health and a new one moves in after capBack */
  sightBase: 1600,
  sightReach: 2400,
  earshotReach: 6e3,
  leashFar: 3500,
  leashHome: 6e3,
  leashT: 5,
  hurtBelow: 0.35,
  hurtBack: 0.7,
  lead: [0, 0.4, 0.7, 1],
  launchT: 3,
  raidEvery: 480,
  raidWarn: 15,
  raidAfterHit: 150,
  fortRefill: 300,
  patrolSpeed: 0.6,
  capHp: 2.4,
  capBack: 300,
  /* Drop 5C: ether like air. Cells fieldCell across; a full one holds fieldCap x the region's richness (the Bloom 44, the Drift 16, the
     Shallows 5) and refills in fieldRegrow seconds; you draw from the cells whose centre is within fieldPatch of the ship. Kills pay
     killEth of what they did. */
  /* Drop 6A: the bigger world. maxCamps pirate fortresses in all; ramming builds while the ship flies above ramFast of its top speed and
     takes ramBuild seconds to fill (boosting fills it at once); a rock costs ramCost x its size x speed x the ship's weight in shield; a
     current speeds you up to curWith times and slows you to curAgainst times */
  maxCamps: 30,
  ramFast: 0.7,
  ramBuild: 1.5,
  ramCost: 0.35,
  ramWt: 150,
  trailLife: 7,
  trailR: 90,
  poisonT: 3,
  poisonDps: 5,
  baseBack: 600,
  baseLvlK: 0.35,
  baseWaveK: 50,
  curFull: 0.35,
  curLet: 1,
  curFreeT: 2,
  curWith: 2.5,
  curAcc: 140,
  curPushA: 0.7,
  curPushX: 0.45,
  /* B-0a currents, a force field: full pull from curFull of the way in from the edge; the pull along the flow is curAcc + curPushA x the ship's own push, the hold across it curAcc + curPushX x the push; pushing out of the ribbon (or against the flow) for curLet s lets go for curFreeT s */
  curAgainst: 0.6,
  riverGrip: 2.2,
  sBrakeTau: 0.45,
  clockK: 6e-3,
  carrierR: 480,
  atkPool: 10,
  atkHold: 1.6,
  ramScale: 0.6,
  ramCap: 90,
  ramBlockCap: 30,
  sgenVal: 45,
  secReinf: 0.7,
  secCross: 2,
  rangeLaser: 1.3,
  rangeMini: 1.5,
  rangeMiss: 1.3,
  aimCone: 0.262,
  aimRange: 1500,
  aimPull: 0.5,
  railMin: 0.08,
  railHalf0: 30,
  railHalf1: 270,
  railSlow: 0.8,
  railThroughShell: true,
  travelTop: 1.7,
  travelCost: 0.25,
  hStart: 0.55,
  hWaves: 20,
  hAdMax: 0.15,
  fireQ: 1.8,
  fieldCell: 1e3,
  fieldCap: 40,
  fieldRegrow: 90,
  fieldPatch: 1500,
  killEth: 0.75,
  egSlope: 0.034,
  partGap: 10,
  /* Drop 5D: an enemy block's strength grows 0.1 + egSlope a wave; later parts of a wave come partGap seconds apart */
  /* Drop 5E: armour stops a damage type by armourStop and is weak to another (armourWeak); energy does shieldEnergy to shields; enemy counter-armour
    is at most counterMax of their outer plating and moves counterStep a wave; the pressure director's wave factor stops at dirMax (the live cap and
    the cap a save loads with are this one number); point defence shoots pdMax times a second at most, at pdRange, for pdCost
    ether; the rail gun does railK x (ether spent)^railPow, takes railTime seconds to reach 80% of your pool, fires by itself after railHold seconds at
    the cap, aims within railArc of the nose, and loses railPass of its damage for each ship it passes; upgrades: mkHp health and mkEff effect for
    Mk I to III; a section core's blocks work secBonus better */
  armourStop: 0.5,
  armourWeak: 1.5,
  shieldEnergy: 1.5,
  counterMax: 0.45,
  counterSlope: 1,
  counterStep: 0.05,
  dirMax: 1.8,
  shieldDelay: 1,
  lowPool: 0.2,
  lowPoolK: 2,
  dirMaxEarly: 2.2,
  dirStart: 3,
  dirUp: 0.15,
  dirTop: 3,
  dirLateStep: 0.04,
  dirLateFrom: 25,
  duelHp: 2,
  duelEscortTier: 2,
  spill: 80,
  spillEarly: 120,
  killScrapK: 1.5,
  corrEaseAt: 200,
  corrEaseMin: 0.25,
  corrWarnAt: 500,
  /* Phase 8 A-b (H1): refining surplus ether to scrap was still too generous (a wave-14 ship beat a wave-40 round); first guess, tuned with the bots */
  spillEarlyWaves: 10,
  harshWave: 4e-3,
  missDmgK: 0.75,
  pdMax: 6,
  pdRange: 350,
  pdCost: 0.3,
  railK: 0.42,
  railPow: 1.25,
  railTime: 4,
  railHold: 3,
  railArc: 0.17,
  arcSmall: 0.52,
  arcHeavy: 2.79,
  aimMin: 120,
  /* Phase 8 A-c: guns turn within an arc of their facing (1x1 lasers and miniguns 30 degrees, heavy artillery and minigun 160 degrees each side); the rail gun fires straight ahead (10 degrees) */
  railPass: 0.25,
  mkHp: [1, 1.6, 2.2],
  mkEff: [1, 1.25, 1.5],
  secBonus: 1.15,
  camLag: 3.4,
  /* how fast the camera catches up with the ship with camera lag on (6 without) */
  haloShare: 0.3,
  /* the share of each hit the halo takes; the rest goes to the shield, then blocks (it was all of it) */
  /* enemy tiers: parts at these waves, each with its own health and damage multiplier */
  tierWaves: [10, 25, 45],
  tierDmg: [1, 1.08, 1.2, 1.3],
  /* missiles */
  smartRange: 800,
  /* smart volleys count the health of hostiles this close */
  smartSpare: 1.05,
  /* and fire enough racks for this much more than that */
  chargeFull: 0.9,
  /* tanks this full fire missiles chargeSpeed times as often */
  chargeSpeed: 1.5,
  chargeLow: 0.5,
  /* below this, a volley fires a shrinking share of racks, down to chargeMin at 5% */
  chargeMin: 0.25,
  warheadK: 5e3,
  /* missile damage x (1 + ether held / warheadK), at most warheadCap */
  warheadCap: 2,
  /* mirrors: each plate reflects mirrorEach (doubled by a full halo), stacking with less each time, up to mirrorCap */
  mirrorEach: 0.06,
  mirrorCap: 0.5,
  /* ether flow: the most ether a second the ship draws from wrecks, all of them together */
  intakeBase: 20,
  intakeMax: 100,
  intakeC: 20,
  intakeRes: 1.5,
  /* Resonant multiplies it */
  moteSpeed: 1200,
  /* wreck ether flies to the ship this fast */
  /* bars: a lost chunk stays this long before it slides away */
  trailHold: 0.4,
  /* the full rebuild on G */
  rbWarn: 10,
  /* this many real blocks broken within rbWindow seconds shows the warning */
  rbWindow: 2,
  rbBase: 1.5,
  /* a rebuild takes rbBase + rbEach seconds a block */
  rbEach: 0.06,
  rbPrice: 2,
  /* each block at this many times its base price */
  rbCd: 10,
  rbCdWave: 30,
  rbCdEach: 20,
  /* cooldown: this many seconds a block rebuilt, at most rbCdMax */
  rbCdMax: 600,
  /* ether pressure: the halo settles where it matches the space around it */
  pressEq: 0.625,
  /* settling point = density x pressEq, at most pressMax */
  pressMax: 0.85,
  pressA: 0.1,
  /* above it, the halo leaks haloMax x pressA x (q - settling point)^2 a second */
  pressFill: 4e-3,
  /* below it, space fills the halo at haloMax x pressFill x the gap a second */
  /* spilled ether from broken tanks */
  spillK: 500,
  /* a cloud keeps lost / (1 + lost / spillK) */
  spillTau: 5,
  /* it fades over spillTau x clamp(0.6 + density, 0.4, 1.7) seconds */
  spillRate: 40,
  /* you win it back at most this fast, into tank room */
  spillReach: 260,
  /* from within this much more than your reach */
  /* copies (B-0d): scrap is copyScrapK of the blocks' price, ether copyLockK of it; a recall gives back copyRefund of both times the copy's health; holding X takes copyBuild s; copyMax at once; copyOut beyond your hull; copyRange is how far they look for something to shoot */
  minerRate: 2.2,
  copyScrapK: 1.9,
  copyLockK: 4.8,
  copyRefund: 0.8,
  copyBuild: 1.6,
  copyMax: 3,
  copyOut: 160,
  copyRange: 1300
};
const MOODS = [
  { name: "Calm", icon: "≈", desc: "Cruising. Streamlining is stronger and shields mend fast." },
  { name: "Volatile", icon: "◆", desc: "Fighting. Weapons hit far harder and shots scatter." },
  { name: "Resonant", icon: "◎", desc: "Harvesting. Reach doubles and wrecks drain faster." },
  { name: "Hollow", icon: "∅", desc: "Negative ether. Tanks drain and the halo boils off, but guns and stand-ins cost nothing and an empty ship flies fastest." }
];
const C = { ether: "#4fe3d0", deep: "#1f9aa8", pale: "#bff3ec", ink: "#e6e8ea", dim: "#8a919c", line: "#2b323d", hostile: "#e5484d", scrap: "#d9a441" };
const PAL = [C.ether, C.deep, "#ffffff", C.hostile, C.scrap, C.dim, C.pale, "#6b7480", C.ether, C.deep];
const BT = {
  core: { k: "core", w: 2, hp: 140, cost: 0, name: "Core", info: "The heart. Fires a bolt of its own. Lose it and the ship is gone." },
  hull: { k: "hull", w: 1.5, hp: 70, cost: 2, name: "Hull", info: "Tough plating. Each one also thickens the shield." },
  mirror: { k: "hull", w: 1.2, hp: 40, cost: 4, name: "Mirror armour", info: "Stops energy damage (lasers) by half, weak to explosive. Thin, and adds little shield. Each plate gives a 6% chance to throw an energy bolt straight back, and a full halo doubles it. Plates stack with less each time, up to 50%." },
  ehull: { k: "hull", w: 1, hp: 40, cost: 0, eth: 25, name: "Ether hull", info: "Costs 25 ether and no scrap. Weaker than hull, but it mends itself from the pool." },
  tank: { k: "tank", w: 1.2, cap: 50, hp: 30, cost: 4, name: "Ether tank", info: "+50 ether capacity. More stored ether means more streamlining." },
  dtank: { k: "tank", w: 1.6, cap: 125, hp: 20, cost: 11, name: "Dense tank", info: "+125 capacity in one block. Fragile, and when it bursts its share of your ether is gone." },
  emit: { k: "emit", w: 0.7, hp: 30, cost: 5, name: "Laser", info: "Left click. A steady, accurate ether bolt." },
  mini: { k: "emit", w: 0.8, hp: 26, cost: 4, name: "Minigun", info: "Left click. Sprays weak bolts very fast at short range. The cheapest damage per ether, at short range." },
  miss: { k: "emit", w: 1, hp: 26, cost: 8, name: "Missile rack", info: "Fires with your other guns whenever a hostile is near, only as many racks as it takes, and hunts the enemy nearest your cursor. F fires them all at any time. 6 ether a shot. The more ether you hold, the harder they hit, up to double. Full tanks fire faster. With Weapons on max each one splits into three." },
  coll: { k: "coll", w: 0.7, hp: 30, cost: 4, name: "Collector", info: "Wider harvest reach, faster siphoning, more ether drawn out of open space and a bigger halo." },
  hcoll: { k: "coll", w: 0.7, hp: 30, cost: 6, name: "Halo collector", info: "Adds almost no reach or income. Holds three times the halo of a normal collector and slows its leak." },
  eng: { k: "eng", w: 0.8, hp: 30, cost: 4, name: "Thruster", info: "Steady thrust, and the top speed it allows. Every thruster swivels to push the way your keys ask. Carries the weight of six blocks." },
  aft: { k: "eng", w: 0.9, hp: 24, cost: 6, name: "Afterburner", info: "Much more thrust and top speed. Burns ether while you thrust and fades when Drive is throttled. Carries three blocks." },
  hard: { k: "hull", w: 1.5, hp: 90, cost: 5, name: "Hardened plate", info: "Stops kinetic damage (miniguns, rams, Darts, Strafers, Brutes) by half, but is weak to energy (lasers). Heavy." },
  blast: { k: "hull", w: 1.5, hp: 80, cost: 5, name: "Blast armour", info: "Stops explosive damage (missiles, bombs) by half, but is weak to kinetic. Heavy." },
  pd: { k: "pd", w: 0.8, hp: 30, cost: 7, name: "Point defence", info: "Shoots down missiles and bombs near the ship (a missile takes one shot, a bomb six), for a little ether each. Several thin a salvo; a big volley still gets through." },
  score: { k: "score", w: 1.5, hp: 100, cost: 20, name: "Section core", info: "An extra core. The blocks nearer to it than to any other core work 15% better. Lose it and that section goes dark until it is rebuilt. Three at most." },
  battery: { k: "emit", w: 4.5, hp: 110, cost: 34, sz: [2, 2], name: "Missile battery", info: "2 x 2. Counts as four racks: its missiles have a 25% wider blast and cost 10% less ether. Lose it and four racks go at once." },
  rtank: { k: "tank", w: 5, cap: 400, hp: 140, cost: 40, sz: [2, 2], name: "Reactor tank", info: "2 x 2. Holds 400 ether and never bursts. Takes four cells, and losing it drops a big spill." },
  slab: { k: "hull", w: 6, hp: 420, cost: 10, sz: [2, 2], hv: 4, name: "Armour slab", info: "2 x 2. 1.5 times the health of four plates and the same shield. When it breaks it leaves a 2 x 2 hole." },
  carray: { k: "coll", w: 3, hp: 120, cost: 22, sz: [2, 2], cv: 5, name: "Collector array", info: "2 x 2. Counts as five collectors for income and reach, and holds more halo. A big, easy target on the outside." },
  rail: { k: "emit", w: 6, hp: 160, cost: 45, sz: [6, 2], name: "Rail gun", info: "6 x 2. Press Q to select it, hold fire to charge (it spends your halo, then your tanks), let go to fire. Fires straight ahead, the way you face. Pierces every ship in a line, a quarter less for each." },
  bay: { k: "foe", w: 1, hp: 36, cost: 0, name: "Bomb bay", info: "" },
  ram: { k: "foe", w: 1, hp: 48, cost: 0, name: "Ram plate", info: "" },
  drain: { k: "foe", w: 1, hp: 30, cost: 0, name: "Drain tube", info: "" },
  dish: { k: "foe", w: 1, hp: 34, cost: 0, name: "Beacon dish", info: "" },
  shell: { k: "foe", w: 1, hp: 44, cost: 0, name: "Shell emitter", info: "" },
  hangar: { k: "foe", w: 1, hp: 36, cost: 0, name: "Hangar", info: "" },
  gyro: { k: "eng", w: 1, hp: 30, cost: 5, name: "Gyro", info: "Turns the ship faster. A heavy ship turns slowly without them. No thrust or top speed. Carries two blocks." },
  sgen: { k: "hull", w: 1.5, hp: 60, cost: 14, name: "Shield generator", info: "Makes the shield: each one adds 45 to the shield. A generator, not armour: the shield shows as a pulsing bubble round the ship when you zoom out. Upgrades make it stronger." },
  sensor: { k: "emit", w: 0.9, hp: 40, cost: 18, name: "Sensor", info: "Lengthens the range of all your weapons and point defence by 12% each (three count), and clears the clouds round you. It does not shoot." },
  art: { k: "emit", w: 6, hp: 150, cost: 60, sz: [2, 2], name: "Heavy artillery", info: "2 x 2. One huge kinetic shell every two seconds, from far beyond the reach of a laser, for a good drink of ether each. Fires with your other guns. Plates that stop kinetic stop it too." },
  hmini: { k: "emit", w: 4, hp: 110, cost: 14, sz: [2, 2], name: "Heavy minigun", info: "2 x 2. Fires four times as fast as a minigun for three times the ether. Short range, kinetic." },
  shcore: { k: "hull", w: 5, hp: 140, cost: 70, sz: [2, 2], name: "Shield core", info: "2 x 2. Holds as much shield as six shield generators, and the shield starts mending sooner after a hit. A big, easy target: if it breaks, so does that shield." },
  eng2: { k: "eng", w: 3.5, hp: 120, cost: 20, sz: [2, 2], name: "Heavy thruster", info: "2 x 2. The thrust of 5.5 thrusters in four cells, and it carries the weight of 26 blocks. A big, easy target at the back. Upgrades add thrust." }
};
const mk = (x, y, t, rot) => ({ x, y, t, hp: BT[t].hp, g: 0, rot: rot | 0, mk: 1 });
const fw = (b) => {
  const s = BT[b.t] && BT[b.t].sz;
  return s ? b.rot ? s[1] : s[0] : 1;
}, fh = (b) => {
  const s = BT[b.t] && BT[b.t].sz;
  return s ? b.rot ? s[0] : s[1] : 1;
};
const cellsAt = (x, y, t, rot) => {
  const s = BT[t].sz || [1, 1], w = rot ? s[1] : s[0], h = rot ? s[0] : s[1], out = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([x + i, y + j]);
  return out;
};
const footOf = (b) => cellsAt(b.x, b.y, b.t, b.rot);
const maxHp = (b) => b.mh || BT[b.t].hp * TUNE.mkHp[(b.mk || 1) - 1], mkM = (b) => TUNE.mkEff[(b.mk || 1) - 1], secM = (b) => b.sec > 0 && b.sec < 100 ? TUNE.secBonus : 1;
const ET = {
  dart: { name: "Dart", info: "Fast and light. Closes in and fires single shots.", mark: ">", hp: 20, sp: 230, range: 340, cd: 1.4, dmg: 4, r: 20, cells: [[0, 0], [1, 0], [-1, 1], [-1, -1]], scrap: 1, eth: 5 },
  gun: { name: "Gunner", info: "Keeps its distance and fires heavier shots.", mark: "=", hp: 42, sp: 170, range: 540, cd: 1.7, dmg: 11, r: 27, cells: [[0, 0], [1, 0], [2, 0], [0, 1], [0, -1], [-1, 0]], scrap: 2, eth: 9 },
  brute: { name: "Brute", info: "Slow and tough. Rams you and knocks you back.", mark: "#", hp: 130, sp: 150, range: 0, cd: 0.7, dmg: 20, r: 34, cells: [[0, 0], [1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 0]], scrap: 4, eth: 18 },
  mini: { name: "Strafer", info: "Sprays weak bolts at close range.", mark: "::", hp: 26, sp: 250, range: 360, cd: 0.2, dmg: 1.3, r: 20, cells: [[0, 0], [1, 0], [0, 1], [0, -1]], scrap: 1, eth: 6, spray: 1 },
  rocket: { name: "Rocketeer", info: "Fires guided missiles from long range. Outrun them or shoot them down.", mark: "^", hp: 46, sp: 150, range: 720, cd: 3.4, dmg: 15, r: 27, cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1]], scrap: 3, eth: 10, missile: 1 },
  leech: { name: "Leech", info: "Latches on and drains your halo, then your tanks. Kill it first.", mark: "o", hp: 30, sp: 300, range: 0, cd: 0, dmg: 0, r: 18, cells: [[0, 0], [-1, 0], [0, 1], [0, -1]], scrap: 2, eth: 4, leech: 1 },
  bulwark: { name: "Bulwark", info: "Its front is shielded. Hit it from the side or behind, or use missiles.", mark: ")", hp: 90, sp: 120, range: 420, cd: 1.5, dmg: 9, r: 30, cells: [[0, 0], [1, 0], [1, 1], [1, -1], [0, 1], [0, -1], [-1, 0]], scrap: 4, eth: 14, front: 1, turn: TUNE.bulwarkTurn },
  beacon: { name: "Beacon", info: "Does not shoot. Speeds up and repairs every ship near it.", mark: "+", hp: 55, sp: 160, range: 0, cd: 0, dmg: 0, r: 24, cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], scrap: 4, eth: 16, support: 1, keep: 620 },
  bomber: { name: "Bomber", info: "Lobs bombs at where you are heading. A red circle shows where one will land.", mark: "O", hp: 70, sp: 110, range: 640, cd: 4, dmg: 9, r: 30, cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [-1, 1], [-1, -1]], scrap: 4, eth: 14, bomb: 1 },
  /* the boss: shelled and firing, then venting and open. Collectors on priority nearby strip the shell faster */
  station: { name: "Fortress", info: "A pirate station. Hit anything in its camp and every docked ship launches at once.", mark: "F", hp: 620, sp: 0, range: 720, cd: 1.1, dmg: 5, r: 96, cells: [], scrap: 14, eth: 50, turn: 1.2, station: 1 },
  heart: { name: "Heart", info: "The heart of the Corruption. It never moves; its guards do. Destroy it and the Corruption shrinks, and it leaves a rich reward.", mark: "H", hp: 620, sp: 0, range: 900, cd: 1.2, dmg: 6, r: 110, cells: [], scrap: 30, eth: 0, turn: 1, station: 1, heart: 1 },
  jammer: { name: "Jammer", info: "Throws flares that pull your missiles off their target. Kill it first, or switch weapons for a moment.", mark: "J", hp: 60, sp: 150, range: 0, cd: 0, dmg: 0, r: 24, cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], scrap: 4, eth: 14, jam: 1, keep: 640 },
  sniper: { name: "Sniper", info: "Stays far off. A red line shows for two seconds, then it fires down it. Move out of the line.", mark: "/", hp: 40, sp: 120, range: 1300, cd: 5, dmg: 26, r: 24, cells: [[0, 0], [1, 0], [2, 0], [3, 0], [-1, 0], [0, 1]], scrap: 5, eth: 14, snipe: 1, keep: 1050 },
  carrier: { name: "Shield carrier", info: "Covers the ships near it in a shield that halves what hits them. Kill it first.", mark: "S", hp: 80, sp: 130, range: 0, cd: 0, dmg: 0, r: 30, cells: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]], scrap: 5, eth: 16, support: 1, carrier: 1, keep: 600 },
  reflection: { name: "The Last Reflection", info: "It is made from your own ship.", mark: "R", hp: 900, sp: 100, range: 800, cd: 1.1, dmg: 9, r: 100, cells: [], scrap: 60, eth: 120, turn: 2, railBoss: 1 },
  warden: { name: "Warden", info: "The boss, every fifth wave. Immune while shelled, open while venting. Collectors on priority nearby strip the shell three times faster.", mark: "W", hp: 520, sp: 95, range: 900, keep: 380, cd: 1.3, dmg: 7, r: 64, cells: [], scrap: 14, eth: 60, boss: 1, turn: 2 }
};
for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (Math.abs(x) + Math.abs(y) <= 3) ET.warden.cells.push([x, y]);
for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) {
  const q = x * x + y * y;
  if (q >= 14 && q <= 26 || q <= 26 && (Math.abs(x) <= 1 || Math.abs(y) <= 1)) ET.station.cells.push([x, y]);
}
const UNLOCK = [["dart", 1, 5], ["gun", 2, 4], ["mini", 3, 3], ["brute", 3, 2], ["leech", 4, 2], ["rocket", 5, 2], ["bulwark", 6, 2], ["bomber", 7, 1.5], ["beacon", 8, 1], ["jammer", 20, 1.2], ["sniper", 24, 1.2], ["carrier", 30, 1]];
const TINT = { corrupt: 0.1, bloom: 0.05, shallows: 0.25, hollows: 0.45, reach: 0.04, boneyard: 0.06, belt: 0.04 };
const MAPA = { corrupt: 0.32, drift: 0.06, bloom: 0.2, shallows: 0.55, hollows: 0.8, reach: 0.16, boneyard: 0.22, belt: 0.2 };
const RT = {
  drift: { name: "The Drift", card: "Entering the Drift. Steady ether, home", desc: "Steady ether. Home, where every run starts", short: "Steady ether", dens: 0.4, col: "#8a919c" },
  bloom: { name: "The Bloom", card: "Entering the Bloom. Rich ether, but waves come bigger and sooner", desc: "Rich ether: collectors earn about three times as much and halos hold. While you are inside, waves bring 20% more ships and come 25% sooner", short: "Rich, but busy", dens: 1.1, col: "#4fe3d0" },
  shallows: { name: "The Shallows", card: "Entering the Shallows. Thin and quiet", desc: "Thin ether: little income and halos bleed, but it is quiet. A safe place to build", short: "Thin and quiet", dens: 0.12, col: "#3a4350" },
  hollows: { name: "The Hollows", card: "Entering the Hollows. Tanks drain, guns are free", desc: "Negative ether. Tanks drain, but guns cost nothing and an empty ship flies fastest. A fast way across, at a price", short: "Tanks drain here", dens: 0, col: "#000000" },
  reach: { name: "Pirate Reach", card: "Entering Pirate Reach. Thick ether, heavily defended", desc: "Thick ether and loot, guarded by pirate camps", short: "Rich but defended", dens: 0.9, col: "#e5484d" },
  boneyard: { name: "The Boneyard", card: "Entering the Boneyard. Huge wrecks, little free ether", desc: "An old battlefield of huge wrecks: lots of scrap and ether to harvest, few rocks, thin space", short: "Wrecks everywhere", dens: 0.2, col: "#9a8b74" },
  belt: { name: "The Asteroid belt", card: "Entering the Asteroid belt. Rocks block shots both ways", desc: "Dense drifting rocks that stop shots both ways: good cover and good mining, but less room to dodge", short: "Rocks block shots", dens: 0.3, col: "#6b7480" },
  corrupt: { name: "The Corruption", card: "Entering the Corruption. Your collectors fall to 30%. Pulses take them offline", desc: "Evil ether. Inside, your collectors give 30% and wrecks, kills and spills give you little. A pulse rolls out every minute or so and takes the collectors offline for 10 seconds. It does not drain you. Destroy the main heart at its centre and the whole disc is out of action for ten minutes; leave it and the disc grows with every wave", short: "Collectors fail", dens: 0.4, col: "#b07cff" },
  edge: { name: "Past the edge", card: "Past the edge. The ether thins out", desc: "The ether thins out and a pull drags you back toward the middle", short: "The ether thins out", dens: 0.4, col: "#8a919c" }
};
const cellsToBlocks = (c) => c.map((q) => ({ x: q[0], y: q[1], t: "hull", hp: 70, g: 0 }));
const ULK = { sensor: 14, sgen: 6, eng2: 10, ehull: 1, mini: 2, mirror: 2, gyro: 3, hcoll: 3, miss: 4, aft: 4, dtank: 5, hard: 12, blast: 15, pd: 18, score: 20 };
const HEAVYH = { art: 2, hmini: 2, shcore: 2, battery: 2, rtank: 2, slab: 2, carray: 2, rail: 2 };
const CATS = [["Hull", ["hull", "mirror", "ehull", "hard", "blast", "slab", "sgen", "score", "shcore"], "shield"], ["Tanks", ["tank", "dtank", "rtank"], "store"], ["Weapons", ["emit", "mini", "miss", "pd", "sensor", "battery", "rail", "hmini", "art"], "gun"], ["Collectors", ["coll", "hcoll", "carray"], "coll"], ["Engines", ["eng", "aft", "eng2", "gyro"], "drive"]];
const PLINE = {
  hull: "Tough plating. Thickens the shield",
  mirror: "Throws some bolts straight back",
  ehull: "Costs ether, not scrap. Mends itself",
  tank: "+50 ether capacity",
  dtank: "+125 capacity. Bursts when broken",
  emit: "A steady, accurate bolt",
  mini: "Fast, weak bolts at short range",
  miss: "Homing missiles that fire on their own",
  coll: "Draws ether in from space",
  hcoll: "Holds three times the halo",
  eng: "Thrust and top speed. Carries 6 blocks",
  aft: "Much more thrust. Burns ether",
  gyro: "Faster turning",
  sgen: "Makes the shield. A pulsing bubble when zoomed out",
  sensor: "More range for every weapon, clears clouds",
  eng2: "2 x 2. 5.5 thrusters of thrust, carries 26 blocks"
};
const SET = { vol: 0.8, music: 0.6, track: "spaceify", part: 1, shake: true, hints: true, diff: 1, all: false, ui: 1, mz: 1, full: false, look: "new", assist: 1, draft: 1, settle: 3, sKey: "brake", flightModel: typeof window !== "undefined" && window.__ewFlightDefault || "classic", flight: 0, bob: "mixed", bobSec: 10, dmgNum: "sum", line: "lance", shieldSec: false, camLag: !calmMotion, keys: {} };
const DIFFS = [[0.7, "Relaxed"], [1, "Normal"], [1.4, "Harsh"]], diffName = () => (DIFFS.find((d) => d[0] === SET.diff) || [0, String(SET.diff)])[1];
const TRACK = { src: "music/spaceify.webm", loop: 332.12, fade: 3, gain: 1.4, key: 146.83 };
const JOBC = { drive: "#b85b05", shield: "#7d8fa6", gun: "#d55fd0", coll: "#6fcf6a", store: "#4fe3d0" };
const JOBOF = { eng: "drive", aft: "drive", gyro: "drive", sensor: "gun", eng2: "drive", sgen: "shield", hull: "shield", mirror: "shield", ehull: "shield", emit: "gun", mini: "gun", miss: "gun", coll: "coll", hcoll: "coll", tank: "store", dtank: "store", core: "core" };
const JOBSYS = { drive: 0, shield: 1, gun: 2, coll: 3 };
Object.assign(JOBOF, { art: "gun", hmini: "gun", shcore: "shield", hard: "shield", blast: "shield", slab: "shield", score: "shield", pd: "gun", battery: "gun", rail: "gun", rtank: "store", carray: "coll" });
Object.assign(PLINE, { art: "2 x 2. Huge long-range kinetic shell", hmini: "2 x 2. Four miniguns of fire", shcore: "2 x 2. Six shield generators in one", hard: "Stops kinetic, weak to energy", blast: "Stops explosive, weak to kinetic", pd: "Shoots down missiles and bombs", score: "An extra core for a section of the ship", battery: "2 x 2. Four racks in one", rtank: "2 x 2. Holds 400, never bursts", slab: "2 x 2. A heavy plate", carray: "2 x 2. Five collectors in one", rail: "6 x 2. Hold to charge, let go to fire" });
const MZ = [4e3, 1e4, 25e3];
const SFX = {
  /* Phase 7.3: the sounds heard most (fire, hit, hurt, kill, lost, boom, wave) are layered (a body, a transient, a tail) and the hits pick one of two voices, so a fight is not one beep repeated */
  fire: [0.05, () => {
    tone("square", 520, 180, 0.07, 0.045);
    tone("sine", 1400, 300, 0.035, 0.02);
  }],
  ehit: [0.04, () => {
    const v = Math.random() < 0.5;
    tone("triangle", v ? 260 : 310, 120, 0.06, 0.08);
    noise(0.05, 0.04, v ? 2400 : 1700);
  }],
  hurt: [0.08, () => {
    const v = Math.random() < 0.5;
    tone("sawtooth", v ? 140 : 120, 50, 0.18, 0.11);
    noise(0.12, 0.1, 900);
    tone("sine", 70, 40, 0.25, 0.12);
    tone("triangle", v ? 1100 : 1400, 600, 0.12, 0.03);
  }],
  shield: [0.06, () => tone("sine", 700, 300, 0.1, 0.07)],
  pick: [0.03, () => {
    chain = S.t - chainT < 0.7 ? Math.min(chain + 1, 14) : 0;
    chainT = S.t;
    const k = Math.pow(1.06, chain);
    tone("sine", 620 * k, 900 * k, 0.07, 0.06);
  }],
  kill: [0.05, () => {
    noise(0.3, 0.18, 1400);
    tone("square", 200, 40, 0.25, 0.07);
    noise(0.5, 0.06, 300);
    later(60, () => noise(0.25, 0.05, 5e3));
  }],
  lost: [0.1, () => {
    noise(0.45, 0.22, 500);
    tone("sine", 90, 30, 0.4, 0.2);
    tone("sawtooth", rnd(700, 900), 120, 0.35, 0.06);
    later(120, () => noise(0.4, 0.08, 3500));
  }],
  mood: [0.3, () => {
    const f = [330, 196, 440, 147][S.mood];
    tone("sine", f / 2, f, 0.5, 0.08);
    tone("triangle", f * 0.75, f * 1.5, 0.6, 0.04);
  }],
  form: [0.2, () => {
    tone("sawtooth", 110, 990, 0.45, 0.06);
    noise(0.4, 0.06, 3e3);
  }],
  unform: [0.2, () => tone("sawtooth", 880, 110, 0.35, 0.06)],
  mini: [0.045, () => tone("square", 880, 500, 0.03, 0.022)],
  missile: [0.1, () => {
    noise(0.25, 0.08, 2e3);
    tone("sawtooth", 200, 500, 0.25, 0.05);
  }],
  boom: [0.06, () => {
    noise(0.35, 0.2, 800);
    tone("sine", 120, 40, 0.3, 0.15);
    noise(0.6, 0.06, 250);
  }],
  low: [1, () => {
    tone("square", 300, 299, 0.12, 0.1);
    later(150, () => tone("square", 240, 239, 0.2, 0.1));
  }, "warn"],
  scrap: [0.03, () => tone("square", 1300, 900, 0.05, 0.03)],
  sbreak: [0.5, () => {
    tone("sawtooth", 500, 90, 0.3, 0.09);
    noise(0.2, 0.08, 1500);
  }],
  sfull: [1, () => {
    tone("sine", 520, 520, 0.08, 0.04);
    later(90, () => tone("sine", 780, 780, 0.12, 0.04));
  }],
  click: [0.02, () => tone("square", 700, 650, 0.025, 0.025)],
  menuPick: [0.03, () => {
    tone("triangle", 520, 780, 0.07, 0.05);
    tone("sine", 1040, 1560, 0.07, 0.02);
  }],
  soon: [0.12, () => {
    tone("square", 220, 200, 0.08, 0.04);
    later(90, () => tone("square", 180, 150, 0.1, 0.04));
  }],
  deny: [0.1, () => tone("square", 160, 120, 0.09, 0.05)],
  lift: [0.03, () => tone("triangle", 420, 620, 0.06, 0.05)],
  sell: [0.03, () => tone("square", 900, 500, 0.07, 0.04)],
  clear: [1, () => {
    [392, 523, 659].forEach((f, i) => later(i * 110, () => tone("triangle", f, f, 0.16, 0.06)));
  }],
  unlock: [1, () => {
    [659, 880, 1047].forEach((f, i) => later(350 + i * 90, () => tone("sine", f, f, 0.14, 0.05)));
  }],
  boss: [1, () => {
    tone("sawtooth", 70, 45, 0.9, 0.14);
    noise(0.6, 0.08, 400);
  }],
  warp: [0.08, () => tone("sine", 900, 200, 0.18, 0.03)],
  emiss: [0.2, () => tone("sawtooth", 300, 620, 0.2, 0.07)],
  bombw: [0.3, () => {
    tone("square", 440, 440, 0.07, 0.1);
    later(130, () => tone("square", 440, 440, 0.07, 0.1));
  }, "warn"],
  alarm: [1.5, () => {
    tone("square", 620, 620, 0.1, 0.11);
    later(140, () => tone("square", 470, 470, 0.14, 0.11));
  }, "warn"],
  /* 7.3: the warnings were quieter than an ordinary hit (-30 against -20 dBFS); now they lead */
  tick: [0.02, () => {
    const f = [480, 680, 920][S.tickN || 0];
    tone("sine", f, f, 0.05, 0.05);
  }],
  biome: [0.5, () => tone("sine", 260, 390, 0.35, 0.04)],
  hold: [0.1, () => tone("sine", 440, 330, 0.15, 0.04)],
  whoosh: [0.4, () => noise(0.35, 0.07, 2600)],
  place: [0.03, () => tone("square", 480, 640, 0.05, 0.05)],
  ghost: [0.1, () => tone("sine", 300, 900, 0.3, 0.05)],
  wave: [0.5, () => {
    tone("square", 220, 219, 0.15, 0.06);
    later(160, () => tone("square", 330, 329, 0.2, 0.06));
    later(360, () => tone("triangle", 440, 440, 0.3, 0.05));
  }],
  rail: [0.3, () => {
    tone("sawtooth", 80, 30, 0.7, 0.14);
    noise(0.5, 0.14, 600);
    tone("sine", 1600, 200, 0.3, 0.05);
    later(40, () => noise(0.6, 0.05, 3e3));
  }],
  /* the rail gun's own shot (it borrowed the Warden's call) */
  shell: [0.3, () => {
    tone("sawtooth", 120, 52, 0.32, 0.065);
    noise(0.26, 0.06, 700);
    tone("sine", 640, 170, 0.14, 0.022);
  }],
  /* the heavy artillery's shell (Phase 8 A-c): a short, lower thud, about half the rail gun's loudness (it used the rail sound and was "too loud", v47 note 3) */
  bob: [0.3, () => {
    tone("sine", 880, 880, 0.06, 0.035);
    later(70, () => tone("sine", 1175, 1175, 0.09, 0.03));
  }, "warn"],
  /* Bob's two-note blip (it borrowed the hold key's tone); a warning, so it is never ducked by the alarm it comes with */
  /* Phase 4: a voice for every enemy, and the sounds that were missing. Those with an x and y are placed in the world */
  dock: [0.1, () => {
    tone("square", 220, 100, 0.08, 0.05);
    later(120, () => tone("square", 330, 100, 0.08, 0.05));
    later(240, () => tone("triangle", 440, 300, 0.2, 0.06));
  }],
  /* docked (B-c) */
  buy: [0.1, () => {
    tone("triangle", 700, 70, 0.1, 0.08);
    later(70, () => tone("triangle", 1050, 140, 0.2, 0.08));
    noise(0.03, 0.02, 3e3);
  }],
  beacon: [0.1, () => {
    tone("sine", 880, 160, 0.25, 0.07);
    later(250, () => tone("sine", 880, 160, 0.25, 0.07));
    later(500, () => tone("sine", 1100, 260, 0.3, 0.06));
  }],
  stalarm: [0.1, () => {
    tone("sawtooth", 300, 150, 0.18, 0.05);
    later(180, () => tone("sawtooth", 230, 200, 0.2, 0.05));
  }],
  echo: [0.1, () => {
    tone("sine", 440, 120, 0.2, 0.07);
    later(90, () => tone("sine", 660, 200, 0.2, 0.07));
    later(200, () => tone("sine", 880, 360, 0.3, 0.06));
  }],
  /* an Echo is offered (B-b) */
  echoPick: [0.1, () => {
    tone("triangle", 523, 80, 0.12, 0.1);
    later(80, () => tone("triangle", 784, 260, 0.3, 0.09));
    noise(0.05, 0.03, 2400);
  }],
  pact: [0.1, () => {
    tone("triangle", 330, 110, 0.1, 0.08);
    later(70, () => tone("triangle", 247, 90, 0.14, 0.08));
    noise(0.05, 0.025, 900);
  }],
  /* a pact is switched on or off (B-a) */
  plop: [0.1, () => {
    tone("sine", 520, 150, 0.13, 0.07);
    later(60, () => tone("sine", 1e3, 320, 0.07, 0.04));
    noise(0.06, 0.03, 1800);
  }],
  /* a copy appears (B-0d) */
  aimline: [0.6, () => {
    tone("sine", 700, 1500, 0.3, 0.08);
    tone("triangle", 1400, 700, 0.25, 0.05);
  }],
  e_dart: [0.05, () => tone("square", 1500, 950, 0.03, 0.03)],
  e_gun: [0.07, () => {
    tone("sine", 160, 60, 0.13, 0.09);
    noise(0.07, 0.05, 500);
  }],
  e_mini: [0.06, () => tone("sawtooth", 320, 290, 0.06, 0.03)],
  e_warden: [0.2, () => {
    tone("sawtooth", 90, 60, 0.2, 0.06);
    noise(0.15, 0.05, 700);
  }],
  latch: [0.3, () => {
    tone("sine", 220, 90, 0.16, 0.07);
    noise(0.12, 0.05, 320);
  }],
  bhum: [1.2, () => tone("sine", 110, 112, 0.7, 0.025)],
  clang: [0.06, () => {
    tone("square", 900, 860, 0.05, 0.04);
    tone("triangle", 1800, 1700, 0.12, 0.03);
  }],
  shopen: [0.5, () => {
    tone("sawtooth", 80, 200, 0.5, 0.06);
    noise(0.4, 0.05, 1200);
  }],
  shclose: [0.5, () => {
    tone("sawtooth", 200, 70, 0.4, 0.07);
    noise(0.2, 0.06, 500);
  }],
  mhit: [0.04, (c) => {
    const k = c || 1;
    noise(0.25, 0.13, 700 + 700 * (k - 1));
    tone("sine", 130 * k, 50, 0.25, 0.1);
  }],
  harv: [0.12, (f) => tone("sine", 900 + 900 * (f || 0), 1100 + 900 * (f || 0), 0.14, 0.016)],
  pour: [0.5, (f) => {
    tone("sine", 280 + 520 * (f || 0), 330 + 520 * (f || 0), 0.09, 0.011);
    noise(0.07, 7e-3, 1500);
  }],
  hfull: [2, () => {
    tone("sine", 880, 1320, 0.3, 0.03);
    tone("sine", 1320, 1760, 0.35, 0.02);
  }],
  hbreak: [1, () => {
    noise(0.35, 0.08, 3e3);
    tone("triangle", 620, 180, 0.35, 0.05);
  }],
  pop: [0.1, () => {
    tone("sine", 1800, 2700, 0.08, 0.06);
    noise(0.14, 0.07, 6500);
  }],
  skip: [0.4, () => {
    tone("sawtooth", 200, 1200, 0.6, 0.03);
    noise(0.6, 0.03, 3e3);
  }],
  chime: [0.4, () => {
    tone("sine", 1320, 1320, 0.45, 0.04);
    tone("sine", 1980, 1980, 0.55, 0.025);
  }],
  snap: [0.2, () => {
    noise(0.08, 0.12, 5e3);
    tone("square", 900, 300, 0.06, 0.05);
  }],
  fanfare: [1, () => {
    [523, 659, 784, 1047].forEach((f, i) => later(i * 95, () => tone("triangle", f, f, 0.22, 0.06)));
  }],
  hiss: [0.3, () => noise(0.6, 0.06, 6e3)],
  crackle: [0.05, () => noise(0.04, 0.04, 4500)],
  creak: [1.2, () => {
    tone("sawtooth", rnd(70, 110), rnd(38, 56), 0.9, 0.025);
    noise(0.5, 0.012, 300);
  }]
};
const PRN = ["On", "▲ Priority", "▲▲ Max"], SYSN = ["Drive", "Shield", "Weapons", "Collect"];
const CTL = [["W A S D", "Fly by the compass: W north, A west, S south, D east. The ship turns to face the mouse. You keep your momentum: flight assist (V) brakes when you let go.", "classic"], ["W A S D", "The ship faces the mouse and the keys follow it: W pushes along the nose, A and D slide sideways, S brakes (or reverses: Settings, S key). You keep your momentum.", "new"], ["V", "Flight assist: Full brakes when you let go and cancels sideways drift, Light only brakes, Off is pure drift. Braking costs Drive ether.", "classic"], ["V, \\, [ and ]", "V turns the flight assist on or off; On, letting go settles the ship over the settle time and Ctrl brakes hard. \\ switches between the three flight drafts, [ and ] shorten and lengthen the settle time.", "new"], ["C", "Cruise control: press to start, press again to stop. It holds the speed you had (the speed readout flashes (C)); W makes it faster, S slower, A and D bend the heading, and a boost sets a new cruise speed. Cruise raises the top speed for a quarter of what a boost costs, but a cruise faster than that keeps paying for a boost."], ["Right mouse or Shift", "Boost: burns ether for a burst of speed and thrust."], ["Mouse", "Aim. Left button or Space fires the lasers and miniguns. Missiles join in when a hostile is near, only as many racks as it takes; F fires every rack."], ["Q", "Rail gun: select it, hold fire to charge (it spends the halo, then the tanks, and time slows), let go to shoot. It fires by itself after three seconds at full charge."], ["1 2 3 4", "Drive, Shield, Weapons, Collectors. Tap for priority, double-tap for max. R puts everything back to on."], ["B", "The shipyard. The game pauses while you build; during a wave it is look-only."], ["R, U in the shipyard", "R turns the block you are about to place (a rail gun is 6 x 2 or 2 x 6). U upgrades the block under the mouse: Mk II for twice its price, Mk III for four times."], ["G", "Rebuild every lost block, weapons first, at twice the price. Ten seconds between rebuilds, thirty during a wave."], ["N", "Call the next wave early: a time skip that pays back the ether you would have made, plus bonus scrap."], ["H", "Hold the waves to explore and build in peace. H again resumes."], ["X", "Hold X to build a copy of your ship, a small AI wingman that fights beside you. It costs scrap and locks some ether while it lives. Needs a Frigate; up to three at once."], ["Z", "Recall your weakest copy: you get most of its scrap and ether back, times its health."], ["E", "Shed the hull and become pure ether: three times the speed, fragile, and bigger ships drain faster."], ["Tab", "The map of the space around you, as far as you have charted it. Drag to move, wheel to zoom, Tab again closes it."], ["Wheel", "Zoom in and out. Over the minimap, change its range."], ["M", "Mute."], ["Esc", "Pause, settings, save and quit."], ["Your own keys", "Thrust and most action keys can be changed under Settings, Keys. The keys shown here are the defaults."], ["L", "Your Echoes: what each one does. An Echo is offered after you win a duel."]];
const TIPS = [
  ["Fly with W A S D. The ship turns to face your mouse.", () => Math.hypot(P.x, P.y) > 260],
  ["Hold left click on a rock, then fly through the drops to collect ether.", () => S.tPick],
  ["Hold right mouse to boost. Scroll the wheel to zoom.", () => S.tBoost],
  ["Tap 3 to give Weapons priority when ether runs low. Double-tap for max. R resets.", () => S.tPri],
  ["Press B to open the shipyard. The game pauses while you build.", () => S.tBuild],
  ["A wave is on its way. Red arrows at the screen edge show where from.", () => S.wave >= 1]
];
const NP = 9e3;
const HULLS = {
  names: ["Skiff", "Cutter", "Frigate", "Cruiser", "Capital", "Dreadnought", "Titan", "Ascendant"],
  price: [0, 30, 80, 180, 400, 900, 2e3, 4e3],
  cells: [24, 50, 88, 128, 170, 250, 360, 400]
};
HULLS.minWave = [0, 0, 0, 20, 29, 55, 90, 180];
const hullOpen = (t) => S.wave >= (HULLS.minWave[t] || 0);
const LINES = {
  lance: { name: "Lance", perk: "+10% speed, +5% damage, -10% ether storage, -5% shield", speed: 1.1, dmg: 1.05, ether: 0.9, shield: 0.95 },
  manta: { name: "Manta", perk: "+10% ether, -10% hp", ether: 1.1, hp: 0.9 },
  wheel: { name: "Wheel", perk: "Round, with no front or back: +10% shield, +20% turning, -5% speed, -3% thrust", shield: 1.1, turn: 1.2, speed: 0.95, thrust: 0.97, omni: 1 },
  bastion: { name: "Bastion", perk: "+15% weapon damage, +5% hp, -25% speed, -7% ether", dmg: 1.15, hp: 1.05, speed: 0.75, ether: 0.93 },
  brick: { name: "Brick", perk: "+5% damage, +10% hp, -15% speed, -12% turning", dmg: 1.05, hp: 1.1, speed: 0.85, turn: 0.88 }
};
const LINEORDER = ["lance", "manta", "wheel", "bastion", "brick"];
const VARS = {
  normal: { name: "Normal", cells: 1, price: 0, about: "The standard hull." },
  big: { name: "Bigger", cells: 1.12, price: 40, hp: 0.94, halo: 0.85, about: "More cells and a higher price, but less hp and less halo." },
  small: { name: "Smaller and quick", cells: 0.85, price: -30, speed: 1.08, coll: 1.1, halo: 1.15, about: "Fewer cells, but quicker, with better collection and halo." },
  sturdy: { name: "Sturdy", cells: 1, price: 25, hp: 1.12, speed: 0.94, about: "The normal size, with more hp and slower." },
  mender: { name: "Mender", cells: 1, price: 30, shield: 0.92, use: 1.05, mend: 1, about: "A regenerative hull: it heals itself, with a little less shield and a little more ether use." }
};
const VARORDER = ["normal", "big", "small", "sturdy", "mender"];
const PARTS = {
  jammer: [{ name: "Second flare", cells: [], hp: 1.1 }, { name: "Wide flare", cells: [], aura: 1.3 }, { name: "Quick flare", cells: [], rate: 1.2 }],
  heart: [{ name: "Outer plating", cells: [], hp: 1.1 }, { name: "Second turret bank", cells: [], rate: 1.2 }, { name: "Crown", cells: [], hp: 1.15, rate: 1.15 }],
  station: [{ name: "Outer plating", cells: [], hp: 1.1 }, { name: "Second turret bank", cells: [], rate: 1.2 }, { name: "Crown", cells: [], hp: 1.15, rate: 1.15 }],
  dart: [{ name: "Second fin", cells: [[-1, 2], [-1, -2]], turn: 1.2 }, { name: "Nose plate", cells: [[2, 0]], front: 0.7 }, { name: "Tail booster", cells: [[-2, 1], [-2, -1]], dash: 6 }],
  gun: [{ name: "Second barrel", cells: [[1, 1], [2, 1]], burst: 2 }, { name: "Side armour", cells: [[0, 2], [0, -2]], side: 0.7 }, { name: "Third barrel", cells: [[1, -1], [2, -1]], spread: 3 }],
  brute: [{ name: "Ram spikes", cells: [[2, 1], [2, -1]], ram: 1.3 }, { name: "Thicker plating", cells: [[-2, 0], [-2, 1], [-2, -1]], steady: 1 }, { name: "Heavier core", cells: [[0, 2], [0, -2]], blast: 1 }],
  mini: [{ name: "Twin muzzle", cells: [[2, 0]], rate: 1.5 }, { name: "Wing plates", cells: [[0, 2], [0, -2]], side: 0.7 }, { name: "Drum magazine", cells: [[-1, 1], [-1, -1]], drum: 2 }],
  rocket: [{ name: "Second launcher", cells: [[0, 2], [0, -2]], salvo: 2 }, { name: "Armour collar", cells: [[-2, 0]], noReflect: 0.5 }, { name: "Third launcher", cells: [[1, 2], [1, -2]], salvo: 3 }],
  leech: [{ name: "Barbed jaws", cells: [[1, 1], [1, -1]], grip: 1.25 }, { name: "Carapace", cells: [[-2, 0]], back: 0.7 }, { name: "Second drain tube", cells: [[0, 2], [0, -2]], drain: 1.5 }],
  bulwark: [{ name: "Wider shield rim", cells: [[2, 0]], arc: 1.15 }, { name: "Rear plating", cells: [[-1, 1], [-1, -1]], back: 0.7 }, { name: "Shield spikes", cells: [[2, 1], [2, -1]], spikes: 0.1 }],
  beacon: [{ name: "Extra antenna", cells: [[0, 2], [0, -2]], aura: 1.3 }, { name: "Armour ring", cells: [[1, 1], [1, -1], [-1, 1], [-1, -1]], all: 0.85 }, { name: "Second dish", cells: [[2, 0], [-2, 0]], heal: 2 }],
  bomber: [{ name: "Bomb rack", cells: [[1, 1], [1, -1]], quick: 0.8 }, { name: "Armoured belly", cells: [[-2, 0]], back: 0.7 }, { name: "Second bay", cells: [[0, 2], [0, -2]], pair: 1 }],
  sniper: [{ name: "Longer barrel", cells: [[4, 0]], rate: 1.1 }, { name: "Armour collar", cells: [[-2, 0]], back: 0.7 }, { name: "Second scope", cells: [[0, -1]], rate: 1.15 }],
  carrier: [{ name: "Wider field", cells: [[0, 2], [0, -2]], hp: 1.1 }, { name: "Armour ring", cells: [[1, 1], [1, -1], [-1, 1], [-1, -1]], all: 0.85 }, { name: "Second emitter", cells: [[2, 0], [-2, 0]], hp: 1.1 }],
  reflection: [{ name: "a", cells: [] }, { name: "b", cells: [] }, { name: "c", cells: [] }],
  warden: [{ name: "Spine", cells: [[-4, 0], [-5, 0]], spine: 1 }, { name: "Extra plates", cells: [[0, 4], [0, -4]], hp: 1.15 }, { name: "Crown", cells: [[4, 0], [5, 0]], crown: 1 }]
};
const ROMAN = ["", "I", "II", "III"];
const REB_PRI = { art: 1, hmini: 1, shcore: 2, hard: 2, blast: 2, slab: 2, pd: 1, battery: 1, rail: 1, rtank: 5, carray: 4, score: 0, emit: 1, mini: 1, miss: 1, hull: 2, mirror: 2, ehull: 2, eng: 3, aft: 3, gyro: 3, coll: 4, hcoll: 4, tank: 5, dtank: 5 };
const verName = (v) => {
  const i = (+v || 0) - 18;
  return i < 1 ? "Alpha 0.1" : i <= 9 ? "Alpha 0." + i : "Beta 0." + i;
};
const NEWS = [
  { v: "50", title: "Pacts, Echoes and the long way round", sum: ["Pick your pain. The new-game screen has eight pacts: bigger bombs, swarms, thin space, no stand-ins, no hold, short gaps, armoured foes, a glass hull. Each adds one Heat, and a run remembers its Heat.", "Win a duel and a ship worth keeping offers you an Echo: a rare upgrade, three cards to choose from, one reroll. A Records page keeps every Echo you have earned and your best waves by difficulty and Heat.", "The galaxy has people in it. Stations trade, repair and refill you, sell Mk II parts and blueprints, hand out contracts (deliver, clear a camp, silence a Corruption heart) and hire miners. Help them and they remember. Hurt them and they remember that too. Storms, salvage jobs and distress beacons turn up between waves.", "Copies cost real money now, a destroyed Ether hull can be rebuilt in ether, cruise control can no longer store a river speed your engines never made, and Hollows are rarer and far less hungry for the map.", "Duels hit back: twice the health and, from the third tier, an escort. Kills pay better, time pays less, and the Capital hull opens at wave 29. Waves keep growing after wave 25 instead of settling down. The wave table in the log stopped smearing numbers together."], tries: ["Tick two pacts on the new-game screen and see what the HUD says.", "Win a duel and pick an Echo.", "Dock at a station, take a contract, and hire a miner.", "Rebuild a lost Ether hull with G."] },
  { v: "49", title: "Rivers, copies and cruise", sum: ["Rivers are a force field. They carry you along the flow, never past their own speed, and keys always mean the same thing inside one. Push against the flow for a second and it lets you go.", "C is cruise control: it holds your speed, W and S change it, A and D bend it, a boost sets a new one.", "Hold X to build a copy of your ship beside you. It costs scrap, and ether that stays locked in your tanks while it lives. Z recalls the weakest and returns most of the cost.", "Heavy artillery picks its own targets. The Wheel steers with your keys. The rail gun fires the way you face. Hollows are bigger, with a safe bubble round the derelict at the heart."], tries: ["Hold X and watch the copy build, then press Z.", "Press C in a river and let go of the keys."] },
  { v: "48", title: "New game, new ships, new world", sum: ["New game opens a proper screen: pick a difficulty, a world seed and a ship line. Seeds work with words too.", "Five ship lines (Lance, Manta, Wheel, Bastion, Brick), eight hull tiers from Skiff to Ascendant, five variants of each. Weapons have arcs and a facing. Arrange fits every hull. Right-drag picks, U upgrades a whole area.", "You start at 55% strength and grow into 100% by wave 20, with a bit of help when you are struggling. Slow shooters fire more often for the same damage, and duel ships strafe.", "The Corruption pulses and takes your collectors offline. Every zone has a main heart: break it and the zone goes quiet for ten minutes. Hollows hide a derelict station that refills your tanks. Pirate bases return, meaner. Press Tab to see how much of the world you have charted."], tries: ["Press New game and look at what is on offer.", "Buy a Cutter, then a Frigate, and open the variants.", "Find a Corruption and wait for the pulse.", "Fly to the very middle of a Hollow."] },
  { v: "47", title: "Heavy weapons", sum: ["Three heavy blocks from the Frigate: Heavy artillery (a huge shell, a long way), the Heavy minigun (four in one) and the Shield core (six generators in one).", "The early game ramps faster and bigger hulls open later. Missiles lost a little punch, lasers and miniguns gained some, and armour adaptation is gentler.", "The survival panel got an ether-flow bar, Arrange puts the guns at the front, and a wedge on the compass shows ships about to arrive."], tries: ["Buy a Frigate and place Heavy artillery.", "Press Arrange on a big ship and see where the guns go."] },
  { v: "46", title: "The revamp", sum: ["A new screen: solid strips that never overlap, survival top left, the wave box top centre, the power row at the bottom with Bob above it. Parts are tiles with pictures.", "Everything is louder through a limiter, warnings cut through, hits are layered, and the rail gun and Bob have their own sounds.", "The fight reads your core and your losses and makes the next wave up to 1.8 times bigger. Duels, a siege every tenth wave from 18, more ships shooting at once, enemies that adapt over 12 waves.", "Rivers carry you round bends, and surplus ether turns into scrap when the tanks and halo are full. Sleeping ships far away cost nothing."], tries: ["Clear a wave without a scratch and watch the next one grow.", "Survive wave 18.", "Fill your tanks and watch the scrap tick up."] },
  { v: "45", title: "The big rework", sum: ["Two ways to fly. Classic: the compass, momentum, the old favourite. New: the ship steers, with three drafts, a settle time and a reverse. Pick in Settings.", "The armour outline replaced free armour: build anywhere inside it. Arrange previews first. Upgrades show a Mk badge. Two new hulls (Dreadnought, Titan), three new lines (Wheel, Bastion, Brick), a Heavy thruster, a Shield generator and a Sensor.", "Enemies are red ships built from the same parts as yours. New: the Shield carrier and the Sniper. A duel ship fires a rail gun from wave 60. A pressure director raises the next wave when the last was too easy. Something waits at wave 100.", "Rail gun: its damage lands, the line widens as you charge, time slows while you hold it, and you cannot fire it on an empty tank.", "The Nebula is gone, the Corruption is purple and spreads, and you can save any time. Bob, the ship computer, talks. The music follows danger and where you are."], tries: ["Open Settings and try Flight model New.", "Hold the rail gun until it says FULL, then let go in a crowd.", "Fly toward the Corruption and listen for Bob."] },
  { v: "44", title: "A clearer screen and your own keys", sum: ["Messages stack in a feed in the corner and stay long enough to read. The wave box only talks about waves.", "The rail gun shows when it is armed, draws an aim line, and says MISS when it misses. Hits freeze the screen for a blink.", "The main menu has a live ship behind it, a Records page and a What is new page with every version down the side.", "Thrust and most action keys can be changed in Settings, Keys."], tries: ["Open Settings and rebind Thrust forward.", "Die on purpose and press Main menu."] },
  { v: "43", title: "Edit your ship freely", sum: ["Drag any block, including the big ones, and a ghost shows where it will land. Drag a box to move many at once. R turns a dragged block.", "Blocks cut off from the core get a red outline, and the shipyard will not let you leave with a ship in pieces.", "Arrange builds from the tray by real block size. Strip then Arrange rebuilds the whole ship around the core."], tries: ["Drag a heavy block across the hull and press R.", "Strip the ship, then Arrange."] },
  { v: "42", title: "Winding rivers", sum: ["Forty long, winding rivers of light, 60,000 to 150,000 units each, from a swirling spring to a fan. They keep clear of home.", "Riding one feeds your collectors without draining the space around you.", "Leave through the fan after riding for 1.5 seconds and you get a free burst of speed."], tries: ["Find a river, ride it, and leave through the fan.", "Follow one from spring to mouth on the map (Tab)."] },
  { v: "41", title: "Running dry", sum: ["The halo counts as ether: with a full halo you are never low. Stand-ins cost ether once, only while your pool stays above half.", "An empty pool is survivable: the core still nudges you along and fires a slow free laser. In a fight, a countdown starts, and when it runs out damage climbs.", "Wave ships arrive just past the screen edge and hunt you. More pirates: 30 fortresses and 12 patrols.", "Past the edge there is no pull going out and a strong pull coming home. Lasers, miniguns and the rail gun hit harder. A Bulwark turns slower and takes 1.5 times on its back."], tries: ["Run your tanks dry in a fight.", "Lose some blocks and watch the stand-ins form.", "Flank a Bulwark with lasers."] },
  { v: "40", title: "Real drift", sum: ["Your ship truly drifts. Let go of the keys and you keep your speed for a long time.", "Facing matters less: thrust is full ahead, 90% sideways, 80% backwards.", "Flight assist: Full brakes when you let go, Light only brakes, Off is pure drift. Or choose Drift and brake, and hold Ctrl to stop."], tries: ["Fly flat out, let go, and watch how far you coast.", "Compare Full, Light and Off with V."] },
  { v: "39", title: "Last fixes before the playtest", sum: ["The Corruption no longer cuts your collectors twice. A half-drained wreck stays half drained after a reload.", "A Hollow now fades out over its last 6,000 units instead of ending in a step.", "Enemies stop healing blocks they no longer have, and far-off wrecks are cleared in long runs."], tries: ["Fly out of a Hollow in different directions: it should fade, never snap."] },
  { v: "38", title: "Look, sound and feel", sum: ["Your shield and halo follow the shape of your ship. A bolt can slip through a notch in an L-shaped hull.", "Blocks move: thruster flames, spinning gyros, pulsing collectors, charging lasers, turning minigun barrels, shimmering mirror armour. A compass ring shows north and the way you face.", "The world has its own sound: silence deep in a Hollow, whispers in the Corruption, a low hum in the Bloom, a crackle past the edge, a rumble from battles you cannot see."], tries: ["Build an L-shaped ship and let something shoot at the notch.", "Fly into the Corruption, then a Hollow, with your eyes closed."] },
  { v: "37", title: "The zones", sum: ["The Hollows get worse the deeper you go, and they never tell you where the line is. The quiet just inside is the lure: guns are free, an empty ship flies fastest. Deeper, the tanks drain, sight closes in and the heart pulls you down.", "Three Corruptions, each with hearts guarded by corrupted ships. Inside, your collectors fade out. Kill a heart and the zone shrinks and pays scrap, but a new heart buds later.", "The edge is endless, and it gets stranger the further you go: cracks, pockets of negative ether, then your own blocks breaking away. Turn round and it stops."], tries: ["Fly into a Hollow and note when you first feel worried.", "Boost out past the edge and see how far you get."] },
  { v: "36", title: "A much bigger world", sum: ["The world is five times wider: about 90 regions with wandering borders, grown as you fly. A rock you break stays broken. A wreck you drain stays drained.", "Fog of war. Unflown space is dark, and old maps get out of date.", "Currents between regions: ride one and fly up to 2.5 times as fast for free. Ramming: a second and a half of fast flight and rocks break on contact.", "A bigger minimap, a big map on Tab you can drag and zoom, and the region name top centre. Old saves do not carry over: their world is gone."], tries: ["Fly 30,000 units from home and open the map.", "Ride a current, then fly against one.", "Drain a wreck, fly away, come back: it stays drained."] },
  { v: "35", title: "Armour, rail guns and heavy metal", sum: ["Three kinds of damage: explosive, energy, kinetic. Armour stops one by half and is weak to another. Hardened plate, blast armour and mirror armour, which throws energy back.", "Enemies adapt: lean on one weapon and they bring the armour that counters it. A mixed arsenal keeps them soft.", "Point defence shoots down missiles and bombs. The Jammer throws flares that pull your missiles off target.", "Heavy blocks from the Frigate: missile battery, reactor tank, armour slab, collector array, and the 6 x 2 rail gun. Section cores power the blocks near them. U upgrades a block to Mk II or III."], tries: ["Fight five waves with missiles only and watch the previews turn to blast armour.", "Build a rail gun, charge it and fire down a line of ships."] },
  { v: "34", title: "Ships of blocks", sum: ["Enemies are built from real blocks round a core. Shoot a bomb bay off a Bomber and it cannot bomb. Shoot the engines off and it drifts. Break the core and it is gone. Loose blocks become wrecks to harvest.", "Ships come in sizes from small to Capital, and a late block is much tougher than an early one.", "Waves vary: skirmishes, standard waves, battles from wave 20, a Warden flagship every fifth wave, and a duel every seventh wave from 14. A duel is one ship, bigger than yours.", "The wave after a flagship or duel is a skirmish. The preview names what is coming. The ship you die in can come back as an Echo."], tries: ["Shoot the bomb bay off a Bomber.", "Survive to wave 14 for the first duel."] },
  { v: "33", title: "Ether like air", sum: ["Space holds a fixed amount of ether and your collectors thin it. Each patch refills in about 90 seconds once you move on.", "Collectors set how fast you drain a patch, not how much it holds, so a big ship has to keep moving. You can see it: the ether fades where you have harvested.", "Kills pay 25% less ether and missiles cost a little more to match."], tries: ["Sit still in the Drift with a big ship and watch your income fall.", "Come back a minute later: the dark patch should have refilled."] },
  { v: "32", title: "They fight back", sum: ["Groups wake together. Hit one pirate and the whole fortress or patrol comes. Ships give up the chase one by one and fly home awake.", "Enemy guns lead their shots, more with each tier. Turn while a bolt is in the air to dodge it.", "Enemies have jobs: Gunners and Bombers hold their range, Darts and Strafers flank in pairs, Bulwarks charge in front, anyone below 35% health pulls back.", "Pirate camps are fortresses with 10 to 16 ships docked, a named captain and raiding parties between waves."], tries: ["Hit one ship of a patrol from range.", "Attack a fortress and watch everything swarm out."] },
  { v: "31", title: "Movement with weight", sum: ["Your ship keeps its momentum. Reversing takes a few seconds on a big ship. Thrusters swivel to push where your keys ask.", "Every block has weight. Heavy ships accelerate and turn slower, and gyros are what turn a big ship.", "Flight assist (V): Full, Light or Off. The camera trails a little when you speed up."], tries: ["Fly a lap, let go, and watch the ship carry on.", "Back away from a Gunner while firing at it."] },
  { v: "30", title: "The game that does not crash", sum: ["When something inside goes wrong the game logs it and carries on. If it keeps failing, it pauses on a Something broke card with Copy log and Save log buttons.", "The log keeps a timeline of what happened, a snapshot every 30 seconds, and every slow frame."], tries: ["Play a few waves, press Esc and use Copy log."] },
  { v: "29", title: "Bug hunt", sum: ["The shipyard parts list holds still. Every frame costs about 3 ms less. Missiles leave a shelled Warden alone and go for its escorts.", "Stars fill wide screens. Rocks stay near where they were placed. A pile of small fixes: Esc, M, warning beeps, the rebuild timer."], tries: ["Open the shipyard and run the mouse down the parts list."] },
  { v: "28", title: "Polish pass", sum: ["The guide has two new pictures: where ether comes from and goes, and the four moods.", "Past the edge the stars go out the further you fly. The new look draws faster."], tries: ["Open the guide and look at the new pictures."] },
  { v: "27", title: "A soundtrack", sum: ["Etherwake has its own music: Spaceify, a track made for the game. It loops without a seam.", "The mood layers play over it, retuned to its key. Settings has a Music choice, and if the track cannot load the game uses synthesised music."], tries: ["Turn the music up and play a few waves."] },
  { v: "26", title: "Say hello to sound", sum: ["Music that follows the mood, layer by layer. Sounds come from where they happen and fade with distance. Every enemy has a voice.", "New players learn one thing at a time as it comes up. Skip tips turns it off."], tries: ["Fight a wave and listen for where the enemies are."] },
  { v: "25", title: "A new look", sum: ["Every block wears its job colour and its own shape: orange engines, magenta weapons, green collectors, teal tanks, steel plating that joins up.", "Light falls from one side, damage shows as cracks, plumes come out of your engines, and your last moment and a half of flight leaves a ribbon.", "A clear HUD: Survival, Power, Wave and Map. Hold Q for ship details."], tries: ["Fly with Look on New, then switch to Classic and back."] },
  { v: "24", title: "Ten worlds in one", sum: ["The world is twice as wide and split into regions that each feel different: the Drift, the Bloom, the Shallows, the Hollows, Pirate Reach, the Boneyard, the Nebula and the Asteroid belt.", "Tab opens a map of the whole world. Past the edge it gets worse the further you go."], tries: ["Press Tab and pick a region to visit.", "Fight a wave in the Bloom, and another in the Shallows."] },
  { v: "23", title: "The shipyard, rebuilt", sum: ["Parts with pictures on the left, your ship and every hull still to unlock on the right, the grid big in the middle. A bright outline shows where you can build.", "New hulls come with a free frame. Buying a hull moves your blocks to suit the shape. The halo takes 30% of each hit and the rest goes to the shield, then your blocks."], tries: ["Open the shipyard and hover a hull on the right.", "Buy the Cutter and press Ctrl+Z."] },
  { v: "22", title: "Enemies grow up", sum: ["At waves 10, 25 and 45 every enemy grows a part you can see as extra cells, and each part changes how it fights: Gunners fire bursts and then fans, Rocketeers fire two and then three missiles, Bombers drop two bombs, Darts dash.", "Some parts are armour: hits from that side do 30% less. The wave preview names the tier."], tries: ["Play from wave 40 to 60.", "Dodge through the gap between a tier III Bomber's two bombs."] },
  { v: "21", title: "Pick your ship", sum: ["A new run starts in a small Skiff and you buy bigger hulls with scrap. At the Frigate you pick a Lance or a Manta.", "Splitting: a Lance sends its nose out as a Spear, a Manta sends two Wings. Press G after a big loss and every lost block comes back, weapons first.", "Broken tanks spill a cloud you can fly through to win some ether back."], tries: ["Start a new run and buy each hull.", "Break some tanks and fly through the cloud."] },
  { v: "20", title: "Ether with manners", sum: ["Wrecks refill you steadily: their ether flies to you. Missile volleys fire only the racks they need, and the more ether you hold, the harder missiles hit.", "N is a time skip that pays back the ether the skipped seconds would have made. Scrapping gives back half. Right-drag a box to scrap many, Ctrl+Z undoes.", "The interface grows with your screen."], tries: ["Fly into a hollow with wrecks and watch the ether stream in.", "Press N a few gaps in a row."] },
  { v: "19", title: "First light", sum: ["The first public cut. A version number, and this card after each update.", "A saved run comes back to the same map it was saved on."], tries: ["Load your save and play a wave."] }
];
