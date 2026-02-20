import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { generateArchitecture } from '../templates/index.js';

// ─── gsd_add_todo ──────────────────────────────────────────────

export interface AddTodoInput {
    item: string;
    priority?: 'high' | 'medium' | 'low';
    working_directory?: string;
}

export function handleAddTodo(
    fileManager: FileManager,
    input: AddTodoInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.' };
    }

    const todo = fileManager.readGsdFile('TODO.md') || '';
    const priorityIcon = input.priority === 'high' ? '🔴' : input.priority === 'medium' ? '🟡' : '🟢';
    const newItem = `- [ ] ${priorityIcon} ${input.item}`;

    const updated = todo.replace(
        /## Pending\n/,
        `## Pending\n${newItem}\n`
    );

    fileManager.writeGsdFile('TODO.md', updated || `# TODO.md\n\n## Pending\n${newItem}\n\n## Completed\n`);

    return {
        success: true,
        message: `✅ Added: ${priorityIcon} ${input.item}`,
    };
}

// ─── gsd_check_todos ───────────────────────────────────────────

export interface CheckTodosInput {
    working_directory?: string;
}

export function handleCheckTodos(
    fileManager: FileManager,
    input: CheckTodosInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found.' };
    }

    const todo = fileManager.readGsdFile('TODO.md') || 'No TODO.md found.';

    // Parse pending items
    const pendingMatch = todo.match(/## Pending\n([\s\S]*?)(?:\n## |$)/);
    const pending = pendingMatch
        ? pendingMatch[1].trim().split('\n').filter(l => l.startsWith('- [ ]'))
        : [];

    const completedMatch = todo.match(/## Completed\n([\s\S]*?)$/);
    const completed = completedMatch
        ? completedMatch[1].trim().split('\n').filter(l => l.startsWith('- [x]'))
        : [];

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TODO LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pending (${pending.length}):
${pending.length > 0 ? pending.map(p => `  ${p}`).join('\n') : '  None — all clear! 🎉'}

Completed (${completed.length}):
${completed.length > 0 ? completed.map(c => `  ${c}`).join('\n') : '  Nothing yet'}

───────────────────────────────────────`,
    };
}

// ─── gsd_map ───────────────────────────────────────────────────

export interface MapInput {
    project_name: string;
    overview: string;
    components: Array<{
        name: string;
        description: string;
        files: string[];
    }>;
    tech_stack: string[];
    working_directory?: string;
}

export function handleMap(
    fileManager: FileManager,
    stateManager: StateManager,
    input: MapInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    if (!fileManager.isGsdInitialized()) {
        // Map can be run before full init
        fileManager.ensureDir('.gsd');
    }

    const archContent = generateArchitecture({
        projectName: input.project_name,
        overview: input.overview,
        components: input.components,
        techStack: input.tech_stack,
    });

    fileManager.writeGsdFile('ARCHITECTURE.md', archContent);

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► CODEBASE MAPPED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Components found: ${input.components.length}
Tech stack: ${input.tech_stack.join(', ')}

Components:
${input.components.map(c => `  📦 ${c.name} (${c.files.length} files)`).join('\n')}

Written to: .gsd/ARCHITECTURE.md

───────────────────────────────────────`,
    };
}

// ─── gsd_help ──────────────────────────────────────────────────

export function handleHelp(): { success: boolean; message: string } {
    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 CORE WORKFLOW
  gsd_init          → Initialize project (SPEC + ROADMAP)
  gsd_plan          → Create execution plans for a phase
  gsd_execute       → Record task completion + atomic commit
  gsd_verify        → Validate must-haves with evidence
  gsd_debug         → Systematic debugging (3-strike rule)
  gsd_map           → Analyze codebase → ARCHITECTURE.md

🟢 NAVIGATION & STATE
  gsd_progress      → Show current position in roadmap
  gsd_pause         → Save session state for handoff
  gsd_resume        → Restore from last session

🟠 PHASE MANAGEMENT
  gsd_add_phase     → Add a phase to the roadmap
  gsd_remove_phase  → Remove a phase (safety checks)
  gsd_discuss_phase → Clarify scope before planning
  gsd_milestone     → Create a new milestone

🟣 UTILITIES
  gsd_add_todo      → Quick capture an idea
  gsd_check_todos   → List pending items
  gsd_help          → This help message

───────────────────────────────────────
💡 Typical flow:
  gsd_init → gsd_plan → gsd_execute → gsd_verify
───────────────────────────────────────`,
    };
}
