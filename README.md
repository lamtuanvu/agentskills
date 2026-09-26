# agentskills

[![Skills](https://img.shields.io/badge/skills-12-blue)](skills/)
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
| [project-governance](skills/project-governance) | Establish and maintain project constitution, context, scoped rules, boundaries and reviewers with any development workflow |
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
- **Slash commands** — `/project-governance:init`, `/dev-cycle:run`, etc.
- **Specialist agents** — reviewer and brainstorm agents for plan review and implementation
- **Workflow engines** — adversarial, self-verifying loops (`loop-templates`)

### Install

```
# Step 1 — add this repo as a marketplace source (one time)
/plugin marketplace add https://github.com/lamtuanvu/agentskills

# Step 2 — install a plugin
/plugin install project-governance@lamtuanvu-marketplace
/plugin install github-ci@lamtuanvu-marketplace
```

### Available Plugins

| Plugin | Enhances | What it adds |
|--------|----------|--------------|
| [project-governance](plugins/project-governance) | project-governance skill (bundled) | `init`, `add-reviewer`, `review`, `status` commands; specialist reviewer and brainstorm agents |
| [dev-cycle](plugins/dev-cycle) | project-governance + loop-templates | Governed spec → plan → tasks → implement pipeline, git-ops tracker projection, browser-driven E2E harness |
| [loop-templates](plugins/loop-templates) | — | Adversarial, self-verifying Workflow engines (research, PRD, architecture, build, fix, review, implement-tasks) |
| [git-ops](plugins/git-ops) | dev-cycle | Swappable SCM + issue-tracker adapter for dev-cycle lifecycle events |
| [github-ci](plugins/github-ci) | — | Webhook listener for GitHub CI failures; pushes failures into your Claude Code session for automated diagnosis and fix |
| [capcut-api](https://github.com/lamtuanvu/VectCutAPI) | vectcut-api skill | CapCut/JianYing MCP tools for direct video editing |
| [ai-video-editor](https://github.com/lamtuanvu/video-to-structured-metadata) | video-proposal skill | Scene detection, audio transcription, vision analysis for video metadata |

---

## Project Governance — Any Workflow

`project-governance` establishes and maintains a project's constitution, persistent
context, scoped conventions, boundaries and reviewer responsibilities, then lets you
develop with Superpowers, `dev-cycle`, a custom workflow, or direct development.

```bash
# Claude Code plugin (skill + commands + reviewer agents)
/plugin install project-governance@lamtuanvu-marketplace
/project-governance:init

# Or the portable skill alone, for any agent
npx skills add lamtuanvu/agentskills@project-governance -g -y
```

Commands:

```text
/project-governance:init [notes]               # Constitution, context, rules, reviewers
/project-governance:add-reviewer <name> <focus>
/project-governance:review [paths | base | PR] # Review against applicable rules
/project-governance:status                     # Established vs proposed, drift, gaps
```

Or describe the task:

```text
Use project-governance to initialize this project's constitution and rules.
We use Superpowers for development; preserve our existing AGENTS.md and ADRs.

Load the project context and rules relevant to this API change.
Review this plan against the applicable project rules.
```

For a new project, the default layout is:

```text
.project/
  constitution.md       # Principles, boundaries, authority, amendments
  context.md            # Project context and canonical rule/reviewer index
  rules/<aspect>.md     # Rules scoped to relevant areas and changes
  reviewers/<name>.md   # Review responsibilities, checks and evidence
  decisions.md          # Decisions and accepted exceptions, when needed
```

Existing constitutions, architecture docs and policies can stay in their current
locations. Initialization indexes them and adds a small context-loading section to
agent instructions. It distinguishes established agreements from proposed rules,
and tailors reviewers and validation to the actual project. It requires no feature
branch, pipeline state, stop hook, or particular test tiers.

To run features end-to-end on top of governance, use `dev-cycle`
(`/dev-cycle:init`, then `/dev-cycle:run "<feature>"`).

**Migration from speckit-orchestrator:** the `speckit-orchestrator` plugin and the
`speckit-orchestrator`/`speckit-brainstorm` skills were removed. Uninstall them
(`/plugin uninstall speckit-orchestrator@lamtuanvu-marketplace`) and install
`project-governance`. An existing `.specify/memory/constitution.md` is picked up by
`/project-governance:init` and can stay canonical. Reviewer agents moved from
`speckit-orchestrator:*` to `project-governance:*`. The `speckit-implement` engine is
now `implement-tasks`; update `loops_default` in `.dev-cycle/config.json`.

---

## Repo Layout

```
agentskills/
├── skills/                          # Portable agentskills.io skills
│   ├── project-governance/
│   │   ├── SKILL.md                 # Workflow-independent project contract
│   │   ├── references/              # Init, context, review and maintenance
│   │   └── assets/                  # Constitution, rule and reviewer templates
│   └── ...                          # Other skills
├── plugins/                         # Claude Code plugins
│   ├── project-governance/
│   │   ├── commands/                # init, add-reviewer, review, status
│   │   ├── agents/                  # Specialist reviewer/brainstorm agents
│   │   └── skills/project-governance/  # Bundled copy of skills/project-governance
│   ├── dev-cycle/                   # Governed feature pipeline + E2E harness
│   ├── loop-templates/              # Workflow engines
│   ├── git-ops/                     # SCM + tracker adapter
│   └── github-ci/                   # CI failure MCP channel server
└── .claude-plugin/
    └── marketplace.json             # Claude Code plugin registry
```

**Bundled skill**: `skills/project-governance/` is canonical. The plugin ships a copy at `plugins/project-governance/skills/project-governance/` because installed plugins cannot reach files outside their own directory; CI fails if the two copies differ.

---

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for how to add a skill or plugin.

## License

Apache 2.0 — see [LICENSE](LICENSE)
