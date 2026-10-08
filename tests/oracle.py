#!/usr/bin/env python3
# Independent oracle for Rigmath. Re-derives the tackle friction series with
# an explicit loop (never the engine's formulas), plus published-range sanity
# checks for classic rigs, and writes tests/expected.json.
import json

G = 9.81
EFF = {'pulley': 0.95, 'bushing': 0.90, 'carabiner': 0.60}

def real_ma(n, e):
    s, t = 0.0, 1.0
    for _ in range(n):
        s += t
        t *= e
    return s

cases = []

# simple purchases: every sheave type x several parts x two loads
for st, e in EFF.items():
    for n in (2, 3, 4, 5, 6, 8):
        for load in (80.0, 250.0):
            ma = real_ma(n, e)
            P = load * G / ma
            ms = n // 2
            cases.append({'kind': 'simple', 'load': load, 'parts': n, 'type': st,
                          'realMA': ma, 'haulN': P, 'anchorN': load * G + P,
                          'deepestN': P * e ** (n - 1),
                          'ruleMA': n * 0.9 ** ms,
                          'movingSheaves': ms, 'standingSheaves': n - ms,
                          'effPct': ma / n * 100, 'handHold': P / G <= 25})

# compound: two and three stages, derived stage by stage
combos = [
    (120.0, [(3, 'pulley'), (2, 'pulley')]),
    (200.0, [(3, 'carabiner'), (2, 'carabiner')]),
    (90.0,  [(2, 'bushing'), (4, 'bushing')]),
    (150.0, [(2, 'pulley'), (2, 'pulley'), (2, 'pulley')]),
]
for load, stages in combos:
    tension = load * G
    ideal, real = 1, 1.0
    for parts, st in stages:
        ma = real_ma(parts, EFF[st])
        ideal *= parts
        real *= ma
        tension = tension / ma
    P1 = load * G / real_ma(stages[0][0], EFF[stages[0][1]])
    cases.append({'kind': 'compound', 'load': load,
                  'stages': [{'parts': p, 'type': s} for p, s in stages],
                  'idealMA': ideal, 'realMA': real, 'haulN': tension,
                  'anchorN': load * G + P1, 'effPct': real / ideal * 100,
                  'handHold': tension / G <= 25})

# rope lengths
for parts, lift, tail in [(2, 3.0, 2.0), (4, 1.5, 1.0), (6, 0.8, 2.5), (3, 10.0, 3.0)]:
    cases.append({'kind': 'rope', 'parts': parts, 'lift': lift, 'tail': tail,
                  'm': parts * lift + tail})

# rope strength verdicts at the tier boundaries
for haul_n, kn, cls in [(500.0, 2.5, 'ok'), (500.0, 2.49, 'warn'),
                        (1000.0, 2.0, 'warn'), (1000.0, 1.99, 'bad'),
                        (300.0, 3.0, 'ok'), (900.0, 1.0, 'bad')]:
    cases.append({'kind': 'wll', 'haulN': haul_n, 'kn': kn,
                  'ratio': kn * 1000 / haul_n, 'requiredKn': haul_n * 5 / 1000, 'cls': cls})

with open('tests/expected.json', 'w') as f:
    json.dump(cases, f, indent=1)

# properties and published-range sanity checks
fails = []
for st, e in EFF.items():
    for n in range(2, 13):
        ma = real_ma(n, e)
        if ma > n + 1e-12: fails.append(('MA exceeds ideal', st, n))
        if n > 2 and ma <= real_ma(n - 1, e): fails.append(('not monotone', st, n))
        if not (0 < ma / n <= 1): fails.append(('efficiency out of band', st, n))
# frictionless limit: e -> 1 must give exactly n
for n in range(2, 13):
    if abs(real_ma(n, 1.0) - n) > 1e-9: fails.append(('frictionless != n', n))
# published-range sanity (labeled tolerance): Z-rig style 3:1 with good pulleys
# is commonly quoted at about 2.8-2.9:1; with carabiners, about 2:1.
if not (2.7 < real_ma(3, 0.95) < 3.0): fails.append(('Z-rig pulleys out of published range', real_ma(3, 0.95)))
if not (1.7 < real_ma(3, 0.60) < 2.3): fails.append(('Z-rig carabiners out of published range', real_ma(3, 0.60)))

print(f'{len(cases)} cases written, {len(fails)} property failures')
for f in fails: print('FAIL', f)
raise SystemExit(1 if fails else 0)
