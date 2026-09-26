# {{REVIEWER_NAME}}

Role: {{FOCUS}}
Human owner/approver: {{OWNER_OR_UNKNOWN}}
Applies when: {{PATHS_DOMAINS_OR_RISK_TRIGGERS}}
Excludes: {{EXCLUSIONS}}
Review requirement: {{ADVISORY_OR_REQUIRED_WITH_POLICY_SOURCE}}

## Context

Read {{CONSTITUTION_PATH}}, {{CONTEXT_INDEX_PATH}}, and {{APPLICABLE_RULE_PATHS}}.
Review the requested artifact or change scope, regardless of workflow or filename.

## Checks

{{CONCRETE_PROJECT_SPECIFIC_CHECKS_WITH_RULE_IDS_AND_EVIDENCE}}

## Findings contract

Report scope and governance version, checks performed and evidence, findings with
rule/source, location, impact, severity and remedy, and unverified checks. Label
advisory recommendations separately from established-rule violations. Apply the
project's gate policy; do not invent one. Missing required evidence stays unverified.

Analyze and report without editing source or changing policy. Return findings to
the caller or the requested report path. Human approval remains separate.
