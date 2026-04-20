# Agent Skills Marketplace

[![Skills](https://img.shields.io/badge/skills-11-blue)](skills/)
[![License](https://img.shields.io/badge/license-Apache%202.0-green)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](docs/CONTRIBUTING.md)

Skills for AI coding agents. Works with Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, Warp, and [more](https://agentskills.io).

## Install

### Any Agent (via agentskills CLI)

```bash
# Install all skills
npx skills add lamtuanvu/claude-code-marketplace -g -y

# Install a single skill
npx skills add lamtuanvu/claude-code-marketplace@gemini-image-gen -g -y
```

### Claude Code Plugins (for hooks, commands, agent teams)

```
/plugin marketplace add https://github.com/lamtuanvu/claude-code-marketplace
/plugin install speckit-orchestrator@lamtuanvu-marketplace
```

## Skills

| Skill | Description |
|-------|-------------|
| [agent-manager](skills/agent-manager) | Manage local CLI agents via tmux sessions |
| [brand-guidelines](skills/brand-guidelines) | Anthropic brand colors and typography |
| [find-docs](skills/find-docs) | Retrieve up-to-date library/framework documentation |
| [gemini-image-gen](skills/gemini-image-gen) | Generate SVG and PNG images via Gemini API |
| [mcp-builder](skills/mcp-builder) | Guide for creating MCP servers |
| [plugin-creator](skills/plugin-creator) | Create and develop Claude Code plugins |
| [skill-creator](skills/skill-creator) | Guide for creating effective skills |
| [speckit-brainstorm](skills/speckit-brainstorm) | Brainstorm features and produce idea.md |
| [speckit-orchestrator](skills/speckit-orchestrator) | Execute the SpecKit pipeline (specify->implement) |
| [vectcut-api](skills/vectcut-api) | CapCut/JianYing video editing API reference |
| [video-proposal](skills/video-proposal) | Propose short-form video concepts from clip metadata |

## SpecKit Workflow

Structured feature development pipeline:

```
brainstorm -> specify -> clarify -> plan -> tasks -> analyze -> implement
```

1. **Brainstorm**: `speckit-brainstorm` -- explore ideas, produce `idea.md`
2. **Execute**: `speckit-orchestrator` -- run the pipeline step by step
3. **Enhanced** (Claude Code only): Install the plugin for auto-continuation via stop hook and parallel agent teams

## Plugins (Claude Code Only)

Plugins add hooks, commands, and agent teams on top of portable skills.

| Plugin | Description |
|--------|-------------|
| [speckit-orchestrator](plugins/speckit-orchestrator) | Stop hook auto-continuation + agent teams for parallel reviews/implementation |
| [ai-video-editor](https://github.com/lamtuanvu/video-to-structured-metadata) | Video metadata extraction with scene detection |
| [capcut-api](https://github.com/lamtuanvu/VectCutAPI) | CapCut/JianYing editing via MCP tools |

## Skill Structure

```
skills/
├── agent-manager/
│   └── SKILL.md
├── gemini-image-gen/
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   └── assets/
├── speckit-orchestrator/
│   ├── SKILL.md
│   ├── scripts/
│   └── references/
└── ...
```

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md).

## License

Apache 2.0 -- See [LICENSE](LICENSE)
