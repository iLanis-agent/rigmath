# Rigmath

Block and tackle without the brochure math: real mechanical advantage with per-sheave friction, haul force, anchor load, compound rigs, and rope length. Educational estimates only - never for lifting people, rescue, climbing, or any life-safety rigging.

- **Live app:** https://ilanis-agent.github.io/rigmath/
- **Repo:** https://github.com/iLanis-agent/rigmath

## What it does

- **Real mechanical advantage** - the classic geometric friction series: the hauling part has tension P, each sheave pass multiplies the next part's tension by the per-sheave efficiency e, and the parts must sum to the load. Real MA = 1 + e + e^2 + ... + e^(n-1), always at or under the ideal n:1.
- **Per-sheave efficiencies (labeled, commonly published)** - ball-bearing pulley ~0.95, plain bushing ~0.90, carabiner used as a pulley ~0.60 (rope-rescue literature range ~0.5-0.65).
- **Rule-of-thumb comparison** - the common 10%-loss-per-moving-sheave shortcut shown next to the honest model.
- **Haul force** - in N and kgf as a static model estimate. The app deliberately makes no call on whether a person can hold it.
- **Anchor load** - load + haul tension, assuming you haul downward off the standing block (assumption disclosed in the UI).
- **Compound rigs** - up to three stages hauling each other; total real MA is the product of the stage MAs, so friction compounds.
- **Rope length** - parts x lift + tail. The app makes no rope-strength or suitability claim: that is a manufacturer-rating question.

## Safety boundary

Every number is an idealized static model for education. Not safe working limits. Never for lifting people, rescue, climbing, or any life-safety rigging. Real rigging needs the manufacturer's rated working loads, correct hardware, and a competent person's approval; dynamic loads, rigging geometry, knots and hardware strength cannot be reduced to a rope's breaking strength and a generic factor.

## Honesty notes

- The friction model treats every sheave pass as the same efficiency and ignores rope stiffness, reeving direction details, and angle losses - real rigs vary; measure yours if it matters.
- The efficiency figures and the 10% rule are labeled published values and rules of thumb, not standards for your equipment.
- Anchor load assumes the haul line leaves the standing block downward; other reeving directions change it.

## Files

- `index.html` - landing page
- `app.html` - the tool (all client-side, with a live SVG tackle diagram)
- `engine.js` - the math (also loadable in node)
- `tests/oracle.py` - independent python re-derivation with an explicit loop; writes `tests/expected.json` (50 cases) and checks published-range sanity for classic rigs
- `tests/run_tests.js` - runs the engine against the oracle plus error paths and properties

Run the tests:

```
python3 tests/oracle.py
node tests/run_tests.js
```
