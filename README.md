# agentskills

[![Skills](https://img.shields.io/badge/skills-11-blue)](skills/)
[![Plugins](https://img.shields.io/badge/plugins-4-purple)](plugins/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](docs/CONTRIBUTING.md)

A collection of AI agent skills and Claude Code plugins. Skills work across any agent that supports the [agentskills.io](https://agentskills.io) spec. Claude Code plugins layer on top of skills to add hooks, slash commands, and parallel agent teams.

---

## Skills

Skills are portable — they work with Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, Warp, and any agent that supports the agentskills.io spec.

### Install

```bash
# Install all skills globally
npx skills add lamtuanvu/agentskills -g -y

# Install a single skill
npx skills add lamtuanvu/agentskills@gemini-image-gen -g -y
```

### Available Skills

| Skill | Description |
|-------|-------------|
| [agent-manager](skills/agent-manager) | Manage local CLI agents via tmux sessions (start/stop/monitor/assign) |
| [brand-guidelines](skills/brand-guidelines) | Anthropic brand colors and typography for any artifact |
| [find-docs](skills/find-docs) | Fetch up-to-date docs for any library, framework, or SDK via Context7 |
| [gemini-image-gen](skills/gemini-image-gen) | Generate SVG vector graphics and PNG images via Google Gemini API |
| [mcp-builder](skills/mcp-builder) | Guide and templates for building MCP servers (Python/Node) |
| [plugin-creator](skills/plugin-creator) | Scaffold and develop Claude Code plugins incrementally |
| [skill-creator](skills/skill-creator) | Guide for creating agentskills-compatible SKILL.md packages |
| [speckit-brainstorm](skills/speckit-brainstorm) | Brainstorm a feature, define requirements, produce `idea.md` |
| [speckit-orchestrator](skills/speckit-orchestrator) | Run the SpecKit pipeline: specify → clarify → plan → tasks → analyze → implement |
| [vectcut-api](skills/vectcut-api) | CapCut/JianYing video editing API reference and Python client |
| [video-proposal](skills/video-proposal) | Analyze a clip collection and propose short-form video concepts |

### Usage

Once installed, invoke a skill by describing the task. Your agent will automatically select the relevant skill. You can also invoke explicitly:

```
# Claude Code
/find-docs how do I use React Server Components?
/gemini-image-gen a minimalist settings gear icon

# Other agents (varies by agent)
@find-docs how do I configure Prisma with PostgreSQL?
```

---

## Claude Code Plugins

Plugins are Claude Code-specific. They extend skills with:
- **Stop hooks** — auto-continue pipelines without user intervention
- **Slash commands** — `/speckit-orchestrator:execute`, `/speckit-orchestrator:status`, etc.
- **Agent teams** — parallel specialist agents for plan review and implementation

### Install

```
# Step 1 — add this repo as a marketplace source (one time)
/plugin marketplace add https://github.com/lamtuanvu/agentskills

# Step 2 — install a plugin
/plugin install speckit-orchestrator@lamtuanvu-marketplace
/plugin install github-ci@lamtuanvu-marketplace
```

### Available Plugins

| Plugin | Enhances | What it adds |
|--------|----------|--------------|
| [speckit-orchestrator](plugins/speckit-orchestrator) | speckit-brainstorm + speckit-orchestrator skills | Stop hook auto-continuation, `/speckit-orchestrator:*` commands, parallel agent teams for plan review and implementation |
| [github-ci](plugins/github-ci) | — | Webhook listener for GitHub CI failures; pushes failures into your Claude Code session for automated diagnosis and fix |
| [capcut-api](https://github.com/lamtuanvu/VectCutAPI) | vectcut-api skill | CapCut/JianYing MCP tools for direct video editing |
| [ai-video-editor](https://github.com/lamtuanvu/video-to-structured-metadata) | video-proposal skill | Scene detection, audio transcription, vision analysis for video metadata |

---

## SpecKit Workflow

SpecKit is a structured feature development pipeline built on the speckit-brainstorm and speckit-orchestrator skills.

```
speckit-brainstorm → idea.md → speckit-orchestrator → spec → clarify → plan → tasks → analyze → implement
```

### With any agent (skill only)

```bash
# 1. Install the skills
npx skills add lamtuanvu/agentskills@speckit-brainstorm -g -y
npx skills add lamtuanvu/agentskills@speckit-orchestrator -g -y

# 2. Brainstorm a feature
# Invoke speckit-brainstorm with your feature idea.
# It explores the codebase, asks clarifying questions,
# and produces docs/features/<name>/idea.md on approval.

# 3. Run the pipeline
# Invoke speckit-orchestrator.
# It reads idea.md, runs each step, and pauses at clarify for your review.
# After clarify, re-invoke to continue through to implementation.
```

### With Claude Code (skill + plugin)

```
# Install skills first
npx skills add lamtuanvu/agentskills@speckit-brainstorm -g -y
npx skills add lamtuanvu/agentskills@speckit-orchestrator -g -y

# Then install the plugin for full automation
/plugin install speckit-orchestrator@lamtuanvu-marketplace
```

The plugin adds:
- **Auto-continuation**: stop hook feeds `/speckit-orchestrator:execute` after each step — pipeline runs to completion unattended (pauses only at the clarify checkpoint)
- **Parallel brainstorm**: agent team (architect, UX analyst, feasibility analyst, devil's advocate) analyzes your feature from all angles before writing `idea.md`
- **Parallel plan review**: security, performance, conventions, and UI specialists review the plan in parallel
- **Parallel implementation**: tasks partitioned across multiple implementers + dedicated test-writer and QA reviewer

Commands:
```
/speckit-orchestrator:brainstorm <feature description>
/speckit-orchestrator:execute
/speckit-orchestrator:status
/speckit-orchestrator:rollback <step>
/speckit-orchestrator:cancel-pipeline
```

---

## Repo Layout

```
agentskills/
├── skills/                          # Portable agentskills.io skills
│   ├── speckit-orchestrator/
│   │   ├── SKILL.md                 # Pipeline instructions + loop logic
│   │   ├── scripts/                 # Shared Python scripts (canonical)
│   │   │   ├── orchestrator.py      # State machine
│   │   │   ├── verify_state.py      # State verification
│   │   │   ├── partition_tasks.py   # Task partitioning
│   │   │   └── init_feature.py      # Feature initialization
│   │   └── references/              # Step-by-step guides
│   │       ├── step-specify.md
│   │       ├── step-clarify.md
│   │       ├── step-plan.md
│   │       ├── step-tasks.md
│   │       ├── step-analyze.md
│   │       └── step-implement.md
│   └── ...                          # Other skills
├── plugins/                         # Claude Code plugins
│   ├── speckit-orchestrator/
│   │   ├── hooks/                   # Stop hook (auto-continuation)
│   │   ├── commands/                # Slash commands
│   │   └── agents/                  # Team agent definitions
│   │   # Scripts inherited from skills/speckit-orchestrator/scripts/
│   └── github-ci/                   # CI failure MCP channel server
└── .claude-plugin/
    └── marketplace.json             # Claude Code plugin registry
```

**Inheritance**: The `speckit-orchestrator` plugin has no scripts of its own — it references `skills/speckit-orchestrator/scripts/` directly. The skill is the base; the plugin is the Claude Code enhancement layer.

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for how to add a skill or plugin.

## License

Apache 2.0 — see [LICENSE](LICENSE)
