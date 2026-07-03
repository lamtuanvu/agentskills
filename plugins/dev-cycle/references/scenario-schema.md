# Scenario schema

Declarative E2E scenarios live at `validation.scenarios_dir` (default `e2e/scenarios/`),
one YAML/JSON file per flow. The general `e2e-agentic.js` engine (and scripted providers)
execute the `steps`; the ai-judge adjudicates `expect`/`ai_judge` checkpoints from
screenshots. Machine schema: `schemas/scenario.schema.json`.

## Shape

```yaml
name: smoke-login
description: A returning user logs in and sees their dashboard
requires:                 # optional provider hints
  seed: default-user
  auth: storageState      # skip login by injecting a pre-authed session
steps:
  - navigate: "/"
  - wait: { for: "networkidle" }          # or { for: "selector", selector: "#app" } or { ms: 500 }
  - click: { selector: "[data-test=login]" }
  - fill: { selector: "#email", value: "user@example.com" }
  - fill: { selector: "#password", value: "hunter2" }
  - click: { text: "Sign in" }
  - expect: { selector: "[data-test=dashboard]", visible: true }   # deterministic assertion
  - ai_judge: "The dashboard shows the user's name and at least one widget, no error banner"
```

## Step verbs

| Verb | Args | Meaning |
|---|---|---|
| `navigate` | path or `{url}` | go to base_url + path |
| `wait` | `{for: networkidle\|selector, selector?}` or `{ms}` | wait for readiness |
| `click` | `{selector}` or `{text}` | click element |
| `fill` | `{selector, value}` | type into an input |
| `expect` | `{selector, visible?, text?}` | deterministic DOM/role assertion |
| `ai_judge` | string | human-like screenshot judgment (the adversarial gate) |

`expect` is checked deterministically (fast, cheap, unambiguous — prefer it). `ai_judge`
is for genuinely visual/holistic checks the DOM can't express ("looks broken", "spinner
never resolved", "content is wrong"). The driver agent screenshots at every
`expect`/`ai_judge`; a **separate** ai-judge agent decides pass/fail so success is
measured, not self-reported.
