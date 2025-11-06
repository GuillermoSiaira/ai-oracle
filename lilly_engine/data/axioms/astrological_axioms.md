# Astrological Axioms (draft)

This document defines initial reasoning axioms for Lilly's cognitive layer.
Each axiom includes: id, description, scope, rule, weight, and examples.
The engine will inject a compact subset into prompts ("Reasoning Axioms" block).

Schema (informal):
- id: unique string
- description: short human-readable note
- scope: aspects | houses | frames | tempo | consistency
- rule: declarative sentence(s) or bullet list
- weight: 0..1 importance (heuristic)
- examples: concrete cases (optional)

---

## AX-001: Aspect Orbs (default)
- id: AX-001
- description: Default orb tolerance for major aspects
- scope: aspects
- rule:
  - conjunction/opposition/square/trine/sextile use a default orb of 6° unless specified
- weight: 0.8
- examples:
  - Sun–Saturn at 63° ⇒ sextile with 3° orb is valid (<= 6°)

## AX-002: Aspect Priority
- id: AX-002
- description: Stronger aspects carry more interpretive weight
- scope: aspects
- rule:
  - priority: conjunction > opposition > square > trine > sextile
  - smaller orb ⇒ stronger weight
- weight: 0.7
- examples:
  - A conjunction at 1° outranks a trine at 5° in emphasis

## AX-003: House Priority
- id: AX-003
- description: Angular houses dominate, then succedent, then cadent
- scope: houses
- rule:
  - priority by house type: angular (1/4/7/10) > succedent (2/5/8/11) > cadent (3/6/9/12)
- weight: 0.6
- examples:
  - An angular Mars colors the narrative more than a cadent Venus (all else equal)

## AX-004: Planetary Tempo
- id: AX-004
- description: Slow planets set longer cycles and deeper themes
- scope: tempo
- rule:
  - outer planets (Jupiter–Pluto) weigh more for multi‑month/year narratives
  - fast planets (Moon/Mercury/Venus) weigh situational/day‑to‑week themes
- weight: 0.6
- examples:
  - Saturn return defines a structural rite of passage; a Moon square marks a short‑term mood/weather

## AX-005: Reference Frames Consistency
- id: AX-005
- description: Do not mix frames without notice
- scope: frames | consistency
- rule:
  - default frame is tropical & solar unless explicitly stated
  - if lunar or sidereal frames are invoked, announce the switch and keep consistency
- weight: 0.9
- examples:
  - If using sidereal references, state so and avoid mixing with tropical in the same claim

---

Implementation notes:
- The engine should allow toggling axioms and adjusting weights per scenario.
- Prompts should include a brief list (max 8–10 lines) of active axioms to steer reasoning.
- Future axioms: dignities/debilities, application vs separation, sect/day-night, planetary speed changes.
