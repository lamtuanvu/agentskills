# map-codebase — T6 · Codebase Review / Onboarding (Classify → Fanout+Synthesize → Loop → Adversary(gap))

**Use when:** onboard to a repo, map the codebase, "explain how this project is
structured", find entry points and risks.

**Goal:** a map of the codebase — structure, domains, entry points, risks.

## Moves
- **discovery [Classify]:** list subsystems/areas; route by type (`config|core|tests|infra`).
- **handoff [Fanout]:** 1 area → 1 explorer; produce module summary + key flows + ownership.
- **verify:** synthesize the map; [Adversary] gap-check — "what was NOT covered? unread
  dirs? untested paths?".
- **persist:** `area_map, key_flows, entry_points, risks, unexplored`.
- **schedule [Loop]:** spawn an explorer per unexplored area; stop = no new area (saturation).

## Gate
Every area mapped ∧ gap-check finds nothing new ∧ entry points + risks listed.

## Guardrails
`max_iter <by repo size>` · `breaker 2`.

## Workflow shape
`parallel(areas → Explore subagent)` → synthesize map (barrier) → adversary gap-check
(different agent) lists unexplored/untested. Loop-until-dry: spawn explorers for each
newly-found area until saturation.
