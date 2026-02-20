import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { generateArchitecture } from '../templates/index.js';
import ignore from 'ignore';
import fs from 'fs';
import path from 'path';

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
        return { success: false, message: '❌ No Phases project found.' };
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
        return { success: false, message: '❌ No Phases project found.' };
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
 PHASES ► TODO LIST
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

    const workingDir = fileManager.getWorkingDir();
    const gitignorePath = path.join(workingDir, '.gitignore');
    const ig = ignore().add(fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '');

    function buildTree(dir: string, prefix = ''): string {
        try {
            const files = fs.readdirSync(dir);
            let output = '';

            const sorted = files.sort((a, b) => {
                const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
                const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });

            const filteredAndMapped = sorted.map(file => {
                const fullPath = path.join(dir, file);
                const relPath = path.relative(workingDir, fullPath).replace(/\\/g, '/');
                return { file, fullPath, relPath, ignored: file === '.git' || ig.ignores(relPath) };
            }).filter(item => !item.ignored);

            for (let i = 0; i < filteredAndMapped.length; i++) {
                const { file, fullPath } = filteredAndMapped[i];
                const isLast = i === filteredAndMapped.length - 1;
                const pointer = isLast ? '└── ' : '├── ';
                output += `${prefix}${pointer}${file}\n`;

                if (fs.statSync(fullPath).isDirectory()) {
                    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                    output += buildTree(fullPath, nextPrefix);
                }
            }
            return output;
        } catch {
            return '';
        }
    }

    const tree = buildTree(workingDir);

    const archContent = generateArchitecture({
        projectName: input.project_name,
        overview: input.overview,
        components: input.components,
        techStack: input.tech_stack,
        tree,
    });

    fileManager.writeGsdFile('ARCHITECTURE.md', archContent);

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PHASES ► CODEBASE MAPPED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Components found: ${input.components.length}
Tech stack: ${input.tech_stack.join(', ')}

                Components:
${input.components.map(c => `  📦 ${c.name} (${c.files.length} files)`).join('\n')}

Written to: .gsd / ARCHITECTURE.md

───────────────────────────────────────`,
    };
}

// ─── gsd_help ──────────────────────────────────────────────────

export function handleHelp(): { success: boolean; message: string } {
    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                PHASES ► HELP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔵 CORE WORKFLOW
                phases_init          → Initialize project(SPEC + ROADMAP)
                phases_plan          → Create execution plans for a phase
  phases_execute       → Record task completion + atomic commit
                phases_verify        → Validate must - haves with evidence
  phases_debug         → Systematic debugging(3 - strike rule)
                phases_map           → Analyze codebase → ARCHITECTURE.md

🟢 NAVIGATION & STATE
                phases_progress      → Show current position in roadmap
                phases_pause         → Save session state for handoff
  phases_resume        → Restore from last session

🟠 PHASE MANAGEMENT
  phases_add_phase     → Add a phase to the roadmap
  phases_remove_phase  → Remove a phase (safety checks)
  phases_discuss_phase → Clarify scope before planning
  phases_milestone     → Create a new milestone
  phases_rollback      → Revert a botched phase with git reset

🟣 UTILITIES
                phases_add_todo      → Quick capture an idea
                phases_check_todos   → List pending items
                phases_help          → This help message

───────────────────────────────────────
💡 Typical flow:
                phases_init → phases_plan → phases_execute → phases_verify
───────────────────────────────────────`,
    };
}
