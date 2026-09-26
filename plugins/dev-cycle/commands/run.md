---
description: Run a feature end-to-end through the dev-cycle union (kickoff opt-in → governed spec/plan/tasks/implement pipeline → tracker projection → E2E)
argument-hint: "<feature description | slug to resume>"
---

# /dev-cycle:run

Run the feature described in `$ARGUMENTS` (or ask for one) through the union. If
`$ARGUMENTS` names an existing `.dev-cycle/features/<slug>/state.json` (or the current
branch matches one), resume from its `current_step` instead of starting over.

**Invoke the `dev-cycle` skill and follow it exactly.** In short:

1. **Kickoff.** Derive a kebab `<slug>`. Issue the **one** `AskUserQuestion` opt-in
   prompt for the generative loops (pre-check `config.loops_default`), and **persist the
   answer once** into `.dev-cycle/features/<slug>/state.json`, load the governance
   packet, and fire `git-ops on feature.kickoff`.
2. Drive the pipeline one step at a time (specify → clarify [human gate] → plan →
   plan-review [default-on] → tasks [+ completeness critic] → analyze [default-on] →
   implement [via `implement-tasks.js`] → test-and-fix [E2E ladder] → review-loop),
   firing the matching `git-ops on <event>` at each boundary and running the opted-in
   generative engines.
3. Escalate on STUCK/BLOCKED/gate-fail/product-decision via `git-ops on blocked` — never
   auto-advance a blocked ticket, never auto-answer clarify.

Do NOT run the whole pipeline as one background Workflow — await each engine at its
boundary so human gates and tracker sync happen.
