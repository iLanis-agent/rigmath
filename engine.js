// Rigmath engine: block and tackle mechanics.
// Ideal mechanical advantage = the number of rope parts supporting the moving
// block. Real MA accounts for friction at each sheave: the hauling part has
// tension P, and each sheave pass reduces the tension in the next part by the
// per-sheave efficiency e (classic tackle derivation, published in rigging
// texts). Per-sheave efficiencies are commonly published values (labeled):
// ball-bearing pulley ~0.95, plain bushing ~0.90, carabiner used as a pulley
// ~0.60 (rope-rescue literature range ~0.5-0.65). The "10% per moving sheave"
// rule of thumb is shown alongside for comparison (labeled rule of thumb).
var SHEAVE_TYPES = {
  pulley:    { label: 'ball-bearing pulley (eff ~0.95, commonly published)', eff: 0.95 },
  bushing:   { label: 'plain bushing pulley (eff ~0.90, commonly published)', eff: 0.90 },
  carabiner: { label: 'carabiner as pulley (eff ~0.60, rescue-literature range 0.5-0.65)', eff: 0.60 }
};
var G = 9.81;
var HAND_HOLD_KGF = 25; // labeled rule of thumb for a sustained one-person haul

function bad(v) { return !(typeof v === 'number' && isFinite(v)); }

// real MA of a simple purchase: sum of the geometric tension series
// P * (1 + e + e^2 + ... + e^(n-1)) supports the load, so MA = that sum.
function realMA(parts, eff) {
  var s = 0, t = 1;
  for (var i = 0; i < parts; i++) { s += t; t *= eff; }
  return s;
}

// simple purchase (one moving block, n parts)
function simplePurchase(loadKg, parts, sheaveType) {
  var st = SHEAVE_TYPES[sheaveType];
  if (bad(loadKg) || loadKg <= 0) return { error: 'Load must be a positive number (kg).' };
  if (bad(parts) || parts % 1 !== 0 || parts < 2 || parts > 12) return { error: 'Parts of line must be a whole number from 2 to 12.' };
  if (!st) return { error: 'Unknown sheave type.' };
  var n = parts, e = st.eff, W = loadKg * G;
  var ma = realMA(n, e);
  var P = W / ma;
  var movingSheaves = Math.floor(n / 2), standingSheaves = n - movingSheaves;
  return {
    idealMA: n,
    realMA: ma,
    efficiencyPct: ma / n * 100,
    haulN: P,
    haulKgf: P / G,
    anchorN: W + P,   // disclosed: haul line taken as leaving the standing block downward, so the anchor carries load + haul tension
    anchorKgf: (W + P) / G,
    deepestPartN: P * Math.pow(e, n - 1), // smallest tension, at the standing end
    movingSheaves: movingSheaves,
    standingSheaves: standingSheaves,
    ruleOfThumbMA: n * Math.pow(0.9, movingSheaves), // labeled rule of thumb: 10% loss per moving sheave
    sheaveLabel: st.label,
    handHold: P / G <= HAND_HOLD_KGF,
    notes: 'Anchor load assumes you haul downward off the standing block (anchor = load + haul tension). The rule-of-thumb column uses the common 10%-loss-per-moving-sheave shortcut; the geometric model is the honest one.'
  };
}

// compound purchase: stages pull each other. Stage 1 lifts the load; stage 2
// hauls stage 1's hauling line, and so on. Total real MA = product of the
// real MAs (the friction series of each stage compounds).
function compoundPurchase(loadKg, stages) {
  if (bad(loadKg) || loadKg <= 0) return { error: 'Load must be a positive number (kg).' };
  if (!Array.isArray(stages) || stages.length < 1 || stages.length > 3) return { error: 'Give 1 to 3 stages.' };
  var W = loadKg * G, tension = W, ideal = 1, real = 1, perStage = [];
  for (var i = 0; i < stages.length; i++) {
    var r = simplePurchase(tension / G, stages[i].parts, stages[i].sheaveType);
    if (r.error) return { error: 'Stage ' + (i + 1) + ': ' + r.error };
    ideal *= stages[i].parts;
    real *= r.realMA;
    perStage.push({ realMA: r.realMA, haulN: r.haulN });
    tension = r.haulN;
  }
  var P1 = perStage[0].haulN;
  return {
    idealMA: ideal,
    realMA: real,
    efficiencyPct: real / ideal * 100,
    haulN: tension,
    haulKgf: tension / G,
    anchorN: W + P1, // stage-1 standing block anchor (load + tension stage 1 is hauled with)
    anchorKgf: (W + P1) / G,
    stages: perStage,
    handHold: tension / G <= HAND_HOLD_KGF,
    notes: 'Each stage multiplies: total real MA = product of the stage MAs. Anchor shown is the stage-1 standing block.'
  };
}

// rope needed: one full rope part per unit of lift, plus a working tail.
function ropeLength(parts, liftM, tailM) {
  if (bad(parts) || parts % 1 !== 0 || parts < 2 || parts > 12) return { error: 'Parts of line must be a whole number from 2 to 12.' };
  if (bad(liftM) || liftM <= 0 || liftM > 100) return { error: 'Lift height must be between 0 and 100 m.' };
  if (bad(tailM) || tailM < 0 || tailM > 100) return { error: 'Tail must be between 0 and 100 m.' };
  return { m: parts * liftM + tailM, note: 'One part travels the full lift for every part of line, plus your tail. Buy extra for knots and reeving mistakes.' };
}

// rope strength check against the highest part tension (the hauling part).
// guidance labeled: 5:1 is a common working ratio for lifting with rope.
function ropeCheck(haulN, breakingKn) {
  if (bad(haulN) || haulN <= 0) return { error: 'Haul tension must be positive.' };
  if (bad(breakingKn) || breakingKn <= 0) return { error: 'Breaking strength must be a positive number (kN).' };
  var mbsN = breakingKn * 1000;
  var ratio = mbsN / haulN;
  var verdict, cls;
  if (ratio >= 5) { verdict = 'OK at 5:1 or better (common rope-lifting guidance)'; cls = 'ok'; }
  else if (ratio >= 2) { verdict = 'Under the common 5:1 guidance - think twice'; cls = 'warn'; }
  else { verdict = 'Under 2:1 against breaking strength - do not lift this'; cls = 'bad'; }
  return { ratio: ratio, requiredKn: haulN * 5 / 1000, verdict: verdict, cls: cls,
    note: 'Compares the breaking strength you entered against the hauling-part tension, the highest tension in the system. The 5:1 figure is common guidance, not a standard for your rope - read the manufacturer sheet.' };
}

var engine = {
  simplePurchase: simplePurchase, compoundPurchase: compoundPurchase,
  ropeLength: ropeLength, ropeCheck: ropeCheck,
  CONST: { SHEAVE_TYPES: SHEAVE_TYPES, G: G, HAND_HOLD_KGF: HAND_HOLD_KGF }
};
if (typeof module !== 'undefined') module.exports = engine;
