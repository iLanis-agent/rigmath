const E = require('../engine.js');
const cases = require('./expected.json');
let pass = 0, fail = 0;
const TOL = 1e-9;
function chk(ok, label, got, want) {
  if (ok) pass++;
  else { fail++; console.error('FAIL', label, 'got', got, 'want', want); }
}
for (const c of cases) {
  if (c.kind === 'simple') {
    const r = E.simplePurchase(c.load, c.parts, c.type);
    chk(!r.error && Math.abs(r.realMA - c.realMA) < TOL && Math.abs(r.haulN - c.haulN) < 1e-7 &&
        Math.abs(r.anchorN - c.anchorN) < 1e-7 && Math.abs(r.deepestPartN - c.deepestN) < 1e-7 &&
        Math.abs(r.ruleOfThumbMA - c.ruleMA) < TOL && r.movingSheaves === c.movingSheaves &&
        r.standingSheaves === c.standingSheaves && Math.abs(r.efficiencyPct - c.effPct) < TOL,
        `simple ${c.type} ${c.parts}:1 ${c.load}kg`, r, c);
  } else if (c.kind === 'compound') {
    const r = E.compoundPurchase(c.load, c.stages.map(st => ({ parts: st.parts, sheaveType: st.type })));
    chk(!r.error && r.idealMA === c.idealMA && Math.abs(r.realMA - c.realMA) < 1e-7 &&
        Math.abs(r.haulN - c.haulN) < 1e-7 && Math.abs(r.anchorN - c.anchorN) < 1e-7 &&
        Math.abs(r.efficiencyPct - c.effPct) < TOL,
        `compound ${JSON.stringify(c.stages)} ${c.load}kg`, r, c);
  } else if (c.kind === 'rope') {
    const r = E.ropeLength(c.parts, c.lift, c.tail);
    chk(!r.error && Math.abs(r.m - c.m) < TOL, `rope ${c.parts}x${c.lift}+${c.tail}`, r.m, c.m);
  }
}
// error paths
const errs = [
  E.simplePurchase(0, 3, 'pulley').error, E.simplePurchase(-5, 3, 'pulley').error,
  E.simplePurchase(100, 1, 'pulley').error, E.simplePurchase(100, 13, 'pulley').error,
  E.simplePurchase(100, 2.5, 'pulley').error, E.simplePurchase(100, 3, 'rope').error,
  E.simplePurchase('x', 3, 'pulley').error,
  E.compoundPurchase(0, [{parts:3,sheaveType:'pulley'}]).error,
  E.compoundPurchase(100, []).error,
  E.compoundPurchase(100, [{parts:3,sheaveType:'pulley'},{parts:2,sheaveType:'pulley'},{parts:2,sheaveType:'pulley'},{parts:2,sheaveType:'pulley'}]).error,
  E.compoundPurchase(100, [{parts:1,sheaveType:'pulley'}]).error,
  E.ropeLength(3, 0, 2).error, E.ropeLength(3, 5, -1).error, E.ropeLength(1, 5, 2).error
];
errs.forEach((e, i) => chk(typeof e === 'string' && e.length > 5, 'error path ' + i, e, 'error string'));
// properties
// real MA never beats ideal; friction eats more with more parts (efficiency falls)
for (const t of ['pulley', 'bushing', 'carabiner']) {
  let prevEff = Infinity, prevMA = 0;
  for (let n = 2; n <= 12; n++) {
    const r = E.simplePurchase(100, n, t);
    chk(r.realMA <= n + 1e-12, `MA<=ideal ${t} ${n}`, r.realMA, n);
    chk(r.realMA > prevMA, `monotone ${t} ${n}`, r.realMA, prevMA);
    if (r.efficiencyPct > prevEff + 1e-9) chk(false, `eff falls ${t} ${n}`, r.efficiencyPct, prevEff);
    prevEff = r.efficiencyPct;
    prevMA = r.realMA;
  }
}
// anchor = load + haul tension, always
for (const [l, n, t] of [[50,2,'pulley'],[200,6,'bushing'],[120,3,'carabiner']]) {
  const r = E.simplePurchase(l, n, t);
  chk(Math.abs(r.anchorN - (l * 9.81 + r.haulN)) < 1e-9, `anchor ${l}/${n}/${t}`, r.anchorN, l * 9.81 + r.haulN);
}
// compound = product of simple stage MAs
const two = E.compoundPurchase(150, [{parts:3,sheaveType:'pulley'},{parts:2,sheaveType:'bushing'}]);
const prod = E.simplePurchase(150, 3, 'pulley').realMA * E.simplePurchase(150, 2, 'bushing').realMA;
chk(Math.abs(two.realMA - prod) < 1e-9, 'compound product', two.realMA, prod);
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
