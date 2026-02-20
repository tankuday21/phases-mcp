# 🚀 Phases MCP

**A spec-driven, context-engineered development methodology as an MCP server.**

> Stop vibecoding. Start shipping phase by phase.

Phases turns your AI coding assistant into a structured development partner. Define specs, plan in phases, execute with atomic commits, and verify with real evidence.

## ⚡ Quick Setup

### Install & Build

```bash
git clone https://github.com/YOUR_USERNAME/phases-mcp.git
cd phases-mcp
npm install
npm run build
```

### Add to Your MCP Client

Add this to your MCP configuration:

```json
{
  "mcpServers": {
    "phases": {
      "command": "node",
      "args": ["/path/to/phases-mcp/dist/index.js"],
      "transportType": "stdio"
    }
  }
}
```

Restart your IDE/client and all 16 `phases_*` tools will be available.

## 🎮 Available Tools (16)

### 🔵 Core Workflow
| Tool | Purpose |
|------|---------|
| `phases_init` | Initialize project with SPEC + ROADMAP |
| `phases_plan` | Create XML-structured execution plans |
| `phases_execute` | Record task completion + atomic git commit |
| `phases_verify` | Validate must-haves with evidence |
| `phases_debug` | Systematic debugging with 3-strike rule |
| `phases_map` | Analyze codebase → ARCHITECTURE.md |

### 🟢 Navigation & State
| Tool | Purpose |
|------|---------|
| `phases_progress` | Show current position in roadmap |
| `phases_pause` | Save session state for handoff |
| `phases_resume` | Restore context from last session |

### 🟠 Phase Management
| Tool | Purpose |
|------|---------|
| `phases_add_phase` | Add a phase to the roadmap |
| `phases_remove_phase` | Remove a phase (with safety checks) |
| `phases_discuss_phase` | Clarify scope before planning |
| `phases_milestone` | Create a new milestone with phases |

### 🟣 Utilities
| Tool | Purpose |
|------|---------|
| `phases_add_todo` | Quick capture an idea or task |
| `phases_check_todos` | List all pending TODO items |
| `phases_help` | Show all tools and workflow |

## 🔄 Typical Workflow

```
phases_init → phases_plan → phases_execute → phases_verify
```

1. **`phases_init`** — Define your project vision, goals, and development phases
2. **`phases_plan`** — Create XML-structured plans with tasks, verification commands, and acceptance criteria
3. **`phases_execute`** — Complete tasks one-by-one, each with an atomic git commit
4. **`phases_verify`** — Validate with real evidence (screenshots, test output, curl responses)

## 📁 Project Structure Created

```
.gsd/
├── SPEC.md          ← Finalized project specification
├── ROADMAP.md       ← Phases and progress tracking
├── STATE.md         ← Session memory and current position
├── ARCHITECTURE.md  ← System design (from phases_map)
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

- **Spec before code** — SPEC.md matters more than you think
- **Phase-driven development** — Break work into achievable phases
- **Fresh context > polluted context** — State dumps prevent hallucinations
- **Proof over trust** — Screenshots and command outputs, not "looks right"
- **Aggressive atomicity** — 2-3 tasks per plan, atomic commits
- **3-strike debugging** — After 3 failures, dump context and start fresh

## 🛠 Tech Stack

- **TypeScript** — Type-safe implementation
- **MCP SDK** — `@modelcontextprotocol/sdk` for server framework
- **Zod** — Schema validation for all tool inputs
- **stdio transport** — Local process communication

## License

MIT
