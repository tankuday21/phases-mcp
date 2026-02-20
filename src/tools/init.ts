import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { GitManager } from '../managers/git-manager.js';
import {
    generateSpec,
    generateRoadmap,
    generateState,
    generateDecisions,
    generateJournal,
    generateTodo,
} from '../templates/index.js';

export interface InitInput {
    project_name: string;
    vision: string;
    goals: string[];
    non_goals?: string[];
    users: string;
    constraints?: string[];
    success_criteria: string[];
    milestone?: string;
    phases: Array<{ name: string; objective: string }>;
    working_directory?: string;
}

export function handleInit(
    fileManager: FileManager,
    stateManager: StateManager,
    gitManager: GitManager,
    input: InitInput
): { success: boolean; message: string; files_created: string[] } {
    // Set working directory if provided
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    // Check if already initialized
    if (fileManager.isGsdInitialized()) {
        return {
            success: false,
            message: '❌ Project already initialized. Use phases_progress to check current status.',
            files_created: [],
        };
    }

    // Detect existing code
    const codeStatus = fileManager.detectExistingCode();

    // Init git
    gitManager.initRepo();

    // Create .gsd directories
    fileManager.ensureDir('.gsd');
    fileManager.ensureDir('.gsd/phases');
    fileManager.ensureDir('.gsd/templates');

    // Write SPEC.md
    const specContent = generateSpec({
        projectName: input.project_name,
        vision: input.vision,
        goals: input.goals,
        nonGoals: input.non_goals || ['Not defined yet'],
        users: input.users,
        constraints: input.constraints || ['None specified'],
        successCriteria: input.success_criteria,
    });
    fileManager.writeGsdFile('SPEC.md', specContent);

    // Write ROADMAP.md
    const roadmapContent = generateRoadmap({
        milestone: input.milestone || 'v1.0',
        mustHaves: input.success_criteria,
        phases: input.phases,
    });
    fileManager.writeGsdFile('ROADMAP.md', roadmapContent);

    // Write supporting files
    fileManager.writeGsdFile('STATE.md', generateState());
    fileManager.writeGsdFile('DECISIONS.md', generateDecisions());
    fileManager.writeGsdFile('JOURNAL.md', generateJournal());
    fileManager.writeGsdFile('TODO.md', generateTodo());

    // Update state
    stateManager.updateState({
        phase: null,
        task: 'Project initialized',
        status: 'Ready for planning',
    });

    // Commit
    gitManager.commitInit();

    const filesCreated = [
        '.gsd/SPEC.md',
        '.gsd/ROADMAP.md',
        '.gsd/STATE.md',
        '.gsd/DECISIONS.md',
        '.gsd/JOURNAL.md',
        '.gsd/TODO.md',
    ];

    let msg = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PHASES ► PROJECT INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${input.project_name}
Phases: ${input.phases.length}
${codeStatus.hasCode ? `\n⚠️ Existing code detected: ${codeStatus.fileCount} files (${codeStatus.languages.join(', ')})\n   Consider running phases_map to analyze the codebase.\n` : ''}
Files created:
${filesCreated.map(f => `  • ${f}`).join('\n')}

───────────────────────────────────────
▶ NEXT: Use phases_plan with phase 1 to create execution plans
───────────────────────────────────────`;

    return {
        success: true,
        message: msg,
        files_created: filesCreated,
    };
}
