#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { FileManager } from './managers/file-manager.js';
import { StateManager } from './managers/state-manager.js';
import { GitManager } from './managers/git-manager.js';

import { handleInit } from './tools/init.js';
import { handlePlan } from './tools/plan.js';
import { handleExecute } from './tools/execute.js';
import { handleVerify } from './tools/verify.js';
import { handleDebug } from './tools/debug.js';
import { handleProgress, handlePause, handleResume } from './tools/navigation.js';
import { handleAddPhase, handleRemovePhase, handleDiscussPhase, handleMilestone } from './tools/phases.js';
import { handleAddTodo, handleCheckTodos, handleMap, handleHelp } from './tools/utilities.js';

// ─── Initialize Managers ─────────────────────────────────────────
const fileManager = new FileManager();
const stateManager = new StateManager(fileManager);
const gitManager = new GitManager(fileManager);

// ─── Create MCP Server ──────────────────────────────────────────
const server = new McpServer({
    name: 'gsd-mcp-server',
    version: '1.0.0',
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 1: gsd_init — Initialize a new GSD project
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_init',
    'Initialize a new GSD project with SPEC.md, ROADMAP.md, and context files. This is the first command to run.',
    {
        project_name: z.string().describe('Name of the project'),
        vision: z.string().describe('Project vision — one paragraph describing what you are building'),
        goals: z.array(z.string()).describe('List of project goals'),
        non_goals: z.array(z.string()).optional().describe('Things explicitly NOT in scope'),
        users: z.string().describe('Who will use this and how'),
        constraints: z.array(z.string()).optional().describe('Technical or timeline constraints'),
        success_criteria: z.array(z.string()).describe('Measurable success criteria'),
        milestone: z.string().optional().describe('Milestone name (default: v1.0)'),
        phases: z.array(z.object({
            name: z.string().describe('Phase name'),
            objective: z.string().describe('What this phase delivers'),
        })).describe('Development phases (3-5 recommended)'),
        working_directory: z.string().optional().describe('Project working directory (default: current directory)'),
    },
    async (input) => {
        const result = handleInit(fileManager, stateManager, gitManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 2: gsd_plan — Create execution plans for a phase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_plan',
    'Create executable PLAN.md files for a phase with XML-structured tasks. Plans are grouped into waves for parallel execution.',
    {
        phase: z.number().optional().describe('Phase number to plan (auto-detects next if omitted)'),
        plans: z.array(z.object({
            name: z.string().describe('Plan name'),
            wave: z.number().optional().describe('Execution wave (lower waves run first). Default: 1'),
            objective: z.string().describe('What this plan delivers and why'),
            context_files: z.array(z.string()).optional().describe('File paths for context'),
            tasks: z.array(z.object({
                name: z.string().describe('Task name'),
                files: z.array(z.string()).describe('Exact file paths this task modifies'),
                action: z.string().describe('Specific implementation instructions'),
                verify: z.string().describe('Command to prove task complete'),
                done: z.string().describe('Measurable acceptance criteria'),
                type: z.string().optional().describe('Task type: auto | checkpoint:human-verify | checkpoint:decision'),
            })).describe('Tasks in this plan (2-3 max)'),
            success_criteria: z.array(z.string()).describe('Measurable outcomes'),
        })).describe('Plans to create'),
        skip_research: z.boolean().optional().describe('Skip research phase'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handlePlan(fileManager, stateManager, gitManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 3: gsd_execute — Record task completion with atomic commit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_execute',
    'Record completion of a task within a phase. Creates a summary file and makes an atomic git commit. Call this after completing each task.',
    {
        phase: z.number().describe('Phase number'),
        task_name: z.string().describe('Name of the completed task'),
        task_result: z.string().describe('Description of what was accomplished'),
        files_changed: z.array(z.string()).optional().describe('List of files that were changed'),
        gaps_only: z.boolean().optional().describe('Execute only gap closure plans'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleExecute(fileManager, stateManager, gitManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 4: gsd_verify — Validate must-haves with evidence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_verify',
    'Verify that a phase meets all must-have requirements with evidence. Produces a PASS/FAIL verdict.',
    {
        phase: z.number().describe('Phase number to verify'),
        must_haves: z.array(z.object({
            description: z.string().describe('Must-have requirement'),
            passed: z.boolean().describe('Whether this requirement passed'),
            evidence: z.string().describe('Evidence (curl output, screenshot path, test results)'),
        })).describe('Must-have verifications'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleVerify(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 5: gsd_debug — Systematic debugging with 3-strike rule
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_debug',
    'Log a debugging attempt. After 3 failed attempts, forces a context dump and fresh session (prevents circular debugging).',
    {
        phase: z.number().describe('Phase number being debugged'),
        description: z.string().describe('What went wrong'),
        hypothesis: z.string().optional().describe('Your hypothesis about the cause'),
        result: z.string().optional().describe('Result of the debugging attempt'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleDebug(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 6: gsd_map — Analyze codebase and create ARCHITECTURE.md
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_map',
    'Map the current codebase structure and write ARCHITECTURE.md. Use this to understand an existing project before planning.',
    {
        project_name: z.string().describe('Project name'),
        overview: z.string().describe('High-level overview of the system'),
        components: z.array(z.object({
            name: z.string().describe('Component name'),
            description: z.string().describe('What this component does'),
            files: z.array(z.string()).describe('Files in this component'),
        })).describe('System components'),
        tech_stack: z.array(z.string()).describe('Technologies used'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleMap(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 7: gsd_progress — Show current position in roadmap
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_progress',
    'Show the current project status: phase progress, current task, blockers, and recommended next action.',
    {
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleProgress(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 8: gsd_pause — Save session state for handoff
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_pause',
    'Save the current session state. Use this when ending a coding session to preserve context for the next one.',
    {
        summary: z.string().describe('Summary of what was accomplished in this session'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handlePause(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 9: gsd_resume — Restore from last session
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_resume',
    'Restore context from a previous session. Loads SPEC, ROADMAP, and STATE files.',
    {
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleResume(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 10: gsd_add_todo — Quick capture an idea
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_add_todo',
    'Quickly capture an idea or task into TODO.md.',
    {
        item: z.string().describe('The todo item to add'),
        priority: z.enum(['high', 'medium', 'low']).optional().describe('Priority level (default: low)'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleAddTodo(fileManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 11: gsd_check_todos — List pending items
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_check_todos',
    'List all pending and completed TODO items.',
    {
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleCheckTodos(fileManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 12: gsd_add_phase — Add a phase to the roadmap
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_add_phase',
    'Add a new phase to the end of the roadmap.',
    {
        name: z.string().describe('Phase name'),
        objective: z.string().describe('What this phase delivers'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleAddPhase(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 13: gsd_remove_phase — Remove a phase (with safety)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_remove_phase',
    'Remove a phase from the roadmap. Cannot remove completed phases (safety check).',
    {
        phase: z.number().describe('Phase number to remove'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleRemovePhase(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 14: gsd_discuss_phase — Clarify phase scope
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_discuss_phase',
    'Discuss and clarify the scope of a phase before planning. Record questions and decisions.',
    {
        phase: z.number().describe('Phase number to discuss'),
        questions: z.array(z.string()).optional().describe('Open questions about this phase'),
        decisions: z.array(z.string()).optional().describe('Decisions made during discussion'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleDiscussPhase(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 15: gsd_milestone — Create a new milestone
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_milestone',
    'Create a new milestone with phases in the roadmap.',
    {
        name: z.string().describe('Milestone name'),
        phases: z.array(z.object({
            name: z.string().describe('Phase name'),
            objective: z.string().describe('What this phase delivers'),
        })).describe('Phases in this milestone'),
        working_directory: z.string().optional().describe('Project working directory'),
    },
    async (input) => {
        const result = handleMilestone(fileManager, stateManager, input);
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOOL 16: gsd_help — Show all available tools
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
server.tool(
    'gsd_help',
    'Show all available GSD tools and the recommended workflow.',
    {},
    async () => {
        const result = handleHelp();
        return { content: [{ type: 'text', text: result.message }] };
    }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  START SERVER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 GSD MCP Server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
