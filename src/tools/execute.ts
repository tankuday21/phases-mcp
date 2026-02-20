import { FileManager } from '../managers/file-manager.js';
import { StateManager } from '../managers/state-manager.js';
import { GitManager } from '../managers/git-manager.js';

export interface ExecuteInput {
    phase: number;
    task_name: string;
    task_result: string;
    files_changed?: string[];
    gaps_only?: boolean;
    working_directory?: string;
}

export function handleExecute(
    fileManager: FileManager,
    stateManager: StateManager,
    gitManager: GitManager,
    input: ExecuteInput
): { success: boolean; message: string } {
    if (input.working_directory) {
        fileManager.setWorkingDir(input.working_directory);
    }

    // Validate
    if (!fileManager.isGsdInitialized()) {
        return { success: false, message: '❌ No GSD project found. Run gsd_init first.' };
    }

    const phases = fileManager.parseRoadmapPhases();
    const targetPhase = phases.find(p => p.number === input.phase);
    if (!targetPhase) {
        return { success: false, message: `❌ Phase ${input.phase} not found in ROADMAP.md.` };
    }

    // Check for plans
    const plans = fileManager.getPlanFiles(input.phase);
    if (plans.length === 0) {
        return {
            success: false,
            message: `❌ No plans found for Phase ${input.phase}. Run gsd_plan first.`,
        };
    }

    // Record task execution
    const summaryContent = `# Task Summary: ${input.task_name}

> **Completed**: ${new Date().toISOString()}

## Result
${input.task_result}

## Files Changed
${input.files_changed?.map(f => `- ${f}`).join('\n') || 'Not specified'}
`;

    const summaryFile = `.gsd/phases/${input.phase}/${input.task_name.replace(/\s+/g, '-').toLowerCase()}-SUMMARY.md`;
    fileManager.writeFile(summaryFile, summaryContent);

    // Atomic commit per task
    gitManager.commitTask(input.phase, input.task_name);

    // Update state
    stateManager.updateState({
        phase: input.phase,
        task: input.task_name,
        status: `Task completed: ${input.task_name}`,
    });

    // Check if all plans have summaries (phase complete)
    const summaries = fileManager.getSummaryFiles(input.phase);
    const allComplete = plans.length <= summaries.length;

    if (allComplete) {
        // Update roadmap — mark phase complete
        const roadmap = fileManager.readGsdFile('ROADMAP.md');
        if (roadmap) {
            const updated = roadmap.replace(
                new RegExp(`(### Phase ${input.phase}:[\\s\\S]*?\\*\\*Status\\*\\*:)\\s*.+`),
                `$1 ✅ Complete`
            );
            fileManager.writeGsdFile('ROADMAP.md', updated);
        }

        gitManager.commitPhaseComplete(input.phase, targetPhase.name);

        stateManager.updateState({
            phase: input.phase,
            task: 'All tasks complete',
            status: `Phase ${input.phase} fully executed`,
        });

        return {
            success: true,
            message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE ${input.phase} COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All ${plans.length} plans executed.
Task "${input.task_name}" completed and committed.

───────────────────────────────────────
▶ NEXT: Use gsd_verify with phase ${input.phase}
───────────────────────────────────────`,
        };
    }

    return {
        success: true,
        message: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► TASK COMPLETED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase ${input.phase} — "${input.task_name}"
Progress: ${summaries.length}/${plans.length} plans complete

Committed: feat(phase-${input.phase}): ${input.task_name}

───────────────────────────────────────
▶ Continue executing remaining tasks
───────────────────────────────────────`,
    };
}
