# Project reviewers and governance review

## Establish or extend a reviewer

Read the constitution, context index, relevant rules, ownership and existing
reviewer definitions. Use [the reviewer template](../assets/reviewer-template.md)
for a missing role. Store portable definitions under `.project/reviewers/` or
reuse the project's existing location. Update the context index with triggers,
definition path, and advisory/required status. Re-running the operation preserves
custom checklists and unrelated entries.

Each reviewer needs a focus, applicability triggers, exclusions, source rules,
concrete checks, and an output/evidence contract. Capture the human owner or
approver separately when known; an AI reviewer cannot impersonate their approval.
Reviewer selection depends on project needs, not a mandatory security/performance/
TypeScript trio. Tailor checks to the actual language and architecture.

Native skill wrappers are optional. If requested, put a small `SKILL.md` in the
runtime's supported project skill directory with `name`, a scoped `description`,
and instructions to load the canonical reviewer definition. Verify that directory
is supported by the target runtime before writing. Wrappers and aggregators must
reference the same index, not duplicate rule bodies or hard-code reviewer counts.
The portable core requires no runtime-specific directory or parallel-agent tool.

## Review the requested scope

Accept a requirements document, design, plan, code diff, or other work product from
any workflow. Establish the exact artifact paths or diff base first. For branch/PR
review, use its actual target base; the upstream branch is not necessarily the PR
base. For local-change review include staged, unstaged, and relevant untracked
files. State exclusions. A clean diff means no changed files to review, not an
automatic whole-codebase audit. Never filter by a hard-coded language list.

Load only applicable established rules and reviewers. Proposed rules may receive
advisory feedback but cannot become blocking policy. If a rule designates a
required reviewer, name them; otherwise choose useful perspectives proportionate
to the task. If required review cannot run, report it as outstanding. Run reviews
sequentially unless available tooling and task authorization support delegation;
when delegating, pass the context packet in [apply-context.md](apply-context.md).

Reviewers analyze and report. They do not modify code, amend rules, approve their
own exceptions, or start an automatic fix loop. Read unchanged surrounding code
as needed for context, while distinguishing newly introduced issues from existing
ones. Cite the applicable established rule (or label a finding advisory), concrete
location, evidence, impact, and remedy. Do not claim a command was run from a
checklist alone. Distinguish confirmed problems from risks needing verification.

Aggregate overlapping findings without discarding independent evidence. Report:

1. Scope and governance version used.
2. Applicable rules and reviewers; completed, unavailable, and inapplicable checks.
3. Findings with rule ID/source, severity, location, evidence, impact, and remedy.
4. Check results, unresolved decisions, accepted exceptions, and human approvals
   still required.
5. Verdict against the project's actual gates: satisfied, unmet, or unverified.

Severity describes impact; gate policy comes from the project. With no established
severity/gate policy, explain impact and report advisory findings without inventing
a merge veto. No findings from completed reviewers does not cover missing required
review. Store a report at the project's existing review location when requested;
otherwise return it in the conversation.
