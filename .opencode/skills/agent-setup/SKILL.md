---
name: agent-setup
description: Create, configure, and manage OpenCode V2 agents and subagents via JSONC config or markdown files
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: configuration
---

# Agent Setup and Configuration Skill

## MANDATORY: Consult Official Docs First

Before using this skill, refer to the canonical source:

- **[OpenCode Agents Docs](https://opencode.ai/v2/docs/agents/)** — Agent modes, configuration options, permissions, and examples

## Agent Modes

OpenCode has three agent modes:

| Mode       | Description                                                           | Selection                                    |
| ---------- | --------------------------------------------------------------------- | -------------------------------------------- |
| `primary`  | Runs as the main agent for a session (default for a new custom agent) | Session selection                            |
| `subagent` | Runs only in a child session through the `subagent` tool              | The `subagent` tool, or `@name` in a message |
| `all`      | Runs either as a primary agent or as a subagent                       | Either of the above                          |

### Built-in Agents

**Primary:** `build` (default, broad tool access), `plan` (planning, restricted edits)
**Subagent:** `general` (research and multi-step work), `explore` (read-only code and web search)
**Hidden system:** `compaction`, `title`, `summary` (run automatically, not user-selectable)

V2 has no built-in `scout` agent.

## Configuration Locations

Agents can be defined in two ways:

### 1. JSONC via `opencode.jsonc` / `opencode.json`

Define agents under the `agents` key in any OpenCode config file, project or global
(`~/.config/opencode/opencode.jsonc`):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "agents": {
    "reviewer": {
      "description": "Reviews changes for correctness and regressions",
      "mode": "subagent",
      "system": "Report findings in severity order.",
      "permissions": [
        { "action": "edit", "resource": "*", "effect": "deny" },
        { "action": "shell", "resource": "*", "effect": "deny" }
      ]
    }
  }
}
```

### 2. Markdown Files

Place in global `~/.config/opencode/agents/` or project `.opencode/agents/`. The filename stem
(without `.md`) becomes the agent name; a nested path becomes part of the agent ID
(`.opencode/agents/team/reviewer.md` → `team/reviewer`).

```markdown
---
description: Reviews changes for correctness and regressions
mode: subagent
permissions:
  - action: edit
    resource: '*'
    effect: deny
  - action: shell
    resource: '*'
    effect: deny
---

Review the current changes. List findings in severity order with file and line references.
```

In a Markdown agent, the document body becomes the agent's `system` prompt.

## Agent Options Reference

| Option        | Type                                   | Description                                                                   |
| ------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| `description` | string                                 | Explains the agent's purpose; shown to the model when choosing an agent       |
| `mode`        | `"primary"` \| `"subagent"` \| `"all"` | Where the agent may run; defaults to `"primary"` for a new custom agent       |
| `model`       | string or object                       | `provider/model` with an optional `#variant`, or the expanded object form     |
| `system`      | string                                 | System prompt; a non-empty value replaces the provider base prompt (JSONC)    |
| `permissions` | array                                  | Ordered `{ action, resource, effect }` rules (see below)                      |
| `steps`       | number                                 | Positive maximum number of model steps before OpenCode asks for a summary     |
| `hidden`      | boolean                                | Removes the agent from listings, interactive discovery, and the subagent list |
| `color`       | string                                 | Six-digit hex UI colour, e.g. `"#ff6b6b"`                                     |
| `disabled`    | boolean                                | Removes a built-in or custom agent at that point in configuration loading     |
| `request`     | object                                 | Per-agent `headers` and JSON `body` overlays (preserved, not yet sent)        |

> **Do not use legacy top-level fields** such as `temperature`, `top_p`, `prompt`, `permission`,
> `tools`, `disable`, or `maxSteps` in V2 agent configuration.

## Permissions

`permissions` is an ordered list of matching rules. The **last** matching rule wins, so put broad
rules before exceptions:

```jsonc
{
  "permissions": [
    { "action": "*", "resource": "*", "effect": "deny" },
    { "action": "read", "resource": "src/**", "effect": "allow" }
  ]
}
```

| Field      | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| `action`   | Tool or permission action; wildcards supported                |
| `resource` | Path, command, agent ID, or other value matched by the action |
| `effect`   | `allow`, `ask`, or `deny`                                     |

Common actions:

| Action                  | Covers                                |
| ----------------------- | ------------------------------------- |
| `shell`                 | Shell commands                        |
| `edit`                  | Edit, write, and patch tools          |
| `subagent`              | Child agents                          |
| `read`, `glob`, `grep`  | Local discovery tools                 |
| `webfetch`, `websearch` | Web tools                             |
| `skill`                 | Skill loading                         |
| `question`              | Interactive questions                 |
| `external_directory`    | Reads and writes outside the worktree |

For `read`, `edit`, and `external_directory` resources, `~` and `$HOME` are expanded. Shell
resources remain raw command text and are not expanded.

### Subagent Permissions

Control which subagents an agent may launch:

```jsonc
{
  "permissions": [
    { "action": "subagent", "resource": "*", "effect": "deny" },
    { "action": "subagent", "resource": "reviewer", "effect": "allow" }
  ]
}
```

Global `permissions` apply before agent-specific rules, and permission rules append when
definitions merge, so agent rules can refine the global set.

## Creating Agents

V2 has no `opencode agent` CLI subcommand. Create an agent by writing a Markdown file under
`.opencode/agents/` (or `~/.config/opencode/agents/`), or by adding an entry under `agents` in an
OpenCode config file. Reload OpenCode or start a new session to refresh the agent registry.

## Selection

Set the primary agent used when a session has not selected one:

```jsonc
{
  "default_agent": "writer",
  "agents": {
    "writer": { "mode": "primary" }
  }
}
```

The selected default must exist, be visible, and support primary use; otherwise OpenCode uses
`build`, then the first visible primary-capable agent.

## Using Subagents

- **Automatic**: a primary agent launches subagents via the `subagent` tool when needed
- **Manual**: type `@agent-name` in your message
- Subagents run with fresh context, and the default nesting depth is one, so a subagent cannot
  launch a further subagent

## Example: Read-Only Code Reviewer Agent

Place as `.opencode/agents/reviewer.md`:

```markdown
---
description: Reviews code for quality and best practices without making changes
mode: subagent
permissions:
  - action: edit
    resource: '*'
    effect: deny
  - action: shell
    resource: '*'
    effect: ask
  - action: shell
    resource: 'git diff*'
    effect: allow
  - action: shell
    resource: 'git log*'
    effect: allow
  - action: webfetch
    resource: '*'
    effect: deny
---

Only analyse code and suggest changes. Do not modify any files.
```

## Example: Documentation Agent

```markdown
---
description: Writes and maintains project documentation
mode: subagent
permissions:
  - action: shell
    resource: '*'
    effect: deny
---

You are a technical writer. Create clear, comprehensive documentation.
Focus on:

- Clear explanations
- Proper structure
- Code examples
- User-friendly language
```

## Validation

- Agent Markdown files must have valid YAML frontmatter; `description` is recommended because
  OpenCode shows it to the model choosing an agent
- Agent names in Markdown files derive from the file path stem (e.g. `reviewer.md` → `reviewer`,
  `team/reviewer.md` → `team/reviewer`)
- Reload OpenCode after adding or removing agent files to refresh the agent registry
