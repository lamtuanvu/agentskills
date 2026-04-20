# Contributing

Thank you for your interest in contributing! This guide explains how to add skills to the marketplace.

## Skill Structure

Every skill follows a flat layout:

```
skills/<skill-name>/
├── SKILL.md              # Required: Main skill file
├── scripts/              # Optional: Executable code
├── references/           # Optional: Documentation
└── assets/               # Optional: Templates, images
```

### Required: SKILL.md

Your skill must have a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: my-skill
description: Clear description of what this skill does and when to use it.
argument-hint: Optional hint for skill arguments
metadata:
  author: your-github-username
  version: "1.0.0"
---

# My Skill

## Overview

Explain what this skill does...

## When to Use

Describe scenarios when this skill should trigger...

## Instructions

Step-by-step guidance for the agent...
```

### Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier (kebab-case) |
| `description` | Yes | Clear, specific description of purpose |
| `metadata.author` | Recommended | Your GitHub username |
| `metadata.version` | Recommended | Semantic version (e.g., "1.0.0") |
| `argument-hint` | No | Hint for skill arguments |
| `allowed-tools` | No | List of tools the skill uses (e.g., `["Bash", "Read"]`) |
| `license` | No | License reference |

## Adding Your Skill

### 1. Fork the Repository

```bash
git clone https://github.com/lamtuanvu/claude-code-marketplace.git
cd claude-code-marketplace
```

### 2. Create Skill Directory

```bash
mkdir -p skills/<skill-name>
```

### 3. Create SKILL.md

Write your skill following the structure above. Use agent-neutral language -- avoid referencing specific agents (e.g., use "the agent" instead of "Claude").

### 4. Test Locally

```bash
# Install via agentskills CLI
npx skills add . -g -y

# Or copy manually
cp -r skills/my-skill ~/.claude/skills/
```

### 5. Submit Pull Request

```bash
git checkout -b add-my-skill
git add skills/my-skill/
git commit -m "Add my-skill"
git push origin add-my-skill
```

Then open a pull request on GitHub.

## Quality Guidelines

### Good Skills

- Solve a specific, real problem
- Have clear, actionable instructions
- Include usage examples
- Work reliably across environments and agents

### SKILL.md Best Practices

1. **Be Specific**: Agents need clear instructions
2. **Use Imperative Form**: "Run this command" not "You should run"
3. **Include Examples**: Show concrete usage
4. **Reference Resources**: Point to scripts, docs as needed
5. **Handle Errors**: Explain what to do when things fail
6. **Stay Portable**: Use agent-neutral language

## Validation

The CI pipeline validates:

- `SKILL.md` exists with valid frontmatter
- Required fields (`name`, `description`) present
- Flat `skills/<name>/` directory structure
- `metadata` fields recommended but not required

## License

By contributing, you agree your skill will be licensed under Apache 2.0.

## Questions?

Open an issue or discussion on GitHub.
