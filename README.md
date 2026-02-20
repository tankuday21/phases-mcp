# 🚀 GSD MCP Server

**Get Shit Done** — A spec-driven, context-engineered development methodology as an MCP server.

> Stop vibecoding. Start shipping.

## ⚡ Quick Setup

### 1. Build

```bash
npm install
npm run build
```

### 2. Add to Antigravity

Add this to your `~/.gemini/antigravity/mcp_config.json`:

```json
{
  "mcpServers": {
    "gsd": {
      "command": "node",
      "args": ["c:/Users/user/Downloads/Projects/Real Projects/GSD MCP/dist/index.js"],
      "transportType": "stdio"
    }
  }
}
```

### 3. Restart Antigravity

Restart the IDE to load the new MCP server.

## 🎮 Available Tools (16)

| Tool | Purpose |
|------|---------|
| `gsd_init` | Initialize project (SPEC + ROADMAP) |
| `gsd_plan` | Create execution plans for a phase |
| `gsd_execute` | Record task completion + atomic commit |
| `gsd_verify` | Validate must-haves with evidence |
| `gsd_debug` | Systematic debugging (3-strike rule) |
| `gsd_map` | Analyze codebase → ARCHITECTURE.md |
| `gsd_progress` | Show current position in roadmap |
| `gsd_pause` | Save session state for handoff |
| `gsd_resume` | Restore from last session |
| `gsd_add_todo` | Quick capture an idea |
| `gsd_check_todos` | List pending items |
| `gsd_add_phase` | Add a phase to the roadmap |
| `gsd_remove_phase` | Remove a phase (safety checks) |
| `gsd_discuss_phase` | Clarify scope before planning |
| `gsd_milestone` | Create a new milestone |
| `gsd_help` | Show all available tools |

## 🔄 Typical Workflow

```
gsd_init → gsd_plan → gsd_execute → gsd_verify
```

1. **`gsd_init`** — Describe your project, goals, and phases
2. **`gsd_plan`** — Create XML-structured plans for each phase
3. **`gsd_execute`** — Execute tasks with atomic git commits
4. **`gsd_verify`** — Validate with evidence (screenshots, tests, curl)

## 📁 Generated Files

```
.gsd/
├── SPEC.md          ← Finalized project specification
├── ROADMAP.md       ← Phases and progress
├── STATE.md         ← Session memory and current position
├── ARCHITECTURE.md  ← System design (from gsd_map)
├── DECISIONS.md     ← Architecture Decision Records
├── JOURNAL.md       ← Session log
├── TODO.md          ← Quick capture
└── phases/
    ├── 1/
    │   ├── 1-PLAN.md
    │   ├── 1-SUMMARY.md
    │   └── VERIFICATION.md
    └── 2/
        └── ...
```

## 🧠 Philosophy

- **Plan before building** — SPEC.md matters more than you think
- **Fresh context > polluted context** — State dumps prevent hallucinations
- **Proof over trust** — Screenshots and command outputs, not "looks right"
- **Aggressive atomicity** — 2-3 tasks per plan, atomic commits
- **3-strike debugging** — After 3 failures, dump context and start fresh

## License

MIT
