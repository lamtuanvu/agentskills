# {{PROJECT_NAME}} Constitution

> **Last updated:** {{DATE}}
> **Scope:** All engineering work on {{PROJECT_NAME}}

This constitution establishes non-negotiable principles for all code, architecture, and process decisions. Every plan, implementation, and review must verify alignment with these principles.

---

## I. Quality by Default

All code changes must satisfy the project's review dimensions before merging. CRITICAL and HIGH severity findings from `/full-review` must be resolved before a feature is considered complete. Medium and Low findings must be tracked but do not block delivery.

**Enforcement:** The SpecKit pipeline's `review-loop` step runs full-review and blocks completion until no CRITICAL/HIGH findings remain.

---

## II. Security First

All user inputs must be validated at system boundaries. All outputs rendered to users must be sanitized. Authentication must be verified before any data access. Authorization must be enforced at the operation level, not just the route level.

**Enforcement:** The `security-auditor` reviewer checks every change. Auth-before-data is a pre-verified critical finding.

---

## III. Four-Tier Test Coverage

Every feature must have tests across four tiers before being considered complete:

| Tier | Scope | Must Have |
|------|-------|-----------|
| Unit | Individual functions, classes, components | Full coverage of happy path + edge cases |
| Integration | API endpoints, service interactions, DB operations | Contract and interaction verification |
| E2E — Backend | Full request lifecycles, data pipelines, auth flows | Critical path verification |
| E2E — Frontend | Complete user journeys, critical paths | User story validation |

Agentic E2E (Chrome DevTools MCP scenarios) supplements but does not replace the four tiers above.

**Enforcement:** The `test-and-fix` pipeline step runs all tiers and loops on failures before code review.

---

## IV. Documentation as Deliverable

Every implementation plan must include a Technical Writer role. Documentation (API docs, README updates, inline comments for non-obvious logic) is not optional and is verified during the QA phase.

---

## V. Reversible Architecture

Prefer reversible over irreversible operations. Database migrations must be reversible (up/down). Feature flags over hard cutoffs. Soft deletes over hard deletes for user-facing data.

---

## VI. Observability

All key operations (API calls, agent executions, background jobs, payment flows) must produce structured, machine-readable traces or logs. Silent failures are forbidden.

---

## VII. Clean Architecture

Domain logic must be decoupled from framework and transport concerns. Business rules live in a domain/core layer, not in route handlers or controllers. Route handlers should be thin (< 20 lines of business logic — extract to service/core layer).

---

## VIII. Dependency Management

All vendor integrations (payment processors, AI providers, storage services, auth providers) must be wrapped behind typed interface contracts. The application core must not directly import vendor SDKs.

---

## IX. Performance Discipline

Query efficiency: avoid N+1 queries; use appropriate indexes. Caching: cache expensive repeated reads at the right layer. Streaming: stream large responses rather than buffering. Bundle size: lazy-load routes and heavy components.

---

## X. Continuous Review

Run `/full-review` before any production deployment. Resolve all CRITICAL/HIGH findings before marking a feature complete. MEDIUM/LOW findings must be logged as tracked technical debt.

---

## Technology Stack Constraints

| Area | Constraint |
|------|-----------|
{{TECH_STACK_TABLE}}

> Fill in this table during `/speckit-orchestrator:init` based on the project's actual tech stack.
> Example rows:
> | UI components | Use design system / component library only — no raw HTML elements |
> | Styling | Use utility-first CSS (Tailwind or equivalent) — no inline styles |
> | Database | Use ORM migrations — never direct schema mutations in production |
> | Auth | Auth provider handles sessions — no custom session storage |
> | API | Zod/equivalent schema validation on all mutation endpoints |

---

## Development Workflow

### SpecKit Pipeline

All feature development follows this pipeline:

```
specify → clarify → plan → [plan-review] → tasks → analyze → implement → test-and-fix → [review-loop]
```

| Step | Purpose | Pauses? |
|------|---------|---------|
| specify | Generate spec.md from idea.md | No |
| clarify | Resolve ambiguities — **human checkpoint** | Yes |
| plan | Generate implementation plan with full testing strategy | No |
| plan-review | Parallel specialist reviews of the plan | No (team) |
| tasks | Break plan into implementation tasks | No |
| analyze | Verify artifact consistency | No |
| implement | Write code + tests in parallel | No (team) |
| test-and-fix | Run all 4 test tiers + agentic E2E; fix failures in loop | No |
| review-loop | Run full-review; fix CRITICAL/HIGH in loop | No (optional) |

### Quality Gates

1. **Specification gate** — no implementation without a ratified `spec.md`
2. **Plan gate** — no task generation without a reviewed `plan.md` with testing strategy
3. **Constitution check** — every plan verifies alignment with these principles
4. **Test gate** — all 4 test tiers must pass before code review
5. **Review gate** — `/full-review` must find no CRITICAL/HIGH findings before merge
6. **Documentation gate** — docs verified accurate to code-as-shipped

---

## Governance

### Amending This Constitution

Amendments require:
1. A documented rationale (why is this principle being changed?)
2. Review by the technical lead
3. Update to this file with the amendment date and author

Minor clarifications (wording, examples) can be made without a full amendment process.

Principles I–III (Quality, Security, Test Coverage) have elevated protection — amendments require explicit team consensus.
