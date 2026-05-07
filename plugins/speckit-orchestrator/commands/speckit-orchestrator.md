---
description: "SpecKit Orchestrator — manage the feature development pipeline"
---

# SpecKit Orchestrator

The SpecKit Orchestrator manages the feature development pipeline:

```
specify → clarify → plan → [plan-review] → tasks → analyze → implement → test-and-fix → [review-loop]
```

## Available Commands

| Command | Description |
|---------|-------------|
| `/speckit-orchestrator:init` | Initialize a project with the SpecKit workflow |
| `/speckit-orchestrator:brainstorm <description>` | Brainstorm and plan a new feature |
| `/speckit-orchestrator:execute` | Run the next pipeline step |
| `/speckit-orchestrator:status` | Show current pipeline progress |
| `/speckit-orchestrator:rollback <step>` | Reset pipeline to a specific step |
| `/speckit-orchestrator:cancel-pipeline` | Pause the pipeline |
| `/speckit-orchestrator:complete` | Archive state after pipeline completion |
| `/speckit-orchestrator:add-reviewer <name>` | Add a new specialist reviewer skill |

## Quick Start

0. **Initialize the project** (first time only):
   ```
   /speckit-orchestrator:init
   ```

1. **Start a new feature:**
   ```
   /speckit-orchestrator:brainstorm add dark mode toggle
   ```

2. **Run the pipeline:**
   ```
   /speckit-orchestrator:execute
   ```

3. **Check progress:**
   ```
   /speckit-orchestrator:status
   ```

4. **Add a new reviewer:**
   ```
   /speckit-orchestrator:add-reviewer payments-reviewer "PCI DSS compliance, card data handling, idempotency"
   ```
